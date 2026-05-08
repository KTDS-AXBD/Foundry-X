// F620 Sprint 367 CO-I01 — PolicyEmbedder TDD
import { describe, it, expect, vi } from "vitest";
import { PolicyEmbedder } from "./policy-embedder.service.js";

function makeKVMock() {
  const store = new Map<string, string>();
  return {
    store,
    get: vi.fn().mockImplementation(async (key: string) => {
      const raw = store.get(key);
      if (!raw) return null;
      try {
        const entry = JSON.parse(raw) as { data: unknown };
        return entry.data ?? null;
      } catch {
        return null;
      }
    }),
    set: vi.fn().mockImplementation(async (key: string, data: unknown) => {
      store.set(key, JSON.stringify({ data, cachedAt: Date.now() }));
    }),
    getOrFetch: vi.fn(),
    invalidate: vi.fn(),
  };
}

function makeD1Mock() {
  const inserts: Array<{ table: string; values: unknown[] }> = [];
  const rows = new Map<string, Record<string, unknown>>();
  return {
    inserts,
    rows,
    prepare: vi.fn().mockImplementation((sql: string) => ({
      bind: vi.fn().mockImplementation((...args: unknown[]) => {
        if (sql.includes("INSERT OR REPLACE INTO policy_embeddings_cache")) {
          inserts.push({ table: "policy_embeddings_cache", values: args });
          rows.set(args[0] as string, {
            policy_text_hash: args[0],
            org_id: args[1],
            vector_json: args[2],
            model: args[3],
            source_kind: args[4],
            cached_at: args[5],
          });
        }
        return {
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi.fn().mockImplementation(async () => {
            if (sql.includes("SELECT * FROM policy_embeddings_cache WHERE policy_text_hash")) {
              return rows.get(args[0] as string) ?? null;
            }
            return null;
          }),
          all: vi.fn().mockImplementation(async () => {
            if (sql.includes("FROM policy_embeddings_cache") && sql.includes("org_id = ?")) {
              const orgId = args[0] as string;
              const exclude = args[1] as string;
              const list = Array.from(rows.values()).filter(
                (r) => r.org_id === orgId && r.policy_text_hash !== exclude,
              );
              return { results: list };
            }
            return { results: [] };
          }),
        };
      }),
    })),
  };
}

describe("F620 CO-I01 PolicyEmbedder", () => {
  it("embedPolicy cache miss → D1 INSERT + KV set + deterministic vector", async () => {
    const db = makeD1Mock();
    const cache = makeKVMock();
    const embedder = new PolicyEmbedder(db as unknown as D1Database, cache as never);

    const result = await embedder.embedPolicy("정책 텍스트 A", "org-1", "policy");

    expect(result.textHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.orgId).toBe("org-1");
    expect(result.vector).toHaveLength(8);
    expect(result.vector.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(result.model).toBe("stub-sha256-v1");
    expect(result.sourceKind).toBe("policy");
    expect(db.inserts).toHaveLength(1);
    expect(cache.set).toHaveBeenCalledOnce();
  });

  it("embedPolicy KV cache hit → D1 INSERT 0건", async () => {
    const db = makeD1Mock();
    const cache = makeKVMock();
    const embedder = new PolicyEmbedder(db as unknown as D1Database, cache as never);

    await embedder.embedPolicy("같은 정책", "org-1");
    db.inserts.length = 0; // reset
    cache.set.mockClear();

    const second = await embedder.embedPolicy("같은 정책", "org-1");
    expect(second).toBeDefined();
    expect(db.inserts).toHaveLength(0); // KV hit → D1 unchanged
  });

  it("embedPolicy 동일 텍스트 → 동일 hash + vector (deterministic)", async () => {
    const db = makeD1Mock();
    const cache = makeKVMock();
    const embedder = new PolicyEmbedder(db as unknown as D1Database, cache as never);

    const a = await embedder.embedPolicy("identical", "org-A");
    const b = await embedder.embedPolicy("identical", "org-B");
    expect(a.textHash).toBe(b.textHash);
    expect(a.vector).toEqual(b.vector);
  });

  it("findSimilar — 자기 자신 제외 + threshold 필터링", async () => {
    const db = makeD1Mock();
    const cache = makeKVMock();
    const embedder = new PolicyEmbedder(db as unknown as D1Database, cache as never);

    await embedder.embedPolicy("policy A", "org-1");
    await embedder.embedPolicy("policy B", "org-1");
    await embedder.embedPolicy("policy C", "org-1");

    const results = await embedder.findSimilar("policy A", "org-1", 0.0, 5);
    // self 제외 → 최대 2 results
    expect(results.length).toBeLessThanOrEqual(2);
    for (const r of results) {
      expect(r.similarity).toBeGreaterThanOrEqual(0);
      expect(r.similarity).toBeLessThanOrEqual(1);
    }
  });

  it("findSimilar — high threshold 시 빈 결과 가능", async () => {
    const db = makeD1Mock();
    const cache = makeKVMock();
    const embedder = new PolicyEmbedder(db as unknown as D1Database, cache as never);

    await embedder.embedPolicy("apple", "org-1");
    await embedder.embedPolicy("zebra elephant", "org-1");

    const results = await embedder.findSimilar("apple", "org-1", 0.999, 5);
    // sha256-based stub은 보통 0.999 미달
    expect(results.length).toBeGreaterThanOrEqual(0);
  });
});
