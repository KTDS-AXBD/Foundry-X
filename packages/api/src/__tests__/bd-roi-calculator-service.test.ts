import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { RoiBenchmarkService } from "../core/harness/services/roi-benchmark.js";
import { SignalValuationService } from "../core/discovery/services/signal-valuation.js";
import { BdRoiCalculatorService } from "../core/harness/services/bd-roi-calculator.js";

const TABLES = `
CREATE TABLE IF NOT EXISTS skill_executions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  biz_item_id TEXT,
  artifact_id TEXT,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  executed_by TEXT NOT NULL,
  executed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roi_benchmarks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  cold_threshold INTEGER NOT NULL DEFAULT 3,
  cold_executions INTEGER NOT NULL DEFAULT 0,
  warm_executions INTEGER NOT NULL DEFAULT 0,
  cold_avg_cost_usd REAL NOT NULL DEFAULT 0,
  warm_avg_cost_usd REAL NOT NULL DEFAULT 0,
  cold_avg_duration_ms REAL NOT NULL DEFAULT 0,
  warm_avg_duration_ms REAL NOT NULL DEFAULT 0,
  cold_avg_tokens REAL NOT NULL DEFAULT 0,
  warm_avg_tokens REAL NOT NULL DEFAULT 0,
  cold_success_rate REAL NOT NULL DEFAULT 0,
  warm_success_rate REAL NOT NULL DEFAULT 0,
  cost_savings_pct REAL,
  duration_savings_pct REAL,
  token_savings_pct REAL,
  pipeline_stage TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roi_signal_valuations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK(signal_type IN ('go', 'pivot', 'drop')),
  value_usd REAL NOT NULL DEFAULT 0 CHECK(value_usd >= 0),
  description TEXT,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, signal_type)
);

CREATE TABLE IF NOT EXISTS ax_viability_checkpoints (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('go', 'pivot', 'drop')),
  question TEXT NOT NULL,
  reason TEXT,
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(biz_item_id, stage)
);
`;

