import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PrototypeUsageService } from "../services/prototype-usage-service.js";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS prototype_usage_logs (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    builder_type TEXT NOT NULL CHECK(builder_type IN ('cli','api','ensemble')),
    model TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0.0,
    duration_ms INTEGER DEFAULT 0,
    fallback_reason TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`;

function setupDb() {
  const db = createMockD1();
  // D1 mock exec (NOT child_process)
  void db.exec(SCHEMA);
  return db;
}

describe("PrototypeUsageService", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: PrototypeUsageService;
  const ORG = "org-test";

  beforeEach(() => {
    db = setupDb();
    svc = new PrototypeUsageService(db as unknown as D1Database);
  });

  it("사용 로그를 기록해요", async () => {
    await svc.log(ORG, {
      jobId: "job-1",
      builderType: "cli",
      model: "haiku",
      inputTokens: 50000,
      outputTokens: 20000,
      costUsd: 0.12,
      durationMs: 60000,
    });

    const summary = await svc.getMonthlySummary(ORG, new Date().getFullYear(), new Date().getMonth() + 1);
    expect(summary.totalJobs).toBe(1);
    expect(summary.totalCostUsd).toBeCloseTo(0.12, 2);
  });

  it("월별 요약에 모델별/타입별 집계가 포함돼요", async () => {
    await svc.log(ORG, {
      jobId: "job-1", builderType: "cli", model: "haiku",
      inputTokens: 50000, outputTokens: 20000, costUsd: 0.12, durationMs: 60000,
    });
    await svc.log(ORG, {
      jobId: "job-2", builderType: "api", model: "sonnet",
      inputTokens: 80000, outputTokens: 40000, costUsd: 0.84, durationMs: 120000,
      fallbackReason: "CLI timeout",
    });

    const summary = await svc.getMonthlySummary(ORG, new Date().getFullYear(), new Date().getMonth() + 1);
    expect(summary.totalJobs).toBe(2);
    expect(summary.byModel).toHaveLength(2);
    expect(summary.byBuilderType).toHaveLength(2);

    const haikuModel = summary.byModel.find((m) => m.model === "haiku");
    expect(haikuModel?.jobs).toBe(1);
    expect(haikuModel?.costUsd).toBeCloseTo(0.12, 2);
  });

  it("일별 차트 데이터를 반환해요", async () => {
    await svc.log(ORG, {
      jobId: "job-1", builderType: "cli", model: "haiku",
      inputTokens: 50000, outputTokens: 20000, costUsd: 0.12, durationMs: 60000,
    });

    const daily = await svc.getDailyBreakdown(ORG, 7);
    expect(daily.length).toBeGreaterThanOrEqual(1);
    expect(daily[0]!.jobs).toBe(1);
  });

  it("예산 한도 내면 withinBudget이 true에요", async () => {
    await svc.log(ORG, {
      jobId: "job-1", builderType: "cli", model: "haiku",
      inputTokens: 50000, outputTokens: 20000, costUsd: 10.0, durationMs: 60000,
    });

    const budget = await svc.getBudgetStatus(ORG, 100);
    expect(budget.withinBudget).toBe(true);
    expect(budget.currentUsd).toBeCloseTo(10.0, 1);
    expect(budget.remainingUsd).toBeCloseTo(90.0, 1);
    expect(budget.usagePercent).toBeCloseTo(10.0, 1);
  });

  it("예산 한도 초과 시 withinBudget이 false에요", async () => {
    await svc.log(ORG, {
      jobId: "job-1", builderType: "cli", model: "haiku",
      inputTokens: 50000, outputTokens: 20000, costUsd: 150.0, durationMs: 60000,
    });

    const budget = await svc.getBudgetStatus(ORG, 100);
    expect(budget.withinBudget).toBe(false);
    expect(budget.usagePercent).toBe(150);
  });
});
