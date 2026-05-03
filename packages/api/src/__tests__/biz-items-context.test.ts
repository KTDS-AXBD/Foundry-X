import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

// Mock agent-runner
vi.mock("../agent/services/agent-runner.js", () => ({
  createAgentRunner: () => ({
    type: "mock",
    execute: vi.fn().mockResolvedValue({
      status: "success",
      output: { analysis: "{}" },
      tokensUsed: 100,
      model: "mock",
      duration: 500,
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
  CREATE TABLE IF NOT EXISTS biz_item_starting_points (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL UNIQUE,
    starting_point TEXT NOT NULL CHECK (starting_point IN ('idea', 'market', 'problem', 'tech', 'service')),
    confidence REAL NOT NULL DEFAULT 0.0,
    reasoning TEXT,
    needs_confirmation INTEGER NOT NULL DEFAULT 0,
    confirmed_by TEXT,
    confirmed_at TEXT,
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
  CREATE TABLE IF NOT EXISTS biz_discovery_criteria (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL,
    criterion_id INTEGER NOT NULL CHECK (criterion_id BETWEEN 1 AND 9),
    status TEXT NOT NULL DEFAULT 'pending',
    evidence TEXT,
    completed_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(biz_item_id, criterion_id)
  );
  CREATE TABLE IF NOT EXISTS biz_analysis_contexts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL,
    step_order INTEGER NOT NULL,
    pm_skill TEXT NOT NULL,
    input_summary TEXT,
    output_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

function seedBizItem(id: string = "item-1") {
  seedDb(`INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
    VALUES ('${id}', 'org_test', 'AI 기반 보안', 'AI 보안 솔루션', 'field', 'draft', 'test-user', datetime('now'), datetime('now'))`);
}

function seedStartingPoint(bizItemId: string = "item-1") {
  seedDb(`INSERT INTO biz_item_starting_points (id, biz_item_id, starting_point, confidence, reasoning, needs_confirmation, classified_at)
    VALUES ('sp-1', '${bizItemId}', 'tech', 0.85, '기술 기반', 0, datetime('now'))`);
}

function seedCriteria(bizItemId: string = "item-1") {
  for (let i = 1; i <= 9; i++) {
    seedDb(`INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
      VALUES ('dc-${i}', '${bizItemId}', ${i}, 'pending', datetime('now'))`);
  }
}

describe("BizItems Analysis Context Routes (F184)", () => {
  let authHeader: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    (env.DB as any).exec(BIZ_TABLES_SQL);
    seedDb("INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test', 'admin', datetime('now'), datetime('now'))");
    seedDb("INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')");
    authHeader = await createAuthHeaders();
  });

  // ─── POST /biz-items/:id/analysis-context ───

  it("POST /analysis-context — 저장 성공", async () => {
    seedBizItem();
    const res = await req("POST", "/api/biz-items/item-1/analysis-context", {
      headers: authHeader,
      body: {
        stepOrder: 1,
        pmSkill: "/interview",
        inputSummary: "고객 인터뷰 요청",
        outputText: "인터뷰 결과: Pain Point는 수작업 비효율",
      },
    });
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.id).toBeTruthy();
    expect(body.stepOrder).toBe(1);
    expect(body.pmSkill).toBe("/interview");
    expect(body.outputText).toContain("Pain Point");
  });

  it("POST /analysis-context — suggestedCriteria 포함 (시작점 있을 때)", async () => {
    seedBizItem();
    seedStartingPoint();
    seedCriteria();

    const res = await req("POST", "/api/biz-items/item-1/analysis-context", {
      headers: authHeader,
      body: {
        stepOrder: 2,
        pmSkill: "/market-scan",
        outputText: "시장 규모 분석 결과",
      },
    });
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.suggestedCriteria).toBeDefined();
    expect(Array.isArray(body.suggestedCriteria)).toBe(true);
  });

  it("POST /analysis-context — 아이템 미존재 → 404", async () => {
    const res = await req("POST", "/api/biz-items/nonexistent/analysis-context", {
      headers: authHeader,
      body: { stepOrder: 1, pmSkill: "/test", outputText: "test" },
    });
    expect(res.status).toBe(404);
  });

  it("POST /analysis-context — 잘못된 body → 400", async () => {
    seedBizItem();
    const res = await req("POST", "/api/biz-items/item-1/analysis-context", {
      headers: authHeader,
      body: { stepOrder: 0 },
    });
    expect(res.status).toBe(400);
  });

  // ─── GET /biz-items/:id/analysis-context ───

  it("GET /analysis-context — 목록 조회", async () => {
    seedBizItem();
    // Insert contexts directly
    seedDb(`INSERT INTO biz_analysis_contexts (id, biz_item_id, step_order, pm_skill, output_text, created_at)
      VALUES ('ctx-1', 'item-1', 1, '/interview', '결과 1', datetime('now'))`);
    seedDb(`INSERT INTO biz_analysis_contexts (id, biz_item_id, step_order, pm_skill, output_text, created_at)
      VALUES ('ctx-2', 'item-1', 2, '/market-scan', '결과 2', datetime('now'))`);

    const res = await req("GET", "/api/biz-items/item-1/analysis-context", { headers: authHeader });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.contexts).toHaveLength(2);
    expect(body.contexts[0].stepOrder).toBe(1);
  });

  it("GET /analysis-context — 빈 목록", async () => {
    seedBizItem();
    const res = await req("GET", "/api/biz-items/item-1/analysis-context", { headers: authHeader });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.contexts).toHaveLength(0);
  });

  // ─── GET /biz-items/:id/next-guide ───

  it("GET /next-guide — 정상 (시작점 분류 후)", async () => {
    seedBizItem();
    seedStartingPoint();

    const res = await req("GET", "/api/biz-items/item-1/next-guide", { headers: authHeader });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.currentStep).toBe(0);
    expect(body.nextStep).toBeDefined();
    expect(body.nextStep.order).toBe(1);
    expect(body.isLastStep).toBe(false);
  });

  it("GET /next-guide — 시작점 미분류 → 404", async () => {
    seedBizItem();
    const res = await req("GET", "/api/biz-items/item-1/next-guide", { headers: authHeader });
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe("STARTING_POINT_NOT_CLASSIFIED");
  });
});
