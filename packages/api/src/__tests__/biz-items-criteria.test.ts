import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

// Mock agent-runner
vi.mock("../core/agent/services/agent-runner.js", () => ({
  createAgentRunner: () => ({
    type: "mock",
    execute: vi.fn().mockResolvedValue({
      status: "success",
      output: {
        analysis: JSON.stringify({
          startingPoint: "tech",
          confidence: 0.85,
          reasoning: "기술 기반 아이템",
        }),
      },
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
    confidence REAL NOT NULL DEFAULT 0.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    reasoning TEXT,
    needs_confirmation INTEGER NOT NULL DEFAULT 0,
    confirmed_by TEXT,
    confirmed_at TEXT,
    classified_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
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
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'in_progress', 'completed', 'needs_revision')),
    evidence TEXT,
    completed_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE,
    UNIQUE(biz_item_id, criterion_id)
  );
`;

function seedBizItem(id: string = "item-1") {
  seedDb(`INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
    VALUES ('${id}', 'org_test', 'AI 기반 보안', 'AI 보안 솔루션', 'field', 'draft', 'test-user', datetime('now'), datetime('now'))`);
}

function seedCriteria(bizItemId: string = "item-1") {
  for (let i = 1; i <= 9; i++) {
    seedDb(`INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
      VALUES ('dc-${i}', '${bizItemId}', ${i}, 'pending', datetime('now'))`);
  }
}

describe("BizItems Discovery Criteria Routes (F183)", () => {
  let authHeader: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    (env.DB as any).exec(BIZ_TABLES_SQL);
    seedDb("INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test', 'admin', datetime('now'), datetime('now'))");
    seedDb("INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')");
    authHeader = await createAuthHeaders();
  });

  // ─── GET /biz-items/:id/discovery-criteria ───

  it("GET /discovery-criteria — 미초기화 시 9개 pending", async () => {
    seedBizItem();
    const res = await req("GET", "/api/biz-items/item-1/discovery-criteria", { headers: authHeader });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.total).toBe(9);
    expect(body.pending).toBe(9);
    expect(body.gateStatus).toBe("blocked");
    expect(body.criteria).toHaveLength(9);
  });

  it("GET /discovery-criteria — 초기화 후 조회", async () => {
    seedBizItem();
    seedCriteria();
    const res = await req("GET", "/api/biz-items/item-1/discovery-criteria", { headers: authHeader });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.total).toBe(9);
    expect(body.criteria).toHaveLength(9);
    expect(body.criteria[0].name).toBeTruthy();
  });

  it("GET /discovery-criteria — 아이템 미존재 → 404", async () => {
    const res = await req("GET", "/api/biz-items/nonexistent/discovery-criteria", { headers: authHeader });
    expect(res.status).toBe(404);
  });

  // ─── PATCH /biz-items/:id/discovery-criteria/:criterionId ───

  it("PATCH /discovery-criteria/1 — 상태 업데이트", async () => {
    seedBizItem();
    seedCriteria();
    const res = await req("PATCH", "/api/biz-items/item-1/discovery-criteria/1", {
      headers: authHeader,
      body: { status: "completed", evidence: "고객 3개 세그먼트 정의" },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe("completed");
    expect(body.evidence).toBe("고객 3개 세그먼트 정의");
    expect(body.completedAt).toBeTruthy();
  });

  it("PATCH /discovery-criteria/0 — 범위 밖 → 400", async () => {
    seedBizItem();
    const res = await req("PATCH", "/api/biz-items/item-1/discovery-criteria/0", {
      headers: authHeader,
      body: { status: "completed" },
    });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBe("INVALID_CRITERION_ID");
  });

  it("PATCH /discovery-criteria/10 — 범위 밖 → 400", async () => {
    seedBizItem();
    const res = await req("PATCH", "/api/biz-items/item-1/discovery-criteria/10", {
      headers: authHeader,
      body: { status: "completed" },
    });
    expect(res.status).toBe(400);
  });

  it("PATCH /discovery-criteria — 잘못된 body → 400", async () => {
    seedBizItem();
    seedCriteria();
    const res = await req("PATCH", "/api/biz-items/item-1/discovery-criteria/1", {
      headers: authHeader,
      body: { status: "invalid_status" },
    });
    expect(res.status).toBe(400);
  });

  // ─── POST /starting-point → 9기준 자동 초기화 ───

  it("POST /starting-point → 9기준 자동 초기화 (F183 연동)", async () => {
    seedBizItem();
    // Classify starting point → triggers criteria initialization
    await req("POST", "/api/biz-items/item-1/starting-point", { headers: authHeader, body: {} });

    // Now check criteria are initialized
    const res = await req("GET", "/api/biz-items/item-1/discovery-criteria", { headers: authHeader });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.criteria).toHaveLength(9);
    expect(body.pending).toBe(9);
  });
});
