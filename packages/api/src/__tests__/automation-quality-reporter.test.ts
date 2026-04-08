import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { AutomationQualityReporter } from "../core/harness/services/automation-quality-reporter.js";
import { automationQualityRoute } from "../core/harness/routes/automation-quality.js";
import { createTestEnv } from "./helpers/test-app.js";

// ── DDL ──────────────────────────────────

const PROJECTS_DDL = `
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    repo_url TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const MODEL_METRICS_DDL = `
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

const AGENT_FEEDBACK_DDL = `
  CREATE TABLE IF NOT EXISTS agent_feedback (
    id TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL,
    task_type TEXT NOT NULL,
    failure_reason TEXT,
    human_feedback TEXT,
    prompt_hint TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'applied')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`;

const FALLBACK_EVENTS_DDL = `
  CREATE TABLE IF NOT EXISTS fallback_events (
    id TEXT PRIMARY KEY,
    task_type TEXT NOT NULL,
    from_model TEXT NOT NULL,
    to_model TEXT NOT NULL,
    reason TEXT NOT NULL,
    latency_ms INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`;

const SNAPSHOTS_DDL = `
  CREATE TABLE IF NOT EXISTS automation_quality_snapshots (
    id TEXT PRIMARY KEY,
    snapshot_date TEXT NOT NULL,
    task_type TEXT,
    total_executions INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    success_rate REAL NOT NULL DEFAULT 0,
    avg_duration_ms REAL NOT NULL DEFAULT 0,
    total_cost_usd REAL NOT NULL DEFAULT 0,
    avg_cost_per_execution REAL NOT NULL DEFAULT 0,
    feedback_pending INTEGER NOT NULL DEFAULT 0,
    feedback_applied INTEGER NOT NULL DEFAULT 0,
    fallback_count INTEGER NOT NULL DEFAULT 0,
    top_failure_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_quality_snapshot_date_type
    ON automation_quality_snapshots(snapshot_date, task_type);
`;

// ── Helpers ──────────────────────────────

let db: D1Database;
let reporter: AutomationQualityReporter;
let cnt = 0;

function uid(): string {
  cnt++;
  return `id_${cnt}_${Math.random().toString(36).slice(2, 8)}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function insertMetric(overrides: Partial<{
  id: string;
  taskType: string;
  model: string;
  status: string;
  costUsd: number;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  recordedAt: string;
}> = {}) {
  (db as any)
    .prepare(
      `INSERT INTO model_execution_metrics
        (id, project_id, agent_name, task_type, model, status, input_tokens, output_tokens, cost_usd, duration_ms, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      overrides.id ?? uid(),
      "proj-1",
      "agent-1",
      overrides.taskType ?? "review",
      overrides.model ?? "claude-sonnet-4",
      overrides.status ?? "success",
      overrides.inputTokens ?? 1000,
      overrides.outputTokens ?? 500,
      overrides.costUsd ?? 0.05,
      overrides.durationMs ?? 2000,
      overrides.recordedAt ?? `${today()}T12:00:00Z`,
    )
    .run();
}

