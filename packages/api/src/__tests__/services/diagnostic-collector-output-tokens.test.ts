// F586: output_tokens=0 fix — TDD Red (Sprint 332)
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "../helpers/mock-d1.js";
import { DiagnosticCollector } from "../../core/agent/services/diagnostic-collector.js";
import type { AgentExecutionResult } from "../../core/agent/services/execution-types.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS agent_run_metrics (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    status TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens INTEGER NOT NULL DEFAULT 0,
    rounds INTEGER NOT NULL DEFAULT 1,
    stop_reason TEXT,
    duration_ms INTEGER,
    error_msg TEXT,
    started_at TEXT,
    finished_at TEXT,
    created_at TEXT NOT NULL
  );
`;

const runDdl = (db: D1Database, q: string) =>
  (db as unknown as { exec: (q: string) => Promise<void> }).exec(q);

describe("DiagnosticCollector — F586 output_tokens fix", () => {
  let db: D1Database;
  let collector: DiagnosticCollector;

  beforeEach(async () => {
    db = createMockD1() as unknown as D1Database;
    await runDdl(db, DDL);
    collector = new DiagnosticCollector(db);
  });

  it("record() persists output_tokens from result", async () => {
    const result: AgentExecutionResult = {
      status: "success",
      output: {},
      model: "claude-3-5-sonnet",
      duration: 100,
      tokensUsed: 1000,
      outputTokens: 42,
      cacheReadTokens: 5,
    };
    await collector.record("session-1", "agent-1", result, 100);
    const row = await db
      .prepare(
        "SELECT output_tokens, cache_read_tokens FROM agent_run_metrics WHERE session_id='session-1'",
      )
      .first<{ output_tokens: number; cache_read_tokens: number }>();
    expect(row?.output_tokens).toBe(42);
    expect(row?.cache_read_tokens).toBe(5);
  });

  it("record() defaults output_tokens to 0 when not provided", async () => {
    const result: AgentExecutionResult = {
      status: "success",
      output: {},
      model: "claude-3-5-sonnet",
      duration: 100,
      tokensUsed: 500,
    };
    await collector.record("session-2", "agent-1", result, 50);
    const row = await db
      .prepare(
        "SELECT output_tokens FROM agent_run_metrics WHERE session_id='session-2'",
      )
      .first<{ output_tokens: number }>();
    expect(row?.output_tokens).toBe(0);
  });
});
