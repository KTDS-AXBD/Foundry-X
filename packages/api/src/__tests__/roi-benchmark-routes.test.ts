import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

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

function seedExecutionsForBenchmark(db: any) {
  for (let i = 1; i <= 8; i++) {
    (db as any).exec(`
      INSERT INTO skill_executions (id, tenant_id, skill_id, model, status, input_tokens, output_tokens, cost_usd, duration_ms, executed_by, executed_at)
      VALUES ('se${i}', 'org_test', 'cost-model', 'claude-haiku', 'completed', 200, 200, ${i <= 3 ? 0.10 : 0.06}, ${i <= 3 ? 1000 : 600}, 'test-user', '2026-03-${String(i).padStart(2, "0")}T00:00:00Z')
    `);
  }
}

function seedBenchmarkResults(db: any) {
  (db as any).exec(`
    INSERT INTO roi_benchmarks (id, tenant_id, skill_id, cold_threshold, cold_executions, warm_executions,
      cold_avg_cost_usd, warm_avg_cost_usd, cold_avg_duration_ms, warm_avg_duration_ms,
      cold_avg_tokens, warm_avg_tokens, cold_success_rate, warm_success_rate,
      cost_savings_pct, duration_savings_pct, token_savings_pct, pipeline_stage, created_at)
    VALUES ('rb1', 'org_test', 'cost-model', 3, 3, 5, 0.10, 0.06, 1000, 600, 400, 240, 1.0, 1.0, 40, 40, 40, 'discovery', '2026-03-15')
  `);
}

describe("ROI Benchmark Routes (F278)", () => {
  let env: ReturnType<typeof createTestEnv>;
  let headers: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    (env.DB as any).exec(TABLES);
    headers = await createAuthHeaders();
  });

  describe("POST /api/roi/benchmark/run", () => {
    it("returns 201 with benchmark results", async () => {
      seedExecutionsForBenchmark(env.DB);

      const res = await app.request("/api/roi/benchmark/run", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ coldThreshold: 3, minExecutions: 4 }),
      }, env);

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.count).toBe(1);
      expect(data.benchmarks[0].skillId).toBe("cost-model");
      expect(data.benchmarks[0].costSavingsPct).toBeCloseTo(40);
    });

    it("returns 400 for invalid input", async () => {
      const res = await app.request("/api/roi/benchmark/run", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ coldThreshold: -1 }),
      }, env);

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/roi/benchmark/latest", () => {
    it("returns 200 with latest benchmarks", async () => {
      seedBenchmarkResults(env.DB);

      const res = await app.request("/api/roi/benchmark/latest", { headers }, env);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.benchmarks.length).toBe(1);
      expect(data.total).toBe(1);
    });
  });

  describe("GET /api/roi/benchmark/history", () => {
    it("returns 200 with history for a skill", async () => {
      seedBenchmarkResults(env.DB);

      const res = await app.request("/api/roi/benchmark/history?skillId=cost-model", { headers }, env);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.benchmarks.length).toBe(1);
    });

    it("returns 400 when skillId is missing", async () => {
      const res = await app.request("/api/roi/benchmark/history", { headers }, env);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/roi/benchmark/skill/:skillId", () => {
    it("returns 200 with skill detail", async () => {
      seedBenchmarkResults(env.DB);
      seedExecutionsForBenchmark(env.DB);

      const res = await app.request("/api/roi/benchmark/skill/cost-model", { headers }, env);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.skillId).toBe("cost-model");
      expect(data.coldExecutionsList).toBeInstanceOf(Array);
      expect(data.warmExecutionsList).toBeInstanceOf(Array);
    });

    it("returns 404 for non-existent skill", async () => {
      const res = await app.request("/api/roi/benchmark/skill/nonexistent", { headers }, env);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/roi/benchmark/by-stage", () => {
    it("returns 200 with stage aggregation", async () => {
      seedBenchmarkResults(env.DB);

      const res = await app.request("/api/roi/benchmark/by-stage", { headers }, env);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.stages).toBeInstanceOf(Array);
    });
  });

  describe("GET /api/roi/summary", () => {
    it("returns 200 with BD_ROI summary", async () => {
      seedBenchmarkResults(env.DB);
      seedExecutionsForBenchmark(env.DB);

      const res = await app.request("/api/roi/summary?days=30", { headers }, env);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.period.days).toBe(30);
      expect(typeof data.bdRoi).toBe("number");
      expect(data.breakdown).toBeDefined();
    });
  });

  describe("GET /api/roi/signal-valuations", () => {
    it("returns 200 with default valuations", async () => {
      const res = await app.request("/api/roi/signal-valuations", { headers }, env);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.valuations.length).toBe(3);
    });
  });

  describe("PUT /api/roi/signal-valuations", () => {
    it("returns 200 with updated valuations", async () => {
      const res = await app.request("/api/roi/signal-valuations", {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          valuations: [
            { signalType: "go", valueUsd: 75000, description: "Custom Go" },
          ],
        }),
      }, env);

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      const go = data.valuations.find((v: any) => v.signalType === "go");
      expect(go.valueUsd).toBe(75000);
    });
  });
});
