/**
 * F539c Group A: biz-items 3 라우트 TDD Red Phase
 * FX-REQ-578 — GET /api/biz-items, POST /api/biz-items, GET /api/biz-items/:id
 */
import { describe, it, expect, vi } from "vitest";
import { sign } from "hono/jwt";
import app from "../app.js";
import type { DiscoveryEnv } from "../env.js";

const TEST_SECRET = "test-secret-f539c";

const makeD1Mock = (rows: Record<string, unknown>[] = [], singleRow?: Record<string, unknown> | null) =>
  ({
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: rows }),
        first: vi.fn().mockResolvedValue(singleRow ?? rows[0] ?? null),
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
      all: vi.fn().mockResolvedValue({ results: rows }),
      first: vi.fn().mockResolvedValue(singleRow ?? rows[0] ?? null),
      run: vi.fn().mockResolvedValue({ success: true }),
    }),
  }) as unknown as D1Database;

const makeEnv = (db?: D1Database): DiscoveryEnv => ({
  DB: db ?? makeD1Mock(),
  JWT_SECRET: TEST_SECRET,
  ANTHROPIC_API_KEY: "test-api-key",
});

async function makeAuthHeader(payload: Record<string, unknown> = {}) {
  const token = await sign(
    { sub: "user-1", orgId: "org-1", orgRole: "admin", exp: Math.floor(Date.now() / 1000) + 3600, ...payload },
    TEST_SECRET,
    "HS256",
  );
  return { Authorization: `Bearer ${token}` };
}

// org_members mock: tenantGuard가 통과하도록
const makeOrgMemberDb = (bizItemRows: Record<string, unknown>[] = []) =>
  ({
    prepare: vi.fn((sql: string) => {
      const isOrgMemberQuery = sql.includes("org_members");
      const isBizItemsQuery = sql.includes("biz_items");
      const isClassificationQuery = sql.includes("biz_item_classifications");
      const isPipelineStagesQuery = sql.includes("pipeline_stages");

      return {
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: bizItemRows }),
          first: vi.fn().mockImplementation(async () => {
            if (isOrgMemberQuery) return { role: "admin" };
            if (isBizItemsQuery) return bizItemRows[0] ?? null;
            if (isClassificationQuery) return null;
            return null;
          }),
          run: vi.fn().mockResolvedValue({ success: true, meta: { last_row_id: 1 } }),
        }),
        all: vi.fn().mockResolvedValue({ results: bizItemRows }),
        first: vi.fn().mockImplementation(async () => {
          if (isOrgMemberQuery) return { role: "admin" };
          return bizItemRows[0] ?? null;
        }),
        run: vi.fn().mockResolvedValue({ success: true }),
      };
    }),
  }) as unknown as D1Database;

describe("F539c Group A: biz-items 3 라우트", () => {
  // Red: 이 테스트들은 구현 전 FAIL (404) → 구현 후 PASS

  it("GET /api/biz-items → 200 with items array", async () => {
    const bizItemRow = {
      id: "item-001",
      org_id: "org-1",
      title: "Test Item",
      description: null,
      source: "field",
      status: "draft",
      created_by: "user-1",
      created_at: "2026-04-15T00:00:00Z",
      updated_at: "2026-04-15T00:00:00Z",
    };
    const db = makeOrgMemberDb([bizItemRow]);
    const headers = await makeAuthHeader();

    const res = await app.request("/api/biz-items", { headers }, makeEnv(db));
    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("POST /api/biz-items → 201 with created item", async () => {
    const db = makeOrgMemberDb([]);
    const headers = await makeAuthHeader();

    const res = await app.request("/api/biz-items", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "새 사업 아이템" }),
    }, makeEnv(db));
    expect(res.status).toBe(201);
    const body = await res.json() as { id: string; title: string };
    expect(body.title).toBe("새 사업 아이템");
    expect(typeof body.id).toBe("string");
  });

  it("GET /api/biz-items/:id → 200 with biz item", async () => {
    const bizItemRow = {
      id: "item-001",
      org_id: "org-1",
      title: "Test Item",
      description: null,
      source: "field",
      status: "draft",
      created_by: "user-1",
      created_at: "2026-04-15T00:00:00Z",
      updated_at: "2026-04-15T00:00:00Z",
    };
    const db = makeOrgMemberDb([bizItemRow]);
    const headers = await makeAuthHeader();

    const res = await app.request("/api/biz-items/item-001", { headers }, makeEnv(db));
    expect(res.status).toBe(200);
    const body = await res.json() as { id: string; title: string };
    expect(body.id).toBe("item-001");
    expect(body.title).toBe("Test Item");
  });

  it("GET /api/biz-items/:id → 404 for missing item", async () => {
    const db = makeOrgMemberDb([]);
    const headers = await makeAuthHeader();

    const res = await app.request("/api/biz-items/nonexistent-id", { headers }, makeEnv(db));
    expect(res.status).toBe(404);
  });

  it("POST /api/biz-items → 400 without title", async () => {
    const db = makeOrgMemberDb([]);
    const headers = await makeAuthHeader();

    const res = await app.request("/api/biz-items", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ description: "no title" }),
    }, makeEnv(db));
    expect(res.status).toBe(400);
  });
});
