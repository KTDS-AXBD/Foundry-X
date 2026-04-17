// F542 M3: ModelComparisonService TDD Red Phase
// Sprint 290 — A/B 모델 비교 결과 D1 CRUD

import { describe, it, expect, beforeEach } from "vitest";
import { ModelComparisonService } from "../../core/agent/services/model-comparisons.js";
import type { ModelComparison } from "@foundry-x/shared";

// in-memory D1 mock
function makeDb() {
  const rows: Record<string, unknown>[] = [];

  return {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              if (sql.includes("INSERT")) {
                const comparison: Record<string, unknown> = {};
                // id, session_id, report_id, model, prompt_version, proposals_json, proposal_count, created_at
                [
                  "id", "session_id", "report_id", "model",
                  "prompt_version", "proposals_json", "proposal_count", "created_at",
                ].forEach((col, i) => { comparison[col] = args[i]; });
                rows.push(comparison);
              }
            },
            async all<T>() {
              const reportId = args[0];
              const filtered = rows.filter((r) => r["report_id"] === reportId);
              return { results: filtered as T[] };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
}

function makeComparison(overrides: Partial<ModelComparison> = {}): Omit<ModelComparison, "id" | "createdAt"> {
  return {
    sessionId: "sess-test",
    reportId: "sess-test:2026-04-14T10:00:00.000Z",
    model: "claude-sonnet-4-6",
    promptVersion: "1.0",
    proposalsJson: JSON.stringify([{ type: "prompt", title: "Test" }]),
    proposalCount: 1,
    ...overrides,
  };
}

describe("F542 ModelComparisonService", () => {
  let db: D1Database;
  let svc: ModelComparisonService;

  beforeEach(() => {
    db = makeDb();
    svc = new ModelComparisonService(db);
  });

  it("비교 결과를 저장하고 ID를 반환한다", async () => {
    const saved = await svc.save(makeComparison());
    expect(saved.id).toBeTruthy();
    expect(saved.model).toBe("claude-sonnet-4-6");
    expect(saved.proposalCount).toBe(1);
  });

  it("동일 report_id로 저장된 비교 결과를 조회한다", async () => {
    const reportId = "sess-test:2026-04-14T10:00:00.000Z";
    await svc.save(makeComparison({ reportId, model: "claude-sonnet-4-6" }));
    await svc.save(makeComparison({ reportId, model: "claude-haiku-4-5" }));

    const results = await svc.findByReportId(reportId);
    expect(results.length).toBe(2);
    const models = results.map((r) => r.model);
    expect(models).toContain("claude-sonnet-4-6");
    expect(models).toContain("claude-haiku-4-5");
  });

  it("다른 report_id의 결과를 반환하지 않는다", async () => {
    await svc.save(makeComparison({ reportId: "other-report-id" }));
    const results = await svc.findByReportId("sess-test:2026-04-14T10:00:00.000Z");
    expect(results.length).toBe(0);
  });

  it("proposals_json이 유효한 JSON 문자열로 저장된다", async () => {
    const saved = await svc.save(makeComparison());
    expect(() => JSON.parse(saved.proposalsJson)).not.toThrow();
  });
});
