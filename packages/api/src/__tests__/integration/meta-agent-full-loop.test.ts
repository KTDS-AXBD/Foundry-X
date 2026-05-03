// F533 MetaAgent 실전 검증 — Full Loop Integration Test (TDD Red Phase)
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "../helpers/mock-d1.js";
import { metaRoute } from "../../agent/routes/meta.js";
import type { D1Database } from "@cloudflare/workers-types";
import type { Env } from "../../env.js";

const DDL_METRICS = `
CREATE TABLE IF NOT EXISTS agent_run_metrics (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  rounds INTEGER DEFAULT 0,
  stop_reason TEXT,
  duration_ms INTEGER,
  error_msg TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const DDL_PROPOSALS = `
CREATE TABLE IF NOT EXISTS agent_improvement_proposals (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  yaml_diff TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  rubric_score INTEGER,
  applied_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const DDL_COMPARISONS = `
CREATE TABLE IF NOT EXISTS agent_model_comparisons (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  report_id TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL DEFAULT '1.0',
  proposals_json TEXT NOT NULL DEFAULT '[]',
  proposal_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
`;

const DDL_MARKETPLACE = `
CREATE TABLE IF NOT EXISTS agent_marketplace_items (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  system_prompt TEXT NOT NULL,
  allowed_tools TEXT NOT NULL DEFAULT '[]',
  preferred_model TEXT,
  preferred_runner_type TEXT DEFAULT 'openrouter',
  task_type TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  publisher_org_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  avg_rating REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  install_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const MOCK_PROPOSALS = [
  {
    type: "prompt",
    title: "시스템 프롬프트에 도구 우선순위 가이드 추가",
    reasoning: "ToolEffectiveness 점수가 낮습니다.",
    yamlDiff:
      '- systemPrompt: "You are a discovery agent."\n+ systemPrompt: "You are a discovery agent.\\nTool Priority: prefer web_search first."',
  },
];

function setupFetchMock() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: JSON.stringify(MOCK_PROPOSALS) }],
        stop_reason: "end_turn",
        usage: { input_tokens: 500, output_tokens: 200 },
      }),
    }),
  );
}

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", metaRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, {
        DB: db,
        ANTHROPIC_API_KEY: "test-key",
      } as unknown as Env),
  };
}

async function seedDiscoveryGraphRun(db: D1Database, sessionId: string, agentId: string) {
  const runs = [
    { id: "run-1", rounds: 5, stopReason: "max_rounds", inputTokens: 3000, outputTokens: 800 },
    { id: "run-2", rounds: 3, stopReason: "end_turn", inputTokens: 1500, outputTokens: 500 },
  ];
  for (const run of runs) {
    await db
      .prepare(
        `INSERT INTO agent_run_metrics
         (id, session_id, agent_id, status, rounds, stop_reason, input_tokens, output_tokens, started_at, created_at)
         VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      )
      .bind(run.id, sessionId, agentId, run.rounds, run.stopReason, run.inputTokens, run.outputTokens)
      .run();
  }
}

