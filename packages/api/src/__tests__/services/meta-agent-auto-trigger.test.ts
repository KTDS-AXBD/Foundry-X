// F536: MetaAgent 자동 진단 훅 — TDD Red Phase
// F544: auto-trigger 저장 경로 복구 — bizItemId + rubricScore 테스트 추가
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
  rubric_score     INTEGER,
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

  it("autoTriggerMetaAgent — MetaAgent 빈 proposal 반환 시 저장 없음", async () => {
    const sessionId = "sess-empty-proposals-536";
    const agentId = "discovery-graph";

    // 메트릭 존재해도 MetaAgent가 [] 반환하면 DB 저장 없음
    await (db as unknown as ReturnType<typeof createMockD1>).exec(
      `INSERT INTO agent_run_metrics
       (id, session_id, agent_id, status, rounds, stop_reason, input_tokens, output_tokens, started_at, created_at)
       VALUES ('m2', '${sessionId}', '${agentId}', 'completed', 2, 'end_turn', 100, 50, datetime('now'), datetime('now'))`
    );

    // MetaAgent LLM mock — 빈 배열 반환 (모든 축이 70 이상이거나 제안 없음)
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "[]" }],
      }),
    }));

    const { autoTriggerMetaAgent } = await import(
      "../../core/discovery/routes/discovery-stage-runner.js"
    );

    await autoTriggerMetaAgent(db, sessionId, "test-api-key");

    const result = await db
      .prepare("SELECT COUNT(*) as cnt FROM agent_improvement_proposals WHERE session_id = ?")
      .bind(sessionId)
      .first<{ cnt: number }>();

    expect(result?.cnt).toBe(0);
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

  // ─── F544: bizItemId 기반 집계 + rubricScore 저장 ───────────────────────────

  it("F544: autoTriggerMetaAgent — bizItemId 제공 시 stage-runner 메트릭으로 집계", async () => {
    const bizItemId = "biz-item-f544-001";
    const sessionId = `graph-${bizItemId}-123456`;

    // stage-runner 패턴으로 metrics 삽입
    await (db as unknown as ReturnType<typeof createMockD1>).prepare(
      `INSERT INTO agent_run_metrics
       (id, session_id, agent_id, status, rounds, stop_reason, input_tokens, output_tokens, started_at, created_at)
       VALUES (?, ?, 'discovery-stage-runner', 'completed', 8, 'end_turn', 50000, 0, datetime('now'), datetime('now'))`
    ).bind("mf1", `stage-2-1-${bizItemId}`).run();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: JSON.stringify([{
          type: "prompt",
          title: "F544 test proposal",
          reasoning: "Cost axis score is 0 due to high tokens",
          yamlDiff: "- model: claude-opus\n+ model: claude-haiku",
        }]) }],
        stop_reason: "end_turn",
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    }));

    const { autoTriggerMetaAgent } = await import(
      "../../core/discovery/routes/discovery-stage-runner.js"
    );

    await autoTriggerMetaAgent(db, sessionId, "test-api-key", bizItemId);

    const row = await db
      .prepare("SELECT * FROM agent_improvement_proposals WHERE session_id = ?")
      .bind(sessionId)
      .first<Record<string, unknown>>();

    expect(row).not.toBeNull();
    expect(row?.status).toBe("pending");
  });

  it("F544: autoTriggerMetaAgent — 저장 시 rubric_score가 NULL이 아님 (경로 단일화)", async () => {
    const bizItemId = "biz-item-f544-rubric";
    const sessionId = `graph-${bizItemId}-rubric`;

    await (db as unknown as ReturnType<typeof createMockD1>).prepare(
      `INSERT INTO agent_run_metrics
       (id, session_id, agent_id, status, rounds, stop_reason, input_tokens, output_tokens, started_at, created_at)
       VALUES (?, ?, 'discovery-stage-runner', 'completed', 10, 'end_turn', 99999, 0, datetime('now'), datetime('now'))`
    ).bind("mf3", `stage-2-1-${bizItemId}`).run();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: JSON.stringify([{
          type: "prompt",
          title: "F544 rubric test",
          reasoning: "Cost score is very low because input tokens are too high",
          yamlDiff: "- model: claude-opus-4-6\n+ model: claude-haiku-4-5",
        }]) }],
        stop_reason: "end_turn",
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    }));

    const { autoTriggerMetaAgent } = await import(
      "../../core/discovery/routes/discovery-stage-runner.js"
    );

    await autoTriggerMetaAgent(db, sessionId, "test-api-key", bizItemId);

    const row = await db
      .prepare("SELECT rubric_score FROM agent_improvement_proposals WHERE session_id = ?")
      .bind(sessionId)
      .first<{ rubric_score: number | null }>();

    expect(row).not.toBeNull();
    // F544: rubric_score는 반드시 설정돼야 함 (null이면 저장 경로 불일치)
    expect(row?.rubric_score).not.toBeNull();
    expect(typeof row?.rubric_score).toBe("number");
  });

  it("F544: autoTriggerMetaAgent — metaAgentModel 파라미터가 MetaAgent에 전달됨", async () => {
    const bizItemId = "biz-item-f544-model";
    const sessionId = `graph-${bizItemId}-model`;

    await (db as unknown as ReturnType<typeof createMockD1>).prepare(
      `INSERT INTO agent_run_metrics
       (id, session_id, agent_id, status, rounds, stop_reason, input_tokens, output_tokens, started_at, created_at)
       VALUES (?, ?, 'discovery-stage-runner', 'completed', 5, 'end_turn', 60000, 0, datetime('now'), datetime('now'))`
    ).bind("mf4", `stage-2-1-${bizItemId}`).run();

    let capturedModel: string | undefined;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init.body as string) as { model?: string } : {};
      capturedModel = body.model;
      return {
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: JSON.stringify([{
            type: "prompt",
            title: "model test",
            reasoning: "test reason because score low",
            yamlDiff: "- x: a\n+ x: b",
          }]) }],
          stop_reason: "end_turn",
          usage: { input_tokens: 50, output_tokens: 20 },
        }),
      };
    }));

    const { autoTriggerMetaAgent } = await import(
      "../../core/discovery/routes/discovery-stage-runner.js"
    );

    await autoTriggerMetaAgent(db, sessionId, "test-api-key", bizItemId, "claude-haiku-4-5");

    // F544: metaAgentModel 파라미터가 실제 fetch 호출 model에 반영돼야 함
    expect(capturedModel).toBe("claude-haiku-4-5");
  });
});