function insertFeedback(overrides: Partial<{
  id: string;
  taskType: string;
  failureReason: string;
  status: string;
  createdAt: string;
}> = {}) {
  (db as any)
    .prepare(
      `INSERT INTO agent_feedback (id, execution_id, task_type, failure_reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      overrides.id ?? uid(),
      uid(),
      overrides.taskType ?? "review",
      overrides.failureReason ?? null,
      overrides.status ?? "pending",
      overrides.createdAt ?? `${today()}T12:00:00Z`,
    )
    .run();
}

function insertFallback(overrides: Partial<{
  id: string;
  taskType: string;
  createdAt: string;
}> = {}) {
  (db as any)
    .prepare(
      `INSERT INTO fallback_events (id, task_type, from_model, to_model, reason, latency_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      overrides.id ?? uid(),
      overrides.taskType ?? "review",
      "claude-opus-4",
      "claude-sonnet-4",
      "timeout",
      500,
      overrides.createdAt ?? `${today()}T12:00:00Z`,
    )
    .run();
}

function seedProject() {
  (db as any)
    .prepare(
      "INSERT OR IGNORE INTO projects (id, name, repo_url, owner_id, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
    )
    .bind("proj-1", "Test Project", "https://github.com/test/repo", "test-user")
    .run();
}

beforeEach(() => {
  cnt = 0;
  const env = createTestEnv();
  db = env.DB;
  (db as any).exec(PROJECTS_DDL);
  (db as any).exec(MODEL_METRICS_DDL);
  (db as any).exec(AGENT_FEEDBACK_DDL);
  (db as any).exec(FALLBACK_EVENTS_DDL);
  (db as any).exec(SNAPSHOTS_DDL);
  seedProject();
  reporter = new AutomationQualityReporter(db);
});

// ─── generateReport ────────────────────────

describe("AutomationQualityReporter.generateReport", () => {
  it("1. 데이터 없음 → 빈 메트릭 (successRate=0)", async () => {
    const report = await reporter.generateReport(7);
    expect(report.overall.totalExecutions).toBe(0);
    expect(report.overall.successRate).toBe(0);
    expect(report.overall.avgDurationMs).toBe(0);
    // CI 환경 UTC vs 로컬 시간 차이로 6~7일분 가능
    expect(report.dailyTrends.length).toBeGreaterThanOrEqual(6);
    expect(report.dailyTrends.length).toBeLessThanOrEqual(7);
  });

  it("2. 성공+실패 혼합 → successRate 정확도", async () => {
    insertMetric({ status: "success" });
    insertMetric({ status: "success" });
    insertMetric({ status: "failed" });
    insertMetric({ status: "partial" });

    const report = await reporter.generateReport(1);
    expect(report.overall.totalExecutions).toBe(4);
    expect(report.overall.successCount).toBe(2);
    expect(report.overall.failedCount).toBe(1);
    expect(report.overall.partialCount).toBe(1);
    expect(report.overall.successRate).toBe(50);
  });

  it("3. taskType 필터 적용", async () => {
    insertMetric({ taskType: "review" });
    insertMetric({ taskType: "review" });
    insertMetric({ taskType: "generate" });

    const report = await reporter.generateReport(1, "review");
    expect(report.overall.totalExecutions).toBe(2);
  });

  it("4. 스냅샷 캐시 히트 (과거 날짜)", async () => {
    const yesterday = daysAgo(1);
    insertMetric({ recordedAt: `${yesterday}T12:00:00Z` });

    // 첫 호출 → 캐시 생성
    await reporter.generateReport(2);

    // 추가 데이터 삽입 (캐시에는 반영 안 됨)
    insertMetric({ recordedAt: `${yesterday}T13:00:00Z` });

    // 두 번째 호출 → 어제 스냅샷은 캐시 히트
    const report = await reporter.generateReport(2);
    const yesterdayTrend = report.dailyTrends.find(t => t.date === yesterday);
    expect(yesterdayTrend?.executions).toBe(1); // 캐시된 값
  });

  it("5. 당일 스냅샷 재생성", async () => {
    insertMetric({ status: "success" });

    // 첫 호출
    const r1 = await reporter.generateReport(1);
    expect(r1.overall.totalExecutions).toBe(1);

    // 추가 데이터
    insertMetric({ status: "failed" });

    // 두 번째 호출 → 당일은 항상 재집계
    const r2 = await reporter.generateReport(1);
    expect(r2.overall.totalExecutions).toBe(2);
  });

  it("6. days=90 최대 범위", async () => {
    const report = await reporter.generateReport(90);
    expect(report.period.days).toBe(90);
    expect(report.dailyTrends).toHaveLength(90);
  });

  it("7. byTaskType 분류 정확", async () => {
    insertMetric({ taskType: "review", status: "success" });
    insertMetric({ taskType: "review", status: "failed" });
    insertMetric({ taskType: "generate", status: "success" });

    const report = await reporter.generateReport(1);
    expect(report.byTaskType).toHaveLength(2);
    const review = report.byTaskType.find(t => t.taskType === "review");
    expect(review?.executions).toBe(2);
    expect(review?.successRate).toBe(50);
    const gen = report.byTaskType.find(t => t.taskType === "generate");
    expect(gen?.executions).toBe(1);
    expect(gen?.successRate).toBe(100);
  });

  it("8. byModel 분류 정확", async () => {
    insertMetric({ model: "claude-sonnet-4", status: "success", inputTokens: 1000, outputTokens: 500 });
    insertMetric({ model: "claude-opus-4", status: "success", inputTokens: 2000, outputTokens: 1000 });
    insertMetric({ model: "claude-opus-4", status: "failed", inputTokens: 1500, outputTokens: 0 });

    const report = await reporter.generateReport(1);
    expect(report.byModel).toHaveLength(2);
    const opus = report.byModel.find(m => m.model === "claude-opus-4");
    expect(opus?.executions).toBe(2);
    expect(opus?.successRate).toBe(50);
    const sonnet = report.byModel.find(m => m.model === "claude-sonnet-4");
    expect(sonnet?.executions).toBe(1);
    expect(sonnet?.successRate).toBe(100);
    expect(sonnet!.tokenEfficiency).toBeGreaterThan(0);
  });

  it("9. dailyTrends 일별 추이", async () => {
    const d1 = daysAgo(2);
    const d2 = daysAgo(1);
    insertMetric({ recordedAt: `${d1}T10:00:00Z`, status: "success" });
    insertMetric({ recordedAt: `${d2}T10:00:00Z`, status: "failed" });
    insertMetric({ recordedAt: `${today()}T10:00:00Z`, status: "success" });

    const report = await reporter.generateReport(3);
    expect(report.dailyTrends).toHaveLength(3);
    const trend0 = report.dailyTrends.find(t => t.date === d1);
    expect(trend0?.executions).toBe(1);
    expect(trend0?.successRate).toBe(100);
    const trend1 = report.dailyTrends.find(t => t.date === d2);
    expect(trend1?.executions).toBe(1);
    expect(trend1?.successRate).toBe(0);
  });

  it("10. 비용 집계 정확도", async () => {
    insertMetric({ costUsd: 0.10 });
    insertMetric({ costUsd: 0.20 });
    insertMetric({ costUsd: 0.30 });

    const report = await reporter.generateReport(1);
    expect(report.overall.totalCostUsd).toBe(0.6);
    expect(report.overall.avgCostPerExecution).toBe(0.2);
  });
});

// ─── getFailurePatterns ────────────────────

describe("AutomationQualityReporter.getFailurePatterns", () => {
  it("11. 실패 데이터 없음 → 빈 배열", async () => {
    const patterns = await reporter.getFailurePatterns(30);
    expect(patterns).toEqual([]);
  });

  it("12. taskType×model 그룹화", async () => {
    insertMetric({ taskType: "review", model: "claude-sonnet-4", status: "failed" });
    insertMetric({ taskType: "review", model: "claude-sonnet-4", status: "failed" });
    insertMetric({ taskType: "generate", model: "claude-opus-4", status: "failed" });

    const patterns = await reporter.getFailurePatterns(1);
    expect(patterns).toHaveLength(2);
    const reviewSonnet = patterns.find(p => p.taskType === "review" && p.model === "claude-sonnet-4");
    expect(reviewSonnet?.failureCount).toBe(2);
    const genOpus = patterns.find(p => p.taskType === "generate" && p.model === "claude-opus-4");
    expect(genOpus?.failureCount).toBe(1);
  });

  it("13. topReasons 상위 3개", async () => {
    insertMetric({ taskType: "review", status: "failed" });
    insertFeedback({ taskType: "review", failureReason: "timeout" });
    insertFeedback({ taskType: "review", failureReason: "timeout" });
    insertFeedback({ taskType: "review", failureReason: "rate-limit" });
    insertFeedback({ taskType: "review", failureReason: "context-overflow" });
    insertFeedback({ taskType: "review", failureReason: "context-overflow" });
    insertFeedback({ taskType: "review", failureReason: "context-overflow" });
    insertFeedback({ taskType: "review", failureReason: "unknown" });

    const patterns = await reporter.getFailurePatterns(1);
    const review = patterns.find(p => p.taskType === "review");
    expect(review?.topReasons).toHaveLength(3);
    expect(review?.topReasons[0]).toBe("context-overflow");
    expect(review?.topReasons[1]).toBe("timeout");
  });

  it("14. pendingFeedback 카운트", async () => {
    insertMetric({ taskType: "review", status: "failed" });
    insertFeedback({ taskType: "review", status: "pending" });
    insertFeedback({ taskType: "review", status: "pending" });
    insertFeedback({ taskType: "review", status: "applied" });

    const patterns = await reporter.getFailurePatterns(1);
    expect(patterns[0]?.pendingFeedback).toBe(2);
  });
});

// ─── getImprovementSuggestions ─────────────

describe("AutomationQualityReporter.getImprovementSuggestions", () => {
  it("15. 모든 규칙 미충족 → 빈 배열", async () => {
    const suggestions = await reporter.getImprovementSuggestions(7);
    expect(suggestions).toEqual([]);
  });

  it("16. model-unstable: successRate < 80%, executions >= 5", async () => {
    for (let i = 0; i < 5; i++) {
      insertMetric({ model: "bad-model", status: i < 3 ? "failed" : "success" });
    }

    const suggestions = await reporter.getImprovementSuggestions(1);
    const unstable = suggestions.find(s => s.type === "model-unstable");
    expect(unstable).toBeDefined();
    expect(unstable!.severity).toBe("warning");
  });

  it("17. fallback-frequent: fallbackRate > 20%", async () => {
    // 10 executions + 3 fallbacks = 30% fallback rate
    for (let i = 0; i < 10; i++) {
      insertMetric({ status: "success" });
    }
    for (let i = 0; i < 3; i++) {
      insertFallback({});
    }

    const suggestions = await reporter.getImprovementSuggestions(1);
    const frequent = suggestions.find(s => s.type === "fallback-frequent");
    expect(frequent).toBeDefined();
    expect(frequent!.severity).toBe("warning");
  });

  it("18. cost-anomaly: avgCostPerExecution > overall × 2", async () => {
    // cheap tasks: 6× $0.01 → avg 0.01
    for (let i = 0; i < 6; i++) {
      insertMetric({ taskType: "lint", costUsd: 0.01 });
    }
    // expensive tasks: 3× $1.00 → avg 1.00
    // overall avg = (6×0.01 + 3×1.00) / 9 = 3.06/9 = 0.34
    // architect avg 1.00 > 0.34 × 2 = 0.68 → triggered
    for (let i = 0; i < 3; i++) {
      insertMetric({ taskType: "architect", costUsd: 1.00 });
    }

    const suggestions = await reporter.getImprovementSuggestions(1);
    const anomaly = suggestions.find(s => s.type === "cost-anomaly");
    expect(anomaly).toBeDefined();
    expect(anomaly!.severity).toBe("info");
  });

  it("19. feedback-backlog: pending > 10", async () => {
    insertMetric({ status: "success" });
    for (let i = 0; i < 12; i++) {
      insertFeedback({ status: "pending" });
    }

    const suggestions = await reporter.getImprovementSuggestions(1);
    const backlog = suggestions.find(s => s.type === "feedback-backlog");
    expect(backlog).toBeDefined();
    expect(backlog!.severity).toBe("warning");
  });

  it("20. task-low-quality: successRate < 60%, executions >= 5", async () => {
    for (let i = 0; i < 5; i++) {
      insertMetric({ taskType: "deploy", status: i < 2 ? "failed" : "success" });
    }
    // 3/5 = 60% — not triggered (boundary)
    let suggestions = await reporter.getImprovementSuggestions(1);
    expect(suggestions.find(s => s.type === "task-low-quality")).toBeUndefined();

    // 4 failed + 1 success = 20% — triggered
    for (let i = 0; i < 4; i++) {
      insertMetric({ taskType: "fragile", status: "failed" });
    }
    insertMetric({ taskType: "fragile", status: "success" });

    suggestions = await reporter.getImprovementSuggestions(1);
    const lowQ = suggestions.find(s => s.type === "task-low-quality");
    expect(lowQ).toBeDefined();
    expect(lowQ!.severity).toBe("critical");
  });

  it("21. 복합 규칙 동시 충족", async () => {
    // model-unstable: 5 bad-model all failed
    for (let i = 0; i < 5; i++) {
      insertMetric({ model: "bad-model", status: "failed", taskType: "test" });
    }
    // task-low-quality: same 5 "test" tasks failed (0% success, >= 5 exec)
    // feedback-backlog: 11 pending
    for (let i = 0; i < 11; i++) {
      insertFeedback({ status: "pending" });
    }

    const suggestions = await reporter.getImprovementSuggestions(1);
    const types = suggestions.map(s => s.type);
    expect(types).toContain("model-unstable");
    expect(types).toContain("task-low-quality");
    expect(types).toContain("feedback-backlog");
    expect(suggestions.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── 엔드포인트 ────────────────────────────

describe("automation-quality endpoints", () => {
  function createApp() {
    const env = createTestEnv();
    db = env.DB;
    (db as any).exec(PROJECTS_DDL);
    (db as any).exec(MODEL_METRICS_DDL);
    (db as any).exec(AGENT_FEEDBACK_DDL);
    (db as any).exec(FALLBACK_EVENTS_DDL);
    (db as any).exec(SNAPSHOTS_DDL);
    seedProject();

    const app = new Hono();
    app.route("/automation-quality", automationQualityRoute);
    return { app, env };
  }

  it("22. GET /automation-quality/report → 200", async () => {
    const { app, env } = createApp();
    const res = await app.request("/automation-quality/report?days=7", {}, env);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.report).toBeDefined();
    expect(body.report.period.days).toBe(7);
    expect(body.report.overall).toBeDefined();
    // CI 환경 UTC vs 로컬 시간 차이로 6~7일분 가능
    expect(body.report.dailyTrends.length).toBeGreaterThanOrEqual(6);
    expect(body.report.dailyTrends.length).toBeLessThanOrEqual(7);
  });

  it("23. GET /automation-quality/failure-patterns → 200", async () => {
    const { app, env } = createApp();
    const res = await app.request("/automation-quality/failure-patterns?days=30", {}, env);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.patterns).toBeDefined();
    expect(body.total).toBe(0);
  });

  it("24. GET /automation-quality/suggestions → 200", async () => {
    const { app, env } = createApp();
    const res = await app.request("/automation-quality/suggestions?days=7", {}, env);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.suggestions).toBeDefined();
    expect(body.evaluatedRules).toBe(6);
  });
});