describe("F533 MetaAgent Full Loop Integration", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;
  const SESSION_ID = "discovery-graph-session-001";
  const AGENT_ID = "planner";

  beforeEach(async () => {
    setupFetchMock();
    const mockDb = createMockD1();
    await mockDb.exec(DDL_METRICS);
    await mockDb.exec(DDL_PROPOSALS);
    await mockDb.exec(DDL_MARKETPLACE);
    await mockDb.exec(DDL_COMPARISONS);

    await mockDb
      .prepare(
        `INSERT INTO agent_marketplace_items
         (id, role_id, name, description, system_prompt, task_type, category, publisher_org_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        "ami-planner", AGENT_ID, "Planner Agent", "발굴 에이전트",
        "You are a discovery agent.", "discovery", "agent", "org-test",
      )
      .run();

    db = mockDb as unknown as D1Database;
    app = createApp(db);
    await seedDiscoveryGraphRun(db, SESSION_ID, AGENT_ID);
  });

  it("발굴 Graph 실행 시뮬레이션 — agent_run_metrics에 2행 시드", async () => {
    const rows = await db
      .prepare("SELECT COUNT(*) as cnt FROM agent_run_metrics WHERE session_id = ?")
      .bind(SESSION_ID)
      .first<{ cnt: number }>();
    expect(rows?.cnt).toBe(2);
  });

  it("POST /api/meta/diagnose → 6축 DiagnosticReport + proposals 반환", async () => {
    const res = await app.request("/api/meta/diagnose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID, agentId: AGENT_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as {
      report: { scores: unknown[]; overallScore: number };
      proposals: unknown[];
    };
    expect(body.report.scores).toHaveLength(6);
    expect(body.report.overallScore).toBeGreaterThanOrEqual(0);
    expect(body.report.overallScore).toBeLessThanOrEqual(100);
    expect(body.proposals.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/meta/proposals → 진단 후 proposals가 DB에 저장된다", async () => {
    await app.request("/api/meta/diagnose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID, agentId: AGENT_ID }),
    });
    const res = await app.request(`/api/meta/proposals?sessionId=${SESSION_ID}`);
    expect(res.status).toBe(200);
    const body = await res.json() as { proposals: { status: string }[] };
    expect(body.proposals.length).toBeGreaterThanOrEqual(1);
    expect(body.proposals.every((p) => p.status === "pending")).toBe(true);
  });

  it("Human Approval → approve → status=approved", async () => {
    const diagnoseRes = await app.request("/api/meta/diagnose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID, agentId: AGENT_ID }),
    });
    const { proposals } = await diagnoseRes.json() as { proposals: { id: string }[] };
    const proposalId = proposals[0]!.id;

    const approveRes = await app.request(`/api/meta/proposals/${proposalId}/approve`, { method: "POST" });
    expect(approveRes.status).toBe(200);
    const approveBody = await approveRes.json() as { proposal: { status: string } };
    expect(approveBody.proposal.status).toBe("approved");
  });

  it("Apply — approved proposal → applied_at 기록 (200)", async () => {
    const diagnoseRes = await app.request("/api/meta/diagnose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID, agentId: AGENT_ID }),
    });
    const { proposals } = await diagnoseRes.json() as { proposals: { id: string }[] };
    const proposalId = proposals[0]!.id;

    await app.request(`/api/meta/proposals/${proposalId}/approve`, { method: "POST" });

    const applyRes = await app.request(`/api/meta/proposals/${proposalId}/apply`, { method: "POST" });
    expect(applyRes.status).toBe(200);
    const applyBody = await applyRes.json() as { proposal: { appliedAt: string; status: string } };
    expect(applyBody.proposal.appliedAt).toBeTruthy();
    expect(applyBody.proposal.status).toBe("approved");
  });

  it("Apply — 미승인(pending) proposal → 422", async () => {
    const diagnoseRes = await app.request("/api/meta/diagnose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID, agentId: AGENT_ID }),
    });
    const { proposals } = await diagnoseRes.json() as { proposals: { id: string }[] };
    const proposalId = proposals[0]!.id;

    const applyRes = await app.request(`/api/meta/proposals/${proposalId}/apply`, { method: "POST" });
    expect(applyRes.status).toBe(422);
  });

  it("Apply — 이미 반영된 proposal → 409", async () => {
    const diagnoseRes = await app.request("/api/meta/diagnose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID, agentId: AGENT_ID }),
    });
    const { proposals } = await diagnoseRes.json() as { proposals: { id: string }[] };
    const proposalId = proposals[0]!.id;

    await app.request(`/api/meta/proposals/${proposalId}/approve`, { method: "POST" });
    await app.request(`/api/meta/proposals/${proposalId}/apply`, { method: "POST" });

    const applyRes2 = await app.request(`/api/meta/proposals/${proposalId}/apply`, { method: "POST" });
    expect(applyRes2.status).toBe(409);
  });

  it("Apply — 존재하지 않는 proposal ID → 404", async () => {
    const applyRes = await app.request("/api/meta/proposals/nonexistent-id/apply", { method: "POST" });
    expect(applyRes.status).toBe(404);
  });
});

// ─── F544: auto-trigger 경로 integration ─────────────────────────────────────
describe("F544: autoTriggerMetaAgent integration — auto 경로 proposals 저장", () => {
  let db: D1Database;

  beforeEach(async () => {
    setupFetchMock();
    const mockDb = createMockD1();
    await mockDb.exec(DDL_METRICS);
    await mockDb.exec(DDL_PROPOSALS);
    await mockDb.exec(DDL_MARKETPLACE);
    await mockDb.exec(DDL_COMPARISONS);
    db = mockDb as unknown as D1Database;
  });

  it("stage-runner 패턴 메트릭 존재 시 autoTriggerMetaAgent → proposals > 0 + rubric_score NOT NULL", async () => {
    const bizItemId = "biz-item-integration-f544";
    const sessionId = `graph-${bizItemId}-9999`;

    // stage-runner 패턴으로 메트릭 삽입 (Graph 실행 시뮬레이션)
    await db.prepare(
      `INSERT INTO agent_run_metrics
       (id, session_id, agent_id, status, rounds, stop_reason, input_tokens, output_tokens, started_at, created_at)
       VALUES (?, ?, 'discovery-stage-runner', 'completed', 12, 'end_turn', 80000, 0, datetime('now'), datetime('now'))`
    ).bind("int-1", `stage-2-1-${bizItemId}`).run();

    const { autoTriggerMetaAgent } = await import(
      "../../core/discovery/routes/discovery-stage-runner.js"
    );

    await autoTriggerMetaAgent(db, sessionId, "test-key", bizItemId, "claude-sonnet-4-6");

    const result = await db
      .prepare("SELECT COUNT(*) as cnt FROM agent_improvement_proposals WHERE session_id = ?")
      .bind(sessionId)
      .first<{ cnt: number }>();

    // K1: proposals ≥ 1건 저장 확인
    expect(result?.cnt).toBeGreaterThan(0);

    const rubricRow = await db
      .prepare("SELECT rubric_score FROM agent_improvement_proposals WHERE session_id = ? LIMIT 1")
      .bind(sessionId)
      .first<{ rubric_score: number | null }>();

    // K2: rubric_score 저장 확인 (manual 경로와 동일)
    expect(rubricRow?.rubric_score).not.toBeNull();
  });
});
