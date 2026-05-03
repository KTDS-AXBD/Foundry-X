import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

// Mock agent-runner to avoid real LLM calls
vi.mock("../services/agent/agent-runner.js", () => ({
  createAgentRunner: () => ({
    type: "mock",
    execute: vi.fn().mockResolvedValue({
      status: "success",
      output: {
        analysis: JSON.stringify({
          type: "type_a",
          confidence: 0.85,
          turn1Answer: "레퍼런스 기반",
          turn2Answer: "자료 확보됨",
          turn3Answer: "차별화 수익",
          reasoning: "종합 판단",
          analysisWeights: { ref: 3, market: 1, competition: 3, derive: 3, select: 2, customer: 2, bm: 2 },
        }),
      },
      tokensUsed: 500,
      model: "mock",
      duration: 1000,
    }),
    isAvailable: () => Promise.resolve(true),
    supportsTaskType: () => true,
  }),
  createRoutedRunner: () => Promise.resolve({
    type: "mock",
    execute: vi.fn(),
    isAvailable: () => Promise.resolve(true),
    supportsTaskType: () => true,
  }),
}));

// Mock evaluator persona responses — return high scores for all personas
vi.mock("../core/shaping/services/biz-persona-evaluator.js", async () => {
  const actual = await vi.importActual<typeof import("../core/shaping/services/biz-persona-evaluator.js")>("../core/shaping/services/biz-persona-evaluator.js");
  return {
    ...actual,
    BizPersonaEvaluator: class {
      async evaluate() {
        return {
          verdict: "green" as const,
          avgScore: 7.5,
          totalConcerns: 1,
          warnings: [],
          scores: [
            { personaId: "strategy", personaName: "전략기획팀장", businessViability: 8, strategicFit: 8, customerValue: 7, techMarket: 8, execution: 7, financialFeasibility: 7, competitiveDiff: 8, scalability: 7, summary: "전략 적합", concerns: ["리스크1"] },
            { personaId: "sales", personaName: "영업총괄부장", businessViability: 7, strategicFit: 7, customerValue: 8, techMarket: 7, execution: 8, financialFeasibility: 7, competitiveDiff: 7, scalability: 8, summary: "영업 가능", concerns: [] },
            { personaId: "ap_biz", personaName: "AP사업본부장", businessViability: 8, strategicFit: 7, customerValue: 7, techMarket: 8, execution: 7, financialFeasibility: 8, competitiveDiff: 7, scalability: 7, summary: "기술 실현", concerns: [] },
            { personaId: "ai_tech", personaName: "AI기술본부장", businessViability: 7, strategicFit: 8, customerValue: 8, techMarket: 8, execution: 7, financialFeasibility: 7, competitiveDiff: 8, scalability: 8, summary: "AI 적합", concerns: [] },
            { personaId: "finance", personaName: "경영기획팀장", businessViability: 7, strategicFit: 7, customerValue: 7, techMarket: 7, execution: 7, financialFeasibility: 8, competitiveDiff: 7, scalability: 7, summary: "재무 타당", concerns: [] },
            { personaId: "security", personaName: "보안전략팀장", businessViability: 7, strategicFit: 7, customerValue: 7, techMarket: 7, execution: 8, financialFeasibility: 7, competitiveDiff: 7, scalability: 7, summary: "보안 양호", concerns: [] },
            { personaId: "partnership", personaName: "대외협력팀장", businessViability: 8, strategicFit: 7, customerValue: 7, techMarket: 7, execution: 7, financialFeasibility: 7, competitiveDiff: 8, scalability: 7, summary: "파트너십 가능", concerns: [] },
            { personaId: "product", personaName: "기술사업화PM", businessViability: 7, strategicFit: 8, customerValue: 8, techMarket: 7, execution: 8, financialFeasibility: 7, competitiveDiff: 7, scalability: 8, summary: "MVP 가능", concerns: [] },
          ],
        };
      }
    },
    EvaluationError: actual.EvaluationError,
  };
});

let env: ReturnType<typeof createTestEnv>;

function req(method: string, path: string, opts?: { body?: unknown; headers?: Record<string, string> }) {
  const url = `http://localhost${path}`;
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  };
  if (opts?.body) init.body = JSON.stringify(opts.body);
  return app.request(url, init, env);
}

function seedDb(sql: string) {
  (env.DB as any).prepare(sql).run();
}

// F539c: POST /api/biz-items가 fx-discovery로 이전됨 → 직접 DB 삽입으로 대체
function seedBizItem(id: string, title: string) {
  seedDb(`INSERT OR IGNORE INTO biz_items (id, org_id, title, source, status, created_by, created_at, updated_at) VALUES ('${id}', 'org_test', '${title}', 'field', 'draft', 'test-user', datetime('now'), datetime('now'))`);
}

