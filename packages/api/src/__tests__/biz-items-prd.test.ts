import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

// Mock agent-runner
vi.mock("../agent/services/agent-runner.js", () => ({
  createAgentRunner: () => ({
    type: "mock",
    execute: vi.fn().mockResolvedValue({
      status: "success",
      output: { analysis: "## 보강된 PRD\n전문적으로 다듬어진 내용" },
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
`;

function seedBizItem(id: string = "item-1") {
  seedDb(`INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
    VALUES ('${id}', 'org_test', 'AI 기반 보안', 'AI 보안 솔루션', 'field', 'draft', 'test-user', datetime('now'), datetime('now'))`);
}

function seedStartingPoint(bizItemId: string = "item-1") {
  seedDb(`INSERT INTO biz_item_starting_points (id, biz_item_id, starting_point, confidence, reasoning, needs_confirmation, classified_at)
    VALUES ('sp-1', '${bizItemId}', 'tech', 0.85, '기술 기반', 0, datetime('now'))`);
}

function seedCriteriaCompleted(bizItemId: string = "item-1", count: number = 9) {
  for (let i = 1; i <= count; i++) {
    const status = i <= count ? "completed" : "pending";
    seedDb(`INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at)
      VALUES ('dc-${i}', '${bizItemId}', ${i}, '${status}', '근거 ${i}', ${status === "completed" ? "datetime('now')" : "NULL"}, datetime('now'))`);
  }
  // Fill remaining as pending
  for (let i = count + 1; i <= 9; i++) {
    seedDb(`INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
      VALUES ('dc-${i}', '${bizItemId}', ${i}, 'pending', datetime('now'))`);
  }
}

describe("BizItems PRD Routes (F185)", () => {
  let authHeader: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    (env.DB as any).exec(BIZ_TABLES_SQL);
    seedDb("INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test', 'admin', datetime('now'), datetime('now'))");
    seedDb("INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')");
    authHeader = await createAuthHeaders();
  });

  // ─── POST /biz-items/:id/generate-prd ───

  it("POST /generate-prd — 게이트 blocked (< 7 completed) → 422", async () => {
    seedBizItem();
    seedStartingPoint();
    seedCriteriaCompleted("item-1", 5);

    const res = await req("POST", "/api/biz-items/item-1/generate-prd", {
      headers: authHeader,
      body: { skipLlmRefine: true },
    });
    expect(res.status).toBe(422);
    const body = await res.json() as any;
    expect(body.error).toBe("DISCOVERY_CRITERIA_NOT_MET");
    expect(body.gateStatus).toBe("blocked");
    expect(body.completedCount).toBe(5);
  });

  it("POST /generate-prd — 게이트 warning (7 completed) → 성공", async () => {
    seedBizItem();
    seedStartingPoint();
    seedCriteriaCompleted("item-1", 7);

    const res = await req("POST", "/api/biz-items/item-1/generate-prd", {
      headers: authHeader,
      body: { skipLlmRefine: true },
    });
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.version).toBe(1);
    expect(body.content).toContain("PRD");
  });

  it("POST /generate-prd — 게이트 ready (9 completed) + LLM skip", async () => {
    seedBizItem();
    seedStartingPoint();
    seedCriteriaCompleted("item-1", 9);

    const res = await req("POST", "/api/biz-items/item-1/generate-prd", {
      headers: authHeader,
      body: { skipLlmRefine: true },
    });
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.version).toBe(1);
    expect(body.content).toContain("# PRD — AI 기반 보안");
    expect(body.criteriaSnapshot).toBeTruthy();
  });

  it("POST /generate-prd — 시작점 미분류 → 404", async () => {
    seedBizItem();
    seedCriteriaCompleted("item-1", 9);

    const res = await req("POST", "/api/biz-items/item-1/generate-prd", {
      headers: authHeader,
      body: { skipLlmRefine: true },
    });
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe("STARTING_POINT_NOT_CLASSIFIED");
  });

  // ─── GET /biz-items/:id/prd ───

  it("GET /prd — PRD 없으면 404", async () => {
    seedBizItem();
    const res = await req("GET", "/api/biz-items/item-1/prd", { headers: authHeader });
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe("PRD_NOT_FOUND");
  });

  it("GET /prd — 생성 후 최신 버전 조회", async () => {
    seedBizItem();
    seedStartingPoint();
    seedCriteriaCompleted("item-1", 9);

    // Generate PRD
    await req("POST", "/api/biz-items/item-1/generate-prd", {
      headers: authHeader,
      body: { skipLlmRefine: true },
    });

    const res = await req("GET", "/api/biz-items/item-1/prd", { headers: authHeader });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.version).toBe(1);
    expect(body.content).toContain("PRD");
  });

  // ─── GET /biz-items/:id/prd/:version ───

  it("GET /prd/:version — 잘못된 버전 → 400", async () => {
    seedBizItem();
    const res = await req("GET", "/api/biz-items/item-1/prd/0", { headers: authHeader });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBe("INVALID_VERSION");
  });
});
