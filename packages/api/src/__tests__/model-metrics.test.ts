import { describe, it, expect, beforeEach } from "vitest";
import { ModelMetricsService } from "../services/agent/model-metrics.js";
import { createTestEnv } from "./helpers/test-app.js";
import { tokenRoute } from "../modules/auth/routes/token.js";

const TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS model_execution_metrics (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    task_type TEXT NOT NULL,
    model TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'success'
      CHECK(status IN ('success', 'partial', 'failed')),
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );
`;

let db: D1Database;

function seedProject() {
  (db as any)
    .prepare(
      "INSERT OR IGNORE INTO projects (id, name, repo_url, owner_id, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
    )
    .bind("proj-1", "Test Project", "https://github.com/test/repo", "test-user")
    .run();
}

function insertMetric(overrides: Partial<{
  id: string;
  projectId: string;
  agentName: string;
  taskType: string;
  model: string;
  status: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  recordedAt: string;
}> = {}) {
  const id = overrides.id ?? `mem_${Math.random().toString(36).slice(2, 10)}`;
  (db as any)
    .prepare(
      `INSERT INTO model_execution_metrics
        (id, project_id, agent_name, task_type, model, status, input_tokens, output_tokens, cost_usd, duration_ms, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      overrides.projectId ?? "proj-1",
      overrides.agentName ?? "code-reviewer",
      overrides.taskType ?? "review",
      overrides.model ?? "claude-sonnet-4",
      overrides.status ?? "success",
      overrides.inputTokens ?? 1000,
      overrides.outputTokens ?? 500,
      overrides.costUsd ?? 0.05,
      overrides.durationMs ?? 2000,
      overrides.recordedAt ?? new Date().toISOString(),
    )
    .run();
}

beforeEach(() => {
  const env = createTestEnv();
  db = env.DB;
  (db as any).exec(TABLE_DDL);
  seedProject();
});

// ─── recordExecution ───

describe("ModelMetricsService.recordExecution", () => {
  it("records a success execution", async () => {
    const service = new ModelMetricsService(db);
    const result = await service.recordExecution({
      projectId: "proj-1",
      agentName: "code-reviewer",
      taskType: "review",
      model: "claude-sonnet-4",
      status: "success",
      inputTokens: 1000,
      outputTokens: 500,
      costUsd: 0.05,
      durationMs: 2000,
    });

    expect(result.recorded).toBe(true);
    expect(result.id).toMatch(/^mem_/);
  });

  it("records a failed execution", async () => {
    const service = new ModelMetricsService(db);
    const result = await service.recordExecution({
      projectId: "proj-1",
      agentName: "test-writer",
      taskType: "generate",
      model: "claude-opus-4",
      status: "failed",
      inputTokens: 500,
      outputTokens: 0,
      costUsd: 0.02,
      durationMs: 5000,
    });

    expect(result.recorded).toBe(true);
    expect(result.id).toMatch(/^mem_/);
  });

  it("records a partial execution", async () => {
    const service = new ModelMetricsService(db);
    const result = await service.recordExecution({
      projectId: "proj-1",
      agentName: "planner",
      taskType: "plan",
      model: "deepseek-v3",
      status: "partial",
      inputTokens: 800,
      outputTokens: 200,
      costUsd: 0.01,
      durationMs: 3000,
    });

    expect(result.recorded).toBe(true);
    expect(result.id).toMatch(/^mem_/);
  });
});

// ─── getModelQuality ───