describe("BdRoiCalculatorService", () => {
  let db: ReturnType<typeof createMockD1>;
  let benchSvc: RoiBenchmarkService;
  let signalSvc: SignalValuationService;
  let calcSvc: BdRoiCalculatorService;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(TABLES);
    benchSvc = new RoiBenchmarkService(db as any);
    signalSvc = new SignalValuationService(db as any);
    calcSvc = new BdRoiCalculatorService(db as any, benchSvc, signalSvc);
  });

  function seedBenchmarks() {
    (db as any).exec(`
      INSERT INTO roi_benchmarks (id, tenant_id, skill_id, cold_threshold, cold_executions, warm_executions,
        cold_avg_cost_usd, warm_avg_cost_usd, cold_avg_duration_ms, warm_avg_duration_ms,
        cold_avg_tokens, warm_avg_tokens, cold_success_rate, warm_success_rate,
        cost_savings_pct, created_at)
      VALUES
        ('rb1', 'org_test', 'skill-a', 3, 3, 10, 0.10, 0.06, 1000, 600, 1000, 600, 1.0, 1.0, 40, '2026-03-15')
    `);
  }

  function seedExecutions(costTotal: number) {
    // Use a date 7 days ago so it always falls within the default 30-day window
    const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const sql = `
      INSERT INTO skill_executions (id, tenant_id, skill_id, model, status, input_tokens, output_tokens, cost_usd, duration_ms, executed_by, executed_at)
      VALUES ('e1', 'org_test', 'skill-a', 'claude-haiku', 'completed', 200, 200, ${costTotal}, 500, 'user1', '${recentDate}')
    `;
    (db as any).exec(sql);
  }

  it("should calculate BD_ROI with savings + signal", async () => {
    seedBenchmarks();
    seedExecutions(5.0); // total investment = $5

    // Add Go checkpoints
    (db as any).exec(`
      INSERT INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, decided_by)
      VALUES ('cp1', 'biz1', 'org_test', '2-1', 'go', 'Q1', 'user1')
    `);

    const result = await calcSvc.calculate("org_test", { days: 30 });

    // totalSavings = (0.10 - 0.06) × 10 = $0.40
    expect(result.totalSavings).toBeCloseTo(0.40);
    // signalValue = 1 × $50K = $50,000
    expect(result.signalValue).toBe(50000);
    // totalInvestment = $5
    expect(result.totalInvestment).toBeCloseTo(5.0);
    // bdRoi = (0.40 + 50000) / 5.0 × 100
    expect(result.bdRoi).toBeGreaterThan(0);
    expect(result.breakdown.signalBreakdown.go.count).toBe(1);
    expect(result.period.days).toBe(30);
  });

  it("should return BD_ROI = 0 when total investment is 0", async () => {
    seedBenchmarks();
    // No executions within period → investment = 0

    const result = await calcSvc.calculate("org_test", { days: 30 });
    expect(result.bdRoi).toBe(0);
    expect(result.totalInvestment).toBe(0);
  });

  it("should return signalValue = 0 when no checkpoints exist", async () => {
    seedBenchmarks();
    seedExecutions(5.0);

    const result = await calcSvc.calculate("org_test", { days: 30 });
    expect(result.signalValue).toBe(0);
    expect(result.breakdown.signalBreakdown.go.count).toBe(0);
  });

  it("should return savings = 0 when no benchmarks exist", async () => {
    seedExecutions(5.0);

    const result = await calcSvc.calculate("org_test", { days: 30 });
    expect(result.totalSavings).toBe(0);
    expect(result.breakdown.warmRunSavings.totalSaved).toBe(0);
  });

  it("should respect days filter", async () => {
    // Execution far in the past (>365 days)
    (db as any).exec(`
      INSERT INTO skill_executions (id, tenant_id, skill_id, model, status, input_tokens, output_tokens, cost_usd, duration_ms, executed_by, executed_at)
      VALUES ('old1', 'org_test', 'skill-a', 'claude-haiku', 'completed', 200, 200, 100.0, 500, 'user1', '2020-01-01')
    `);

    const result = await calcSvc.calculate("org_test", { days: 7 });
    // Old execution should not count in recent period
    expect(result.totalInvestment).toBe(0);
  });

  it("should rank topSkillsBySavings correctly", async () => {
    (db as any).exec(`
      INSERT INTO roi_benchmarks (id, tenant_id, skill_id, cold_threshold, cold_executions, warm_executions,
        cold_avg_cost_usd, warm_avg_cost_usd, cold_avg_duration_ms, warm_avg_duration_ms,
        cold_avg_tokens, warm_avg_tokens, cold_success_rate, warm_success_rate,
        cost_savings_pct, created_at)
      VALUES
        ('t1', 'org_test', 'skill-best', 3, 3, 10, 0.10, 0.04, 1000, 400, 1000, 400, 1.0, 1.0, 60, '2026-03-15'),
        ('t2', 'org_test', 'skill-mid', 3, 3, 10, 0.10, 0.07, 1000, 700, 1000, 700, 1.0, 1.0, 30, '2026-03-15'),
        ('t3', 'org_test', 'skill-low', 3, 3, 10, 0.10, 0.09, 1000, 900, 1000, 900, 1.0, 1.0, 10, '2026-03-15')
    `);

    seedExecutions(5.0);
    const result = await calcSvc.calculate("org_test", { days: 30 });
    expect(result.topSkillsBySavings.length).toBe(3);
    expect(result.topSkillsBySavings[0]!.skillId).toBe("skill-best");
    expect(result.topSkillsBySavings[0]!.savingsPct).toBe(60);
  });

  it("should handle negative savings in BD_ROI", async () => {
    // Warm is MORE expensive than cold (negative savings)
    (db as any).exec(`
      INSERT INTO roi_benchmarks (id, tenant_id, skill_id, cold_threshold, cold_executions, warm_executions,
        cold_avg_cost_usd, warm_avg_cost_usd, cold_avg_duration_ms, warm_avg_duration_ms,
        cold_avg_tokens, warm_avg_tokens, cold_success_rate, warm_success_rate,
        cost_savings_pct, created_at)
      VALUES ('neg1', 'org_test', 'skill-neg', 3, 3, 5, 0.05, 0.10, 500, 1000, 500, 1000, 1.0, 1.0, -100, '2026-03-15')
    `);

    seedExecutions(5.0);
    const result = await calcSvc.calculate("org_test", { days: 30 });

    // totalSavings = (0.05 - 0.10) × 5 = -0.25 (negative)
    expect(result.totalSavings).toBeLessThan(0);
    // topSkillsBySavings should not include negative savings skills
    expect(result.topSkillsBySavings.length).toBe(0);
  });
});