const BIZ_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS biz_items (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL DEFAULT 'field',
    status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_item_classifications (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL UNIQUE,
    item_type TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.0,
    turn_1_answer TEXT,
    turn_2_answer TEXT,
    turn_3_answer TEXT,
    analysis_weights TEXT NOT NULL DEFAULT '{}',
    classified_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_evaluations (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL,
    verdict TEXT NOT NULL,
    avg_score REAL NOT NULL DEFAULT 0.0,
    total_concerns INTEGER NOT NULL DEFAULT 0,
    evaluated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_evaluation_scores (
    id TEXT PRIMARY KEY,
    evaluation_id TEXT NOT NULL,
    persona_id TEXT NOT NULL,
    business_viability REAL NOT NULL DEFAULT 0,
    strategic_fit REAL NOT NULL DEFAULT 0,
    customer_value REAL NOT NULL DEFAULT 0,
    tech_market REAL NOT NULL DEFAULT 0,
    execution REAL NOT NULL DEFAULT 0,
    financial_feasibility REAL NOT NULL DEFAULT 0,
    competitive_diff REAL NOT NULL DEFAULT 0,
    scalability REAL NOT NULL DEFAULT 0,
    summary TEXT,
    concerns TEXT NOT NULL DEFAULT '[]'
  );
`;

describe("BizItems Routes", () => {
  let authHeader: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    (env.DB as any).exec(BIZ_TABLES_SQL);
    seedDb("INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test', 'admin', datetime('now'), datetime('now'))");
    seedDb("INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')");
    authHeader = await createAuthHeaders();
  });

  // ─── POST /api/biz-items: F539c 이전 (fx-discovery에서 테스트) ───
  // POST /api/biz-items, GET /api/biz-items, GET /api/biz-items/:id 는
  // fx-discovery로 이전됨 (FX-REQ-578) — packages/fx-discovery/src/__tests__/biz-items.test.ts 참조

  it("POST /api/biz-items: unauthorized returns 401", async () => {
    // auth middleware는 라우트 핸들러 이전에 실행 → 404가 아닌 401 반환
    const res = await req("POST", "/api/biz-items", {
      body: { title: "Unauthorized Item" },
    });

    expect(res.status).toBe(401);
  });

  // ─── POST /api/biz-items/:id/classify ───

  it("POST /api/biz-items/:id/classify: classifies item", async () => {
    // F539c: POST /api/biz-items 이전됨 → 직접 DB 삽입
    const id = "classify-test-1";
    seedBizItem(id, "XX사 플랫폼 전환");

    const res = await req("POST", `/api/biz-items/${id}/classify`, {
      headers: authHeader,
      body: {},
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.itemType).toBe("type_a");
    expect(data.confidence).toBe(0.85);
    expect(data.turnAnswers).toBeDefined();
    expect(data.analysisWeights).toBeDefined();
  });

  it("POST /api/biz-items/:id/classify: returns 404 for non-existent item", async () => {
    const res = await req("POST", "/api/biz-items/nonexistent/classify", {
      headers: authHeader,
      body: {},
    });

    expect(res.status).toBe(404);
  });

  it("POST /api/biz-items/:id/classify: idempotent — returns cached result on re-classify", async () => {
    // F539c: POST /api/biz-items 이전됨 → 직접 DB 삽입
    const id = "classify-idempotent-1";
    seedBizItem(id, "Already Classified");

    // First classify
    const first = await req("POST", `/api/biz-items/${id}/classify`, { headers: authHeader, body: {} });
    const firstData = (await first.json()) as any;

    // Second classify → 200 with cached result (멱등)
    const res = await req("POST", `/api/biz-items/${id}/classify`, { headers: authHeader, body: {} });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.cached).toBe(true);
    expect(data.itemType).toBe(firstData.itemType);
  });

  // ─── POST /api/biz-items/:id/evaluate ───

  it("POST /api/biz-items/:id/evaluate: evaluates classified item", async () => {
    // F539c: POST /api/biz-items 이전됨 → 직접 DB 삽입 후 classify
    const id = "evaluate-test-1";
    seedBizItem(id, "Evaluate Me");
    await req("POST", `/api/biz-items/${id}/classify`, { headers: authHeader, body: {} });

    // Evaluate
    const res = await req("POST", `/api/biz-items/${id}/evaluate`, {
      headers: authHeader,
      body: {},
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.verdict).toBe("green");
    expect(data.avgScore).toBeGreaterThanOrEqual(7.0);
    expect(data.scores).toHaveLength(8);
  });

  it("POST /api/biz-items/:id/evaluate: returns 400 if not classified", async () => {
    // F539c: POST /api/biz-items 이전됨 → 직접 DB 삽입
    const id = "evaluate-unclassified-1";
    seedBizItem(id, "Not Classified");

    const res = await req("POST", `/api/biz-items/${id}/evaluate`, {
      headers: authHeader,
      body: {},
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toBe("CLASSIFICATION_REQUIRED");
  });

  // ─── GET /api/biz-items/:id/evaluation ───

  it("GET /api/biz-items/:id/evaluation: returns evaluation result", async () => {
    // F539c: POST /api/biz-items 이전됨 → 직접 DB 삽입 후 classify+evaluate
    const id = "evaluation-full-1";
    seedBizItem(id, "Full Flow");
    await req("POST", `/api/biz-items/${id}/classify`, { headers: authHeader, body: {} });
    await req("POST", `/api/biz-items/${id}/evaluate`, { headers: authHeader, body: {} });

    const res = await req("GET", `/api/biz-items/${id}/evaluation`, { headers: authHeader });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.verdict).toBe("green");
    expect(data.scores).toHaveLength(8);
    expect(data.bizItemId).toBe(id);
  });

  it("GET /api/biz-items/:id/evaluation: returns 404 if no evaluation", async () => {
    // F539c: POST /api/biz-items 이전됨 → 직접 DB 삽입
    const id = "evaluation-empty-1";
    seedBizItem(id, "No Eval");

    const res = await req("GET", `/api/biz-items/${id}/evaluation`, { headers: authHeader });

    expect(res.status).toBe(404);
  });
});
