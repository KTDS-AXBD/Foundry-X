// F628: BeSir 7-타입 Entity 모델 — TDD Red Phase
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { EntityRegistry } from "./entity-registry.js";

// ── D1 mock (service_entities + besir_type) ─────────────────────────────

class D1PreparedStatement {
  private bindings: unknown[] = [];
  constructor(private db: Database.Database, private query: string) {}

  bind(...values: unknown[]) {
    this.bindings = values;
    return this;
  }

  async first<T = Record<string, unknown>>(col?: string): Promise<T | null> {
    const row = this.db.prepare(this.query).get(...this.bindings) as Record<string, unknown> | undefined;
    if (!row) return null;
    if (col) return (row[col] as T) ?? null;
    return row as T;
  }

  async run() {
    const info = this.db.prepare(this.query).run(...this.bindings);
    return {
      results: [] as unknown[],
      success: true,
      meta: { duration: 0, last_row_id: info.lastInsertRowid, changes: info.changes, served_by: "mock", internal_stats: null },
    };
  }

  async all<T = Record<string, unknown>>() {
    const rows = this.db.prepare(this.query).all(...this.bindings);
    return { results: rows as T[], success: true, meta: { duration: 0, served_by: "mock", internal_stats: null } };
  }
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS service_entities (
  id          TEXT PRIMARY KEY,
  service_id  TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'unknown',
  external_id TEXT NOT NULL,
  title       TEXT NOT NULL,
  status      TEXT,
  metadata    TEXT,
  org_id      TEXT NOT NULL,
  synced_at   TEXT NOT NULL DEFAULT (datetime('now')),
  besir_type  TEXT
);

CREATE TRIGGER IF NOT EXISTS service_entities_besir_type_check_insert
BEFORE INSERT ON service_entities
WHEN NEW.besir_type IS NOT NULL
  AND NEW.besir_type NOT IN ('fact','dimension','workflow','event','actor','policy','support')
BEGIN
  SELECT RAISE(ABORT, 'besir_type must be one of: fact, dimension, workflow, event, actor, policy, support');
END;

CREATE TRIGGER IF NOT EXISTS service_entities_besir_type_check_update
BEFORE UPDATE ON service_entities
WHEN NEW.besir_type IS NOT NULL
  AND NEW.besir_type NOT IN ('fact','dimension','workflow','event','actor','policy','support')
BEGIN
  SELECT RAISE(ABORT, 'besir_type must be one of: fact, dimension, workflow, event, actor, policy, support');
END;

CREATE TABLE IF NOT EXISTS entity_links (
  id         TEXT PRIMARY KEY,
  source_id  TEXT NOT NULL,
  target_id  TEXT NOT NULL,
  link_type  TEXT NOT NULL,
  metadata   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

class MockEntityD1 {
  readonly db: Database.Database;

  constructor() {
    this.db = new Database(":memory:");
    this.db.exec(SCHEMA_SQL);
  }

  prepare(query: string) {
    return new D1PreparedStatement(this.db, query);
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("F628: EntityRegistry — BeSir 7-타입", () => {
  let registry: EntityRegistry;
  let mockDb: MockEntityD1;

  beforeEach(() => {
    mockDb = new MockEntityD1();
    registry = new EntityRegistry(mockDb as unknown as D1Database);
  });

  // T1: legacy register (besirType 없음)
  it("T1: register() without besirType → besirType null", async () => {
    const entity = await registry.register({
      serviceId: "foundry-x",
      entityType: "skill",
      externalId: "skill-001",
      title: "Coding Skill",
      orgId: "org-1",
    });
    expect(entity.besirType).toBeNull();
  });

  // T2: besirType='workflow' 등록
  it("T2: register() with besirType='workflow' → besirType preserved", async () => {
    const entity = await registry.register({
      serviceId: "foundry-x",
      entityType: "process",
      externalId: "proc-001",
      title: "Onboarding Process",
      orgId: "org-1",
      besirType: "workflow",
    });
    expect(entity.besirType).toBe("workflow");
  });

  // T3: besirType 필터 검색
  it("T3: search() with besirType filter → only matching entities", async () => {
    await registry.register({ serviceId: "foundry-x", entityType: "t", externalId: "a", title: "A", orgId: "o", besirType: "workflow" });
    await registry.register({ serviceId: "foundry-x", entityType: "t", externalId: "b", title: "B", orgId: "o", besirType: "fact" });
    await registry.register({ serviceId: "foundry-x", entityType: "t", externalId: "c", title: "C", orgId: "o" });

    const result = await registry.search({ orgId: "o", besirType: "workflow" });
    expect(result.total).toBe(1);
    expect(result.items[0]?.besirType).toBe("workflow");
  });

  // T4: 잘못된 besir_type → trigger ABORT
  it("T4: invalid besir_type INSERT → trigger raises ABORT", () => {
    expect(() => {
      mockDb.db.prepare(
        `INSERT INTO service_entities (id, service_id, entity_type, external_id, title, org_id, synced_at, besir_type)
         VALUES ('x','foundry-x','t','ext','Title','org',datetime('now'),'invalid_type')`,
      ).run();
    }).toThrow(/besir_type/);
  });
});
