import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { RoiBenchmarkService } from "../core/harness/services/roi-benchmark.js";

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
`;

function insertExecution(
  db: any,
  opts: {
    id: string;
    tenantId?: string;
    skillId: string;
    costUsd: number;
    durationMs: number;
    inputTokens: number;
    outputTokens: number;
    status?: string;
    executedAt?: string;
  },
) {
  const {
    id, tenantId = "org_test", skillId, costUsd, durationMs,
    inputTokens, outputTokens, status = "completed",
    executedAt = new Date().toISOString(),
  } = opts;
  db.prepare(
    `INSERT INTO skill_executions
     (id, tenant_id, skill_id, model, status, input_tokens, output_tokens, cost_usd, duration_ms, executed_by, executed_at)
     VALUES (?, ?, ?, 'claude-haiku', ?, ?, ?, ?, ?, 'user1', ?)`,
  ).bind(id, tenantId, skillId, status, inputTokens, outputTokens, costUsd, durationMs, executedAt).run();
}

describe("RoiBenchmarkService", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: RoiBenchmarkService;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(TABLES);
    svc = new RoiBenchmarkService(db as any);
  });

  describe("run", () => {
    it("should calculate Cold/Warm savings correctly", async () => {
      // Cold: 3 executions with high cost, Warm: 5 with low cost
      for (let i = 1; i <= 3; i++) {
        insertExecution(db, {
          id: `cold-${i}`, skillId: "skill-a", costUsd: 0.10,
          durationMs: 1000, inputTokens: 500, outputTokens: 500,
          executedAt: `2026-01-0${i}T00:00:00Z`,
        });
      }
      for (let i = 4; i <= 8; i++) {
        insertExecution(db, {
          id: `warm-${i}`, skillId: "skill-a", costUsd: 0.06,
          durationMs: 600, inputTokens: 300, outputTokens: 300,
          executedAt: `2026-01-0${i}T00:00:00Z`,
        });
      }

      const result = await svc.run("org_test", {
        coldThreshold: 3, minExecutions: 4,
      });

      expect(result.count).toBe(1);
      expect(result.skipped).toBe(0);

      const b = result.benchmarks[0]!;
      expect(b.skillId).toBe("skill-a");
      expect(b.coldExecutions).toBe(3);
      expect(b.warmExecutions).toBe(5);
      expect(b.coldAvgCostUsd).toBeCloseTo(0.10);
      expect(b.warmAvgCostUsd).toBeCloseTo(0.06);
      expect(b.costSavingsPct).toBeCloseTo(40);
    });

    it("should respect custom cold_threshold", async () => {
      for (let i = 1; i <= 7; i++) {
        insertExecution(db, {
          id: `exec-${i}`, skillId: "skill-b",
          costUsd: i <= 5 ? 0.20 : 0.10,
          durationMs: 500, inputTokens: 200, outputTokens: 200,
          executedAt: `2026-01-${String(i).padStart(2, "0")}T00:00:00Z`,
        });
      }

      const result = await svc.run("org_test", {
        coldThreshold: 5, minExecutions: 6,
      });

      expect(result.count).toBe(1);
      expect(result.benchmarks[0]!.coldExecutions).toBe(5);
      expect(result.benchmarks[0]!.warmExecutions).toBe(2);
    });

    it("should skip skills with insufficient executions", async () => {
      insertExecution(db, {
        id: "only-1", skillId: "skill-c", costUsd: 0.10,
        durationMs: 500, inputTokens: 200, outputTokens: 200,
      });

      const result = await svc.run("org_test", {
        coldThreshold: 3, minExecutions: 4,
      });

      expect(result.count).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it("should handle negative savings (warm more expensive)", async () => {
      // Cold: cheap, Warm: expensive
      for (let i = 1; i <= 3; i++) {
        insertExecution(db, {
          id: `c-${i}`, skillId: "skill-neg", costUsd: 0.05,
          durationMs: 300, inputTokens: 100, outputTokens: 100,
          executedAt: `2026-01-0${i}T00:00:00Z`,
        });
      }
      for (let i = 4; i <= 6; i++) {
        insertExecution(db, {
          id: `w-${i}`, skillId: "skill-neg", costUsd: 0.08,
          durationMs: 500, inputTokens: 200, outputTokens: 200,
          executedAt: `2026-01-0${i}T00:00:00Z`,
        });
      }

      const result = await svc.run("org_test", {
        coldThreshold: 3, minExecutions: 4,
      });

      expect(result.benchmarks[0]!.costSavingsPct).toBeLessThan(0);
    });

    it("should filter by pipeline_stage", async () => {
      for (let i = 1; i <= 5; i++) {
        insertExecution(db, {
          id: `ps-${i}`, skillId: "skill-d", costUsd: i <= 3 ? 0.10 : 0.05,
          durationMs: 500, inputTokens: 200, outputTokens: 200,
          executedAt: `2026-01-0${i}T00:00:00Z`,
        });
      }

      const result = await svc.run("org_test", {
        coldThreshold: 3, minExecutions: 4, pipelineStage: "discovery",
      });

      expect(result.count).toBe(1);
      expect(result.benchmarks[0]!.pipelineStage).toBe("discovery");
    });

    it("should filter by specific skillId", async () => {
      for (let i = 1; i <= 5; i++) {
        insertExecution(db, {
          id: `s1-${i}`, skillId: "skill-1", costUsd: 0.10,
          durationMs: 500, inputTokens: 200, outputTokens: 200,
          executedAt: `2026-01-0${i}T00:00:00Z`,
        });
        insertExecution(db, {
          id: `s2-${i}`, skillId: "skill-2", costUsd: 0.10,
          durationMs: 500, inputTokens: 200, outputTokens: 200,
          executedAt: `2026-01-0${i}T00:00:00Z`,
        });
      }

      const result = await svc.run("org_test", {
        coldThreshold: 3, minExecutions: 4, skillId: "skill-1",
      });

      expect(result.count).toBe(1);
      expect(result.benchmarks[0]!.skillId).toBe("skill-1");
    });
  });

  describe("getLatest", () => {
    it("should return latest snapshot per skill", async () => {
      // Insert benchmarks directly
      (db as any).exec(`
        INSERT INTO roi_benchmarks (id, tenant_id, skill_id, cold_threshold, cold_executions, warm_executions,
          cold_avg_cost_usd, warm_avg_cost_usd, cold_avg_duration_ms, warm_avg_duration_ms,
          cold_avg_tokens, warm_avg_tokens, cold_success_rate, warm_success_rate,
          cost_savings_pct, duration_savings_pct, token_savings_pct, created_at)
        VALUES
          ('rb1', 'org_test', 'skill-a', 3, 3, 5, 0.10, 0.06, 1000, 600, 1000, 600, 1.0, 1.0, 40, 40, 40, '2026-01-01T00:00:00Z'),
          ('rb2', 'org_test', 'skill-a', 3, 3, 8, 0.10, 0.05, 1000, 500, 1000, 500, 1.0, 1.0, 50, 50, 50, '2026-01-15T00:00:00Z'),
          ('rb3', 'org_test', 'skill-b', 3, 3, 4, 0.20, 0.15, 2000, 1500, 2000, 1500, 0.9, 0.95, 25, 25, 25, '2026-01-10T00:00:00Z')
      `);

      const result = await svc.getLatest("org_test", { limit: 50, offset: 0 });

      expect(result.total).toBe(2);
      // Latest for skill-a is rb2 (higher savings)
      const skillA = result.benchmarks.find((b) => b.skillId === "skill-a");
      expect(skillA?.id).toBe("rb2");
      expect(skillA?.costSavingsPct).toBe(50);
    });

    it("should support pagination", async () => {
      (db as any).exec(`
        INSERT INTO roi_benchmarks (id, tenant_id, skill_id, cold_threshold, cold_executions, warm_executions,
          cold_avg_cost_usd, warm_avg_cost_usd, cold_avg_duration_ms, warm_avg_duration_ms,
          cold_avg_tokens, warm_avg_tokens, cold_success_rate, warm_success_rate,
          cost_savings_pct, created_at)
        VALUES
          ('p1', 'org_test', 'skill-1', 3, 3, 5, 0.10, 0.06, 1000, 600, 1000, 600, 1.0, 1.0, 40, '2026-01-01'),
          ('p2', 'org_test', 'skill-2', 3, 3, 5, 0.10, 0.07, 1000, 700, 1000, 700, 1.0, 1.0, 30, '2026-01-01'),
          ('p3', 'org_test', 'skill-3', 3, 3, 5, 0.10, 0.08, 1000, 800, 1000, 800, 1.0, 1.0, 20, '2026-01-01')
      `);

      const page1 = await svc.getLatest("org_test", { limit: 2, offset: 0 });
      expect(page1.benchmarks.length).toBe(2);
      expect(page1.total).toBe(3);

      const page2 = await svc.getLatest("org_test", { limit: 2, offset: 2 });
      expect(page2.benchmarks.length).toBe(1);
    });

    it("should filter by minSavings", async () => {
      (db as any).exec(`
        INSERT INTO roi_benchmarks (id, tenant_id, skill_id, cold_threshold, cold_executions, warm_executions,
          cold_avg_cost_usd, warm_avg_cost_usd, cold_avg_duration_ms, warm_avg_duration_ms,
          cold_avg_tokens, warm_avg_tokens, cold_success_rate, warm_success_rate,
          cost_savings_pct, created_at)
        VALUES
          ('ms1', 'org_test', 'skill-high', 3, 3, 5, 0.10, 0.05, 1000, 500, 1000, 500, 1.0, 1.0, 50, '2026-01-01'),
          ('ms2', 'org_test', 'skill-low', 3, 3, 5, 0.10, 0.09, 1000, 900, 1000, 900, 1.0, 1.0, 10, '2026-01-01')
      `);

      const result = await svc.getLatest("org_test", { limit: 50, offset: 0, minSavings: 30 });
      expect(result.benchmarks.length).toBe(1);
      expect(result.benchmarks[0]!.skillId).toBe("skill-high");
    });
  });

  describe("getHistory", () => {
    it("should return time series for a skill", async () => {
      (db as any).exec(`
        INSERT INTO roi_benchmarks (id, tenant_id, skill_id, cold_threshold, cold_executions, warm_executions,
          cold_avg_cost_usd, warm_avg_cost_usd, cold_avg_duration_ms, warm_avg_duration_ms,
          cold_avg_tokens, warm_avg_tokens, cold_success_rate, warm_success_rate,
          cost_savings_pct, created_at)
        VALUES
          ('h1', 'org_test', 'skill-x', 3, 3, 3, 0.10, 0.08, 1000, 800, 1000, 800, 1.0, 1.0, 20, '2026-01-01'),
          ('h2', 'org_test', 'skill-x', 3, 3, 6, 0.10, 0.06, 1000, 600, 1000, 600, 1.0, 1.0, 40, '2026-01-15'),
          ('h3', 'org_test', 'skill-x', 3, 3, 10, 0.10, 0.05, 1000, 500, 1000, 500, 1.0, 1.0, 50, '2026-02-01')
      `);

      const result = await svc.getHistory("org_test", { skillId: "skill-x", limit: 20 });
      expect(result.benchmarks.length).toBe(3);
      // Descending order by created_at
      expect(result.benchmarks[0]!.id).toBe("h3");
    });
  });

  describe("getSkillDetail", () => {
    it("should return Cold/Warm execution lists", async () => {
      // Insert executions
      for (let i = 1; i <= 5; i++) {
        insertExecution(db, {
          id: `det-${i}`, skillId: "skill-det", costUsd: i <= 3 ? 0.10 : 0.05,
          durationMs: 500, inputTokens: 200, outputTokens: 200,
          executedAt: `2026-01-0${i}T00:00:00Z`,
        });
      }
      // Insert benchmark
      (db as any).exec(`
        INSERT INTO roi_benchmarks (id, tenant_id, skill_id, cold_threshold, cold_executions, warm_executions,
          cold_avg_cost_usd, warm_avg_cost_usd, cold_avg_duration_ms, warm_avg_duration_ms,
          cold_avg_tokens, warm_avg_tokens, cold_success_rate, warm_success_rate,
          cost_savings_pct, created_at)
        VALUES ('det1', 'org_test', 'skill-det', 3, 3, 2, 0.10, 0.05, 500, 500, 400, 400, 1.0, 1.0, 50, '2026-02-01')
      `);

      const detail = await svc.getSkillDetail("org_test", "skill-det");
      expect(detail).not.toBeNull();
      expect(detail!.coldExecutionsList.length).toBe(3);
      expect(detail!.warmExecutionsList.length).toBe(2);
    });

    it("should return null for non-existent skill", async () => {
      const detail = await svc.getSkillDetail("org_test", "nope");
      expect(detail).toBeNull();
    });
  });

  describe("getByStage", () => {
    it("should aggregate by pipeline stage", async () => {
      (db as any).exec(`
        INSERT INTO roi_benchmarks (id, tenant_id, skill_id, cold_threshold, cold_executions, warm_executions,
          cold_avg_cost_usd, warm_avg_cost_usd, cold_avg_duration_ms, warm_avg_duration_ms,
          cold_avg_tokens, warm_avg_tokens, cold_success_rate, warm_success_rate,
          cost_savings_pct, duration_savings_pct, pipeline_stage, created_at)
        VALUES
          ('bs1', 'org_test', 'skill-1', 3, 3, 5, 0.10, 0.06, 1000, 600, 1000, 600, 1.0, 1.0, 40, 40, 'discovery', '2026-01-01'),
          ('bs2', 'org_test', 'skill-2', 3, 3, 4, 0.20, 0.10, 2000, 1000, 2000, 1000, 1.0, 1.0, 50, 50, 'discovery', '2026-01-01'),
          ('bs3', 'org_test', 'skill-3', 3, 3, 3, 0.15, 0.12, 1500, 1200, 1500, 1200, 1.0, 1.0, 20, 20, 'shaping', '2026-01-01')
      `);

      const stages = await svc.getByStage("org_test", { metric: "cost" });
      expect(stages.length).toBe(2);

      const discovery = stages.find((s) => s.pipelineStage === "discovery");
      expect(discovery).toBeDefined();
      expect(discovery!.skillCount).toBe(2);
      expect(discovery!.avgCostSavingsPct).toBeCloseTo(45);
    });
  });
});