describe("ModelMetricsService.getModelQuality", () => {
  it("aggregates metrics for 2 models", async () => {
    insertMetric({ model: "claude-sonnet-4", costUsd: 0.05, inputTokens: 1000, outputTokens: 500 });
    insertMetric({ model: "claude-sonnet-4", costUsd: 0.05, inputTokens: 1000, outputTokens: 500 });
    insertMetric({ model: "claude-opus-4", costUsd: 0.20, inputTokens: 3000, outputTokens: 1000 });

    const service = new ModelMetricsService(db);
    const metrics = await service.getModelQuality({});

    expect(metrics.length).toBe(2);
    const sonnet = metrics.find((m) => m.model === "claude-sonnet-4");
    const opus = metrics.find((m) => m.model === "claude-opus-4");
    expect(sonnet!.totalExecutions).toBe(2);
    expect(opus!.totalExecutions).toBe(1);
  });

  it("returns empty array for no data", async () => {
    const service = new ModelMetricsService(db);
    const metrics = await service.getModelQuality({});
    expect(metrics).toEqual([]);
  });

  it("filters by days", async () => {
    // Recent record
    insertMetric({ model: "claude-sonnet-4", recordedAt: new Date().toISOString() });
    // Old record (60 days ago)
    const oldDate = new Date(Date.now() - 60 * 86400_000).toISOString();
    insertMetric({ model: "claude-opus-4", recordedAt: oldDate });

    const service = new ModelMetricsService(db);
    const metrics = await service.getModelQuality({ days: 30 });

    expect(metrics.length).toBe(1);
    expect(metrics[0]!.model).toBe("claude-sonnet-4");
  });

  it("filters by projectId", async () => {
    // Insert for different project
    (db as any)
      .prepare(
        "INSERT OR IGNORE INTO projects (id, name, repo_url, owner_id, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
      )
      .bind("proj-2", "Other Project", "https://github.com/test/other", "test-user")
      .run();

    insertMetric({ projectId: "proj-1", model: "claude-sonnet-4" });
    insertMetric({ projectId: "proj-2", model: "claude-opus-4" });

    const service = new ModelMetricsService(db);
    const metrics = await service.getModelQuality({ projectId: "proj-1" });

    expect(metrics.length).toBe(1);
    expect(metrics[0]!.model).toBe("claude-sonnet-4");
  });

  it("calculates successRate correctly", async () => {
    insertMetric({ model: "claude-sonnet-4", status: "success" });
    insertMetric({ model: "claude-sonnet-4", status: "success" });
    insertMetric({ model: "claude-sonnet-4", status: "failed" });
    insertMetric({ model: "claude-sonnet-4", status: "partial" });

    const service = new ModelMetricsService(db);
    const metrics = await service.getModelQuality({});

    expect(metrics.length).toBe(1);
    expect(metrics[0]!.successRate).toBe(50); // 2/4 = 50%
    expect(metrics[0]!.failedCount).toBe(1);
    expect(metrics[0]!.totalExecutions).toBe(4);
  });

  it("returns tokenEfficiency=0 when cost is 0", async () => {
    insertMetric({ model: "free-model", costUsd: 0, inputTokens: 1000, outputTokens: 500 });

    const service = new ModelMetricsService(db);
    const metrics = await service.getModelQuality({});

    expect(metrics.length).toBe(1);
    expect(metrics[0]!.tokenEfficiency).toBe(0);
    expect(metrics[0]!.totalCostUsd).toBe(0);
  });
});

// ─── getAgentModelMatrix ───

describe("ModelMetricsService.getAgentModelMatrix", () => {
  it("returns cross-tabulation by agent and model", async () => {
    insertMetric({ agentName: "code-reviewer", model: "claude-sonnet-4" });
    insertMetric({ agentName: "code-reviewer", model: "claude-opus-4" });
    insertMetric({ agentName: "test-writer", model: "claude-sonnet-4" });

    const service = new ModelMetricsService(db);
    const matrix = await service.getAgentModelMatrix({});

    expect(matrix.length).toBe(3);
    const crSonnet = matrix.find(
      (m) => m.agentName === "code-reviewer" && m.model === "claude-sonnet-4",
    );
    expect(crSonnet).toBeDefined();
    expect(crSonnet!.executions).toBe(1);
  });

  it("returns empty array for no data", async () => {
    const service = new ModelMetricsService(db);
    const matrix = await service.getAgentModelMatrix({});
    expect(matrix).toEqual([]);
  });
});

// ─── Route integration ───

describe("token route — model metrics endpoints", () => {
  it("GET /tokens/model-quality returns 200", async () => {
    const res = await tokenRoute.request("/tokens/model-quality");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data).toHaveProperty("metrics");
    expect(data).toHaveProperty("period");
    expect(Array.isArray(data.metrics)).toBe(true);
    expect(data.period).toHaveProperty("from");
    expect(data.period).toHaveProperty("to");
  });

  it("GET /tokens/agent-model-matrix returns 200", async () => {
    const res = await tokenRoute.request("/tokens/agent-model-matrix");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data).toHaveProperty("matrix");
    expect(data).toHaveProperty("period");
    expect(Array.isArray(data.matrix)).toBe(true);
    expect(data.period).toHaveProperty("from");
    expect(data.period).toHaveProperty("to");
  });
});
