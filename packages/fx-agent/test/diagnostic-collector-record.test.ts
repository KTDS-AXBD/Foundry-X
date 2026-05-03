// F534: DiagnosticCollector.record() TDD Red — Sprint 287
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { DiagnosticCollector } from "../src/services/diagnostic-collector.js";
import type { AgentExecutionResult } from "../src/services/execution-types.js";

const METRICS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS agent_run_metrics (
    id                TEXT PRIMARY KEY,
    session_id        TEXT NOT NULL,
    agent_id          TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'running',
    input_tokens      INTEGER DEFAULT 0,
    output_tokens     INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    rounds            INTEGER DEFAULT 0,
    stop_reason       TEXT,
    duration_ms       INTEGER,
    error_msg         TEXT,
    started_at        TEXT NOT NULL,
    finished_at       TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

describe("DiagnosticCollector.record() — F534", () => {
  let db: ReturnType<typeof createMockD1>;
  let collector: DiagnosticCollector;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(METRICS_SCHEMA);
    collector = new DiagnosticCollector(db as unknown as D1Database);
  });

  it("성공 결과를 agent_run_metrics에 status=completed로 INSERT한다", async () => {
    const result: AgentExecutionResult = {
      status: "success",
      output: { analysis: "분석 완료" },
      tokensUsed: 123,
      model: "claude-haiku",
      duration: 456,
    };

    await collector.record("sess-1", "discovery-stage-runner", result, 456);

    const row = await db
      .prepare("SELECT * FROM agent_run_metrics WHERE session_id = ?")
      .bind("sess-1")
      .first<Record<string, unknown>>();
    expect(row).toBeDefined();
    expect(row!.status).toBe("completed");
    expect(row!.input_tokens).toBe(123);
    expect(row!.duration_ms).toBe(456);
    expect(row!.agent_id).toBe("discovery-stage-runner");
    expect(row!.stop_reason).toBe("end_turn");
  });

  it("partial 결과도 completed로 처리한다", async () => {
    const result: AgentExecutionResult = {
      status: "partial",
      output: { analysis: "부분 결과" },
      tokensUsed: 50,
      model: "claude-haiku",
      duration: 200,
    };

    await collector.record("sess-partial", "agent-x", result, 200);

    const row = await db
      .prepare("SELECT status FROM agent_run_metrics WHERE session_id = ?")
      .bind("sess-partial")
      .first<{ status: string }>();
    expect(row!.status).toBe("completed");
  });

  it("실패 결과를 status=failed, error_msg 포함으로 INSERT한다", async () => {
    const result: AgentExecutionResult = {
      status: "failed",
      output: { analysis: "API timeout" },
      tokensUsed: 0,
      model: "claude-haiku",
      duration: 100,
    };

    await collector.record("sess-fail", "agent-1", result, 100);

    const row = await db
      .prepare("SELECT status, error_msg FROM agent_run_metrics WHERE session_id = ?")
      .bind("sess-fail")
      .first<{ status: string; error_msg: string }>();
    expect(row!.status).toBe("failed");
    expect(row!.error_msg).toBe("API timeout");
  });

  it("record() 후 collect()가 rawValue > 0인 축을 반환한다", async () => {
    const result: AgentExecutionResult = {
      status: "success",
      output: { analysis: "ok" },
      tokensUsed: 300,
      model: "claude-haiku",
      duration: 800,
    };

    await collector.record("sess-collect", "discovery-stage-runner", result, 800);

    const report = await collector.collect("sess-collect", "discovery-stage-runner");
    expect(report.sessionId).toBe("sess-collect");
    const nonZeroAxes = report.scores.filter((s) => s.rawValue > 0);
    expect(nonZeroAxes.length).toBeGreaterThanOrEqual(1);
    expect(report.overallScore).not.toBe(50);
  });

  it("복수 record() 호출 시 각각 별도 행으로 INSERT된다", async () => {
    const result: AgentExecutionResult = {
      status: "success",
      output: { analysis: "ok" },
      tokensUsed: 100,
      model: "m",
      duration: 50,
    };

    await collector.record("sess-multi", "agent-1", result, 50);
    await collector.record("sess-multi", "agent-1", result, 50);

    const { results } = await db
      .prepare("SELECT id FROM agent_run_metrics WHERE session_id = ?")
      .bind("sess-multi")
      .all();
    expect(results.length).toBe(2);
  });
});
