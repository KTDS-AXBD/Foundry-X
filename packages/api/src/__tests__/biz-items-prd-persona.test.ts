import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

const SCORE_JSON = JSON.stringify({
  businessViability: 7,
  strategicFit: 8,
  customerValue: 7,
  techMarket: 6,
  execution: 7,
  financialFeasibility: 6,
  competitiveDiff: 8,
  scalability: 7,
  summary: "사업성 양호",
  concerns: ["시장 진입 장벽"],
});

// Mock agent-runner
vi.mock("../agent/services/agent-runner.js", () => ({
  createAgentRunner: () => ({
    type: "mock",
    execute: vi.fn().mockResolvedValue({
      status: "success",
      output: { analysis: SCORE_JSON },
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
  CREATE TABLE IF NOT EXISTS biz_generated_prds (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    criteria_snapshot TEXT,
    generated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS prd_persona_evaluations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    prd_id TEXT NOT NULL,
    biz_item_id TEXT NOT NULL,
    persona_id TEXT NOT NULL,
    persona_name TEXT NOT NULL,
    business_viability INTEGER NOT NULL,
    strategic_fit INTEGER NOT NULL,
    customer_value INTEGER NOT NULL,
    tech_market INTEGER NOT NULL,
    execution INTEGER NOT NULL,
    financial_feasibility INTEGER NOT NULL,
    competitive_diff INTEGER NOT NULL,
    scalability INTEGER NOT NULL,
    summary TEXT NOT NULL,
    concerns TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    org_id TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS prd_persona_verdicts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    prd_id TEXT NOT NULL,
    verdict TEXT NOT NULL,
    avg_score REAL NOT NULL,
    total_concerns INTEGER NOT NULL,
    warnings TEXT NOT NULL,
    evaluation_count INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

function seedBizItem(id: string = "item-1") {
  seedDb(`INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
    VALUES ('${id}', 'org_test', 'AI 기반 보안', 'AI 보안 솔루션', 'field', 'draft', 'test-user', datetime('now'), datetime('now'))`);
}

function seedPrd(bizItemId: string = "item-1", prdId: string = "prd-1") {
  seedDb(`INSERT INTO biz_generated_prds (id, biz_item_id, version, content, generated_at)
    VALUES ('${prdId}', '${bizItemId}', 1, '# PRD — AI 기반 보안\n\n## 1. 요약\nAI 보안 솔루션', datetime('now'))`);
}

describe("BizItems PRD Persona Routes (F187)", () => {
  let authHeader: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    (env.DB as any).exec(BIZ_TABLES_SQL);
    seedDb("INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test', 'admin', datetime('now'), datetime('now'))");
    seedDb("INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')");
    authHeader = await createAuthHeaders();
  });

  // ─── POST /biz-items/:id/prd/:prdId/persona-evaluate ───

  it("POST persona-evaluate — 아이템 404", async () => {
    const res = await req("POST", "/api/biz-items/nonexistent/prd/prd-1/persona-evaluate", {
      headers: authHeader,
    });
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe("BIZ_ITEM_NOT_FOUND");
  });

  it("POST persona-evaluate — PRD 404", async () => {
    seedBizItem();
    const res = await req("POST", "/api/biz-items/item-1/prd/nonexistent/persona-evaluate", {
      headers: authHeader,
    });
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe("PRD_NOT_FOUND");
  });

  it("POST persona-evaluate — 성공 201", async () => {
    seedBizItem();
    seedPrd();

    const res = await req("POST", "/api/biz-items/item-1/prd/prd-1/persona-evaluate", {
      headers: authHeader,
    });
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.verdictId).toBeTruthy();
    expect(body.prdId).toBe("prd-1");
    expect(body.bizItemId).toBe("item-1");
    expect(["green", "keep", "red"]).toContain(body.verdict);
    expect(body.scores).toHaveLength(8);
    expect(body.avgScore).toBeGreaterThan(0);
    expect(body.scores[0].personaId).toBeTruthy();
    expect(body.scores[0].businessViability).toBe(7);
  });

  // ─── GET /biz-items/:id/prd/:prdId/persona-evaluations ───

  it("GET persona-evaluations — 결과 없음 404", async () => {
    seedBizItem();
    const res = await req("GET", "/api/biz-items/item-1/prd/prd-1/persona-evaluations", {
      headers: authHeader,
    });
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe("PERSONA_EVALUATIONS_NOT_FOUND");
  });

  it("GET persona-evaluations — 평가 후 결과 조회 200", async () => {
    seedBizItem();
    seedPrd();

    // 먼저 평가 실행
    const evalRes = await req("POST", "/api/biz-items/item-1/prd/prd-1/persona-evaluate", {
      headers: authHeader,
    });
    expect(evalRes.status).toBe(201);

    // 조회
    const res = await req("GET", "/api/biz-items/item-1/prd/prd-1/persona-evaluations", {
      headers: authHeader,
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.evaluations).toHaveLength(8);
    expect(body.verdict).not.toBeNull();
    expect(body.verdict.verdict).toBeTruthy();
    expect(body.verdict.avgScore).toBeGreaterThan(0);
  });
});
