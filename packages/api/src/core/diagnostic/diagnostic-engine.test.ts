// F602: DiagnosticEngine TDD Red Phase — 4대 진단 PoC
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DiagnosticEngine } from "./services/diagnostic-engine.service.js";

// D1 mock: run/findings 두 테이블 분기
function makeD1Mock(opts: {
  entityRows?: { id: string; entity_type?: string; external_id?: string; title?: string }[];
  duplicateRows?: { entity_type: string; external_id: string; cnt: number }[];
  inconsistencyRows?: { external_id: string; title_count: number }[];
  orphanRows?: { id: string }[];
} = {}) {
  const findings: unknown[] = [];
  return {
    findings,
    prepare: vi.fn().mockImplementation((sql: string) => ({
      bind: vi.fn().mockImplementation((..._args: unknown[]) => ({
        run: vi.fn().mockImplementation(() => {
          if (sql.includes("diagnostic_findings")) findings.push({ id: "f-" + findings.length });
          return Promise.resolve({ success: true });
        }),
        all: vi.fn().mockImplementation(() => {
          if (sql.includes("besir_type IS NULL") || sql.includes("title IS NULL")) {
            return Promise.resolve({ results: opts.entityRows ?? [] });
          }
          if (sql.includes("HAVING COUNT(*) > 1") && sql.includes("entity_type")) {
            return Promise.resolve({ results: opts.duplicateRows ?? [] });
          }
          if (sql.includes("NOT IN") && sql.includes("entity_links")) {
            return Promise.resolve({ results: opts.orphanRows ?? [] });
          }
          if (sql.includes("COUNT(DISTINCT title)")) {
            return Promise.resolve({ results: opts.inconsistencyRows ?? [] });
          }
          // getFindings
          if (sql.includes("FROM diagnostic_findings")) {
            return Promise.resolve({ results: findings });
          }
          return Promise.resolve({ results: [] });
        }),
        first: vi.fn().mockResolvedValue(null),
      })),
    })),
  };
}

function makeAuditBusMock() {
  return { emit: vi.fn().mockResolvedValue(undefined) };
}

describe("F602: DiagnosticEngine", () => {
  let auditBus: ReturnType<typeof makeAuditBusMock>;

  beforeEach(() => {
    auditBus = makeAuditBusMock();
  });

  it("T1: runMissing — besir_type IS NULL entity → finding 1건 INSERT", async () => {
    const db = makeD1Mock({ entityRows: [{ id: "entity-1" }] });
    const engine = new DiagnosticEngine(db as unknown as D1Database, auditBus);

    const count = await engine.runMissing("run-1", "org-1");

    expect(count).toBe(1);
    expect(db.findings.length).toBeGreaterThanOrEqual(1);
  });

  it("T2: runDuplicate — (entity_type, external_id) 중복 → finding 1건 INSERT", async () => {
    const db = makeD1Mock({
      duplicateRows: [{ entity_type: "fact", external_id: "ext-1", cnt: 2 }],
    });
    const engine = new DiagnosticEngine(db as unknown as D1Database, auditBus);

    const count = await engine.runDuplicate("run-2", "org-1");

    expect(count).toBe(1);
    expect(db.findings.length).toBeGreaterThanOrEqual(1);
  });

  it("T3: runOverspec — entity_links 미참조 orphan → finding 1건 INSERT", async () => {
    const db = makeD1Mock({ orphanRows: [{ id: "entity-orphan" }] });
    const engine = new DiagnosticEngine(db as unknown as D1Database, auditBus);

    const count = await engine.runOverspec("run-3", "org-1");

    expect(count).toBe(1);
    expect(db.findings.length).toBeGreaterThanOrEqual(1);
  });

  it("T4: runInconsistency — 동일 external_id, 다른 title → finding 1건 INSERT", async () => {
    const db = makeD1Mock({ inconsistencyRows: [{ external_id: "ext-1", title_count: 2 }] });
    const engine = new DiagnosticEngine(db as unknown as D1Database, auditBus);

    const count = await engine.runInconsistency("run-4", "org-1");

    expect(count).toBe(1);
    expect(db.findings.length).toBeGreaterThanOrEqual(1);
  });
});
