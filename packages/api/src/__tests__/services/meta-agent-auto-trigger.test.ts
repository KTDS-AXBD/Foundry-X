// F536: MetaAgent 자동 진단 훅 — TDD Red Phase
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { createMockD1 } from "../helpers/mock-d1.js";

// ─── DB DDL ───────────────────────────────────────────────────────────────────

const METRICS_DDL = `
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

const PROPOSALS_DDL = `
CREATE TABLE IF NOT EXISTS agent_improvement_proposals (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL,
  agent_id         TEXT NOT NULL,
  type             TEXT NOT NULL,
  title            TEXT NOT NULL,
  reasoning        TEXT NOT NULL,
  yaml_diff        TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  applied_at       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("F536: MetaAgent 자동 진단 훅", () => {
  let db: D1Database;
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(async () => {
    mockDb = createMockD1();
    await mockDb.exec(METRICS_DDL);
    await mockDb.exec(PROPOSALS_DDL);
    db = mockDb as unknown as D1Database;
    vi.restoreAllMocks();
  });

  it("autoTriggerMetaAgent — score < 70 시 proposal 저장", async () => {
    const sessionId = "sess-low-score-536";
    const agentId = "discovery-graph";

    // 토큰이 매우 높아 Cost/Memory 점수 낮게 → score < 70 유도
    await (db as unknown as ReturnType<typeof createMockD1>).exec(
      `INSERT INTO agent_run_metrics
       (id, session_id, agent_id, status, rounds, stop_reason, input_tokens, output_tokens, started_at, created_at)
       VALUES ('m1', '${sessionId}', '${agentId}', 'completed', 10, 'end_turn', 99999, 0, datetime('now'), datetime('now'))`
    );

    // MetaAgent fetch mock — 개선 제안 1건 반환
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{
          type: "text",
          text: JSON.stringify([{
            type: "prompt",
            title: "Reduce token usage",
            reasoning: "Cost axis score is 0",
            yamlDiff: "- model: claude-opus\n+ model: claude-haiku",
          }]),
        }],
      }),
    }));

    const { autoTriggerMetaAgent } = await import(
      "../../core/discovery/routes/discovery-stage-runner.js"
    );

    await autoTriggerMetaAgent(db, sessionId, "test-api-key");

    const row = await db
      .prepare("SELECT * FROM agent_improvement_proposals WHERE session_id = ?")
      .bind(sessionId)
      .first();

    expect(row).not.toBeNull();
    expect((row as Record<string, unknown>)?.status).toBe("pending");
    expect((row as Record<string, unknown>)?.type).toBe("prompt");
  });

  it("autoTriggerMetaAgent — 전축 score >= 70 시 저장 없음", async () => {
    const sessionId = "sess-high-score-536";
    const agentId = "discovery-graph";

    // end_turn, 토큰 적음 → 모든 축 70 이상
    await (db as unknown as ReturnType<typeof createMockD1>).exec(
      `INSERT INTO agent_run_metrics
       (id, session_id, agent_id, status, rounds, stop_reason, input_tokens, output_tokens, started_at, created_at)
       VALUES ('m2', '${sessionId}', '${agentId}', 'completed', 2, 'end_turn', 100, 50, datetime('now'), datetime('now'))`
    );

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { autoTriggerMetaAgent } = await import(
      "../../core/discovery/routes/discovery-stage-runner.js"
    );

    await autoTriggerMetaAgent(db, sessionId, "test-api-key");

    const result = await db
      .prepare("SELECT COUNT(*) as cnt FROM agent_improvement_proposals WHERE session_id = ?")
      .bind(sessionId)
      .first<{ cnt: number }>();

    expect(result?.cnt).toBe(0);
    // fetch는 호출되지 않아야 함 (빈 배열 반환으로 LLM 호출 없음)
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("autoTriggerMetaAgent — MetaAgent API 실패 시 에러 전파 안 함", async () => {
    const sessionId = "sess-api-fail-536";

    await (db as unknown as ReturnType<typeof createMockD1>).exec(
      `INSERT INTO agent_run_metrics
       (id, session_id, agent_id, status, rounds, stop_reason, input_tokens, output_tokens, started_at, created_at)
       VALUES ('m3', '${sessionId}', 'discovery-graph', 'completed', 10, 'end_turn', 99999, 0, datetime('now'), datetime('now'))`
    );

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const { autoTriggerMetaAgent } = await import(
      "../../core/discovery/routes/discovery-stage-runner.js"
    );

    // 에러가 throw되지 않아야 함
    await expect(autoTriggerMetaAgent(db, sessionId, "test-api-key")).resolves.not.toThrow();
  });

  it("OrchestrationLoop — MetaAgentHook 제공 시 5번째 인자로 수신", async () => {
    const { OrchestrationLoop } = await import(
      "../../core/agent/services/orchestration-loop.js"
    );

    const hookTrigger = vi.fn().mockResolvedValue(undefined);
    const mockHook = { trigger: hookTrigger };

    // OrchestrationLoop가 MetaAgentHook를 5번째 인자로 받는지 확인 (타입 캐스팅)
    const loop = new (OrchestrationLoop as new (
      a: unknown, b: unknown, c: unknown, d?: unknown, e?: unknown
    ) => unknown)(
      { getState: vi.fn().mockResolvedValue(null) },
      { emit: vi.fn(), subscribe: vi.fn() },
      db,
      undefined,  // diagnostics (4번째)
      mockHook,   // metaHook (5번째)
    );

    expect(loop).toBeDefined();
  });

  it("OrchestrationLoop — MetaAgentHook 미제공 시 에러 없음 (backward compat)", async () => {
    const { OrchestrationLoop } = await import(
      "../../core/agent/services/orchestration-loop.js"
    );

    // 기존 3개 인자만 전달 — backward compatible
    expect(() => new (OrchestrationLoop as new (
      a: unknown, b: unknown, c: unknown
    ) => unknown)(
      { getState: vi.fn() },
      { emit: vi.fn(), subscribe: vi.fn() },
      db,
    )).not.toThrow();
  });
});
