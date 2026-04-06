// F360: O-G-D Domain Registry 테스트 (Sprint 163)

import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { OgdDomainRegistry } from "../services/ogd-domain-registry.js";
import type { DomainAdapterInterface } from "@foundry-x/shared";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS ogd_domains (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, domain TEXT NOT NULL,
    display_name TEXT NOT NULL, description TEXT,
    adapter_type TEXT NOT NULL DEFAULT 'builtin',
    default_rubric TEXT, default_max_rounds INTEGER NOT NULL DEFAULT 3,
    default_min_score REAL NOT NULL DEFAULT 0.85,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, domain)
  );
`;

function createAdapter(domain: string): DomainAdapterInterface {
  return {
    domain,
    displayName: `Adapter ${domain}`,
    description: `Description for ${domain}`,
    generate: async () => ({ output: "gen" }),
    discriminate: async () => ({ score: 0.9, feedback: "ok", pass: true }),
    getDefaultRubric: () => `Rubric for ${domain}`,
  };
}

describe("OgdDomainRegistry", () => {
  let registry: OgdDomainRegistry;

  beforeEach(() => {
    registry = new OgdDomainRegistry();
  });

  it("TC-07: register + get", () => {
    const adapter = createAdapter("test");
    registry.register(adapter);

    const found = registry.get("test");
    expect(found).toBe(adapter);
    expect(found?.domain).toBe("test");
  });

  it("TC-08: list 4개 어댑터", () => {
    registry.register(createAdapter("a"));
    registry.register(createAdapter("b"));
    registry.register(createAdapter("c"));
    registry.register(createAdapter("d"));

    expect(registry.list()).toHaveLength(4);
    expect(registry.size).toBe(4);
  });

  it("TC-09: 중복 도메인 register — 덮어쓰기", () => {
    registry.register(createAdapter("test"));
    const newAdapter = createAdapter("test");
    registry.register(newAdapter);

    expect(registry.size).toBe(1);
    expect(registry.get("test")).toBe(newAdapter);
  });

  it("TC-10: has() 존재/미존재", () => {
    registry.register(createAdapter("exists"));

    expect(registry.has("exists")).toBe(true);
    expect(registry.has("nope")).toBe(false);
  });

  it("get: 미등록 도메인 → undefined", () => {
    expect(registry.get("unknown")).toBeUndefined();
  });

  describe("D1 동기화", () => {
    let db: ReturnType<typeof createMockD1>;

    beforeEach(() => {
      db = createMockD1();
      void db.exec(SCHEMA);
    });

    it("syncToDb: 어댑터 메타데이터 upsert", async () => {
      registry.register(createAdapter("alpha"));
      registry.register(createAdapter("beta"));

      await registry.syncToDb(db as unknown as D1Database, "org_1");

      const rows = await db
        .prepare("SELECT * FROM ogd_domains WHERE tenant_id = ?")
        .bind("org_1")
        .all();
      expect(rows.results).toHaveLength(2);
    });

    it("syncToDb: 중복 실행 — ON CONFLICT UPDATE", async () => {
      registry.register(createAdapter("alpha"));
      await registry.syncToDb(db as unknown as D1Database, "org_1");
      await registry.syncToDb(db as unknown as D1Database, "org_1");

      const rows = await db
        .prepare("SELECT * FROM ogd_domains WHERE tenant_id = ?")
        .bind("org_1")
        .all();
      expect(rows.results).toHaveLength(1);
    });

    it("listFromDb: D1에서 조회", async () => {
      registry.register(createAdapter("alpha"));
      registry.register(createAdapter("beta"));
      await registry.syncToDb(db as unknown as D1Database, "org_1");

      const list = await OgdDomainRegistry.listFromDb(
        db as unknown as D1Database,
        "org_1",
      );
      expect(list).toHaveLength(2);
      expect(list[0]!.domain).toBe("alpha");
      expect(list[0]!.displayName).toBe("Adapter alpha");
      expect(list[0]!.enabled).toBe(true);
    });
  });
});
