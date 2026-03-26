import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

// Mock agent-runner
vi.mock("../services/agent-runner.js", () => ({
  createAgentRunner: () => ({
    type: "mock",
    execute: vi.fn().mockResolvedValue({
      status: "success",
      output: { analysis: "## 보강된 사업계획서\n전문적으로 다듬어진 내용" },
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

const TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS biz_items (
    id TEXT PRIMARY KEY, org_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT,
    source TEXT NOT NULL DEFAULT 'field', status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_item_classifications (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL UNIQUE, item_type TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.0, turn_1_answer TEXT, turn_2_answer TEXT,
    turn_3_answer TEXT, analysis_weights TEXT NOT NULL DEFAULT '{}',
    classified_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_item_starting_points (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL UNIQUE,
    starting_point TEXT NOT NULL CHECK (starting_point IN ('idea','market','problem','tech','service')),
    confidence REAL NOT NULL DEFAULT 0.0, reasoning TEXT, needs_confirmation INTEGER NOT NULL DEFAULT 0,
    confirmed_by TEXT, confirmed_at TEXT, classified_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_evaluations (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, verdict TEXT NOT NULL,
    avg_score REAL NOT NULL DEFAULT 0.0, total_concerns INTEGER NOT NULL DEFAULT 0,
    evaluated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_evaluation_scores (
    id TEXT PRIMARY KEY, evaluation_id TEXT NOT NULL, persona_id TEXT NOT NULL,
    business_viability REAL NOT NULL DEFAULT 0, strategic_fit REAL NOT NULL DEFAULT 0,
    customer_value REAL NOT NULL DEFAULT 0, tech_market REAL NOT NULL DEFAULT 0,
    execution REAL NOT NULL DEFAULT 0, financial_feasibility REAL NOT NULL DEFAULT 0,
    competitive_diff REAL NOT NULL DEFAULT 0, scalability REAL NOT NULL DEFAULT 0,
    summary TEXT, concerns TEXT NOT NULL DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS biz_discovery_criteria (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL, criterion_id INTEGER NOT NULL CHECK (criterion_id BETWEEN 1 AND 9),
    status TEXT NOT NULL DEFAULT 'pending', evidence TEXT, completed_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(biz_item_id, criterion_id)
  );
  CREATE TABLE IF NOT EXISTS biz_analysis_contexts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL, step_order INTEGER NOT NULL, pm_skill TEXT NOT NULL,
    input_summary TEXT, output_text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_generated_prds (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL, criteria_snapshot TEXT, generated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_item_trend_reports (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL, market_summary TEXT, market_size_estimate TEXT,
    competitors TEXT, trends TEXT, keywords_used TEXT, model_used TEXT,
    tokens_used INTEGER DEFAULT 0, analyzed_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT
  );
  CREATE TABLE IF NOT EXISTS business_plan_drafts (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL, sections_snapshot TEXT, model_used TEXT, tokens_used INTEGER DEFAULT 0,
    generated_at TEXT NOT NULL, UNIQUE(biz_item_id, version)
  );
  CREATE TABLE IF NOT EXISTS prototypes (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    format TEXT NOT NULL DEFAULT 'html', content TEXT NOT NULL, template_used TEXT,
    model_used TEXT, tokens_used INTEGER DEFAULT 0,
    generated_at TEXT NOT NULL, UNIQUE(biz_item_id, version)
  );
`;

function seedBizItem(id: string = "item-1") {
  seedDb(`INSERT INTO biz_items (id, org_id, title, description, source, status, created_by) VALUES ('${id}', 'org_test', 'AI 보안 솔루션', 'AI 기반 보안', 'field', 'draft', 'test-user')`);
}

function seedClassification(bizItemId: string = "item-1") {
  seedDb(`INSERT INTO biz_item_classifications (id, biz_item_id, item_type, confidence, analysis_weights) VALUES ('cls-1', '${bizItemId}', 'type_a', 0.9, '{}')`);
}

function seedStartingPoint(bizItemId: string = "item-1") {
  seedDb(`INSERT INTO biz_item_starting_points (id, biz_item_id, starting_point, confidence, reasoning, needs_confirmation) VALUES ('sp-1', '${bizItemId}', 'tech', 0.85, '기술 기반', 0)`);
}

describe("BizItems Business Plan Routes (F180)", () => {
  let authHeader: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    (env.DB as any).exec(TABLES_SQL);
    seedDb("INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test', 'admin', datetime('now'), datetime('now'))");
    seedDb("INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')");
    seedDb("INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org_test', 'test-user', 'owner')");
    authHeader = await createAuthHeaders({ sub: "test-user" });
  });

  it("POST /generate-business-plan — 성공", async () => {
    seedBizItem();
    seedClassification();
    const res = await req("POST", "/api/biz-items/item-1/generate-business-plan", {
      headers: authHeader,
      body: { skipLlmRefine: true },
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as any as any;
    expect(data.bizItemId).toBe("item-1");
    expect(data.version).toBe(1);
    expect(data.content).toContain("사업계획서 초안");
  });

  it("POST /generate-business-plan — 404 item not found", async () => {
    const res = await req("POST", "/api/biz-items/no-exist/generate-business-plan", {
      headers: authHeader,
      body: { skipLlmRefine: true },
    });
    expect(res.status).toBe(404);
  });

  it("POST /generate-business-plan — 400 미분류", async () => {
    seedBizItem();
    const res = await req("POST", "/api/biz-items/item-1/generate-business-plan", {
      headers: authHeader,
      body: { skipLlmRefine: true },
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as any as any;
    expect(data.error).toBe("CLASSIFICATION_REQUIRED");
  });

  it("GET /business-plan — 최신 사업계획서 조회", async () => {
    seedBizItem();
    seedClassification();
    await req("POST", "/api/biz-items/item-1/generate-business-plan", {
      headers: authHeader,
      body: { skipLlmRefine: true },
    });

    const res = await req("GET", "/api/biz-items/item-1/business-plan", { headers: authHeader });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any as any;
    expect(data.version).toBe(1);
  });

  it("GET /business-plan — 404 미생성", async () => {
    seedBizItem();
    const res = await req("GET", "/api/biz-items/item-1/business-plan", { headers: authHeader });
    expect(res.status).toBe(404);
  });

  it("GET /business-plan/versions — 버전 목록", async () => {
    seedBizItem();
    seedClassification();
    await req("POST", "/api/biz-items/item-1/generate-business-plan", { headers: authHeader, body: { skipLlmRefine: true } });
    await req("POST", "/api/biz-items/item-1/generate-business-plan", { headers: authHeader, body: { skipLlmRefine: true } });

    const res = await req("GET", "/api/biz-items/item-1/business-plan/versions", { headers: authHeader });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any as any;
    expect(data.versions).toHaveLength(2);
  });
});

describe("BizItems Prototype Routes (F181)", () => {
  let authHeader: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    (env.DB as any).exec(TABLES_SQL);
    seedDb("INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test', 'admin', datetime('now'), datetime('now'))");
    seedDb("INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')");
    seedDb("INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org_test', 'test-user', 'owner')");
    authHeader = await createAuthHeaders({ sub: "test-user" });
  });

  it("POST /generate-prototype — 성공", async () => {
    seedBizItem();
    seedClassification();
    seedStartingPoint();
    const res = await req("POST", "/api/biz-items/item-1/generate-prototype", {
      headers: authHeader,
      body: {},
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as any as any;
    expect(data.bizItemId).toBe("item-1");
    expect(data.format).toBe("html");
    expect(data.templateUsed).toBe("tech");
    expect(data.content).toContain("<!DOCTYPE html>");
  });

  it("POST /generate-prototype — 400 시작점 미분류", async () => {
    seedBizItem();
    seedClassification();
    const res = await req("POST", "/api/biz-items/item-1/generate-prototype", {
      headers: authHeader,
      body: {},
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as any as any;
    expect(data.error).toBe("STARTING_POINT_REQUIRED");
  });

  it("POST /generate-prototype — template 오버라이드", async () => {
    seedBizItem();
    seedClassification();
    seedStartingPoint();
    const res = await req("POST", "/api/biz-items/item-1/generate-prototype", {
      headers: authHeader,
      body: { template: "market" },
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as any as any;
    expect(data.templateUsed).toBe("market");
  });

  it("GET /prototype — 최신 조회", async () => {
    seedBizItem();
    seedClassification();
    seedStartingPoint();
    await req("POST", "/api/biz-items/item-1/generate-prototype", { headers: authHeader, body: {} });

    const res = await req("GET", "/api/biz-items/item-1/prototype", { headers: authHeader });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any as any;
    expect(data.format).toBe("html");
  });

  it("GET /prototype — 404 미생성", async () => {
    seedBizItem();
    const res = await req("GET", "/api/biz-items/item-1/prototype", { headers: authHeader });
    expect(res.status).toBe(404);
  });

  it("GET /prototype/preview — HTML 직접 렌더링", async () => {
    seedBizItem();
    seedClassification();
    seedStartingPoint();
    await req("POST", "/api/biz-items/item-1/generate-prototype", { headers: authHeader, body: {} });

    const res = await req("GET", "/api/biz-items/item-1/prototype/preview", { headers: authHeader });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("GET /prototype/preview — 404 미생성", async () => {
    seedBizItem();
    const res = await req("GET", "/api/biz-items/item-1/prototype/preview", { headers: authHeader });
    expect(res.status).toBe(404);
  });
});
