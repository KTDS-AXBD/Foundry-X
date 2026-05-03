import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

// Mock agent-runner
vi.mock("../agent/services/agent-runner.js", () => ({
  createAgentRunner: () => ({
    type: "mock",
    execute: vi.fn().mockResolvedValue({
      status: "success",
      output: { analysis: "## 분석 결과\n- 핵심 이슈: 시장 검증 필요\n- 데이터 부족으로 판단 보류" },
      tokensUsed: 50,
      model: "mock",
      duration: 200,
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
  CREATE TABLE IF NOT EXISTS biz_generated_prds (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    criteria_snapshot TEXT,
    generated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sixhats_debates (
    id TEXT PRIMARY KEY,
    prd_id TEXT NOT NULL,
    biz_item_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    total_turns INTEGER NOT NULL DEFAULT 20,
    completed_turns INTEGER NOT NULL DEFAULT 0,
    key_issues TEXT,
    summary TEXT,
    model TEXT NOT NULL,
    total_tokens INTEGER DEFAULT 0,
    duration_seconds REAL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    org_id TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sixhats_turns (
    id TEXT PRIMARY KEY,
    debate_id TEXT NOT NULL,
    turn_number INTEGER NOT NULL CHECK (turn_number BETWEEN 1 AND 20),
    hat TEXT NOT NULL CHECK (hat IN ('white', 'red', 'black', 'yellow', 'green', 'blue')),
    hat_label TEXT NOT NULL,
    content TEXT NOT NULL,
    tokens INTEGER DEFAULT 0,
    duration_seconds REAL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(debate_id, turn_number)
  );
`;

function seedBizItem(id = "item-1") {
  seedDb(`INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
    VALUES ('${id}', 'org_test', 'AI 보안', 'AI 보안 솔루션', 'field', 'draft', 'test-user', datetime('now'), datetime('now'))`);
}

function seedPrd(prdId = "prd-1", bizItemId = "item-1") {
  seedDb(`INSERT INTO biz_generated_prds (id, biz_item_id, version, content)
    VALUES ('${prdId}', '${bizItemId}', 1, '# PRD — AI 기반 보안 솔루션')`);
}

describe("BizItems SixHats Routes (F188)", () => {
  let authHeader: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    (env.DB as any).exec(BIZ_TABLES_SQL);
    seedDb("INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test', 'admin', datetime('now'), datetime('now'))");
    seedDb("INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')");
    authHeader = await createAuthHeaders();
  });

  // ─── POST /biz-items/:id/prd/:prdId/sixhats ───

  it("POST sixhats — 성공 시 201 + completed", async () => {
    seedBizItem();
    seedPrd();

    const res = await req("POST", "/api/biz-items/item-1/prd/prd-1/sixhats", {
      headers: authHeader,
    });
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.status).toBe("completed");
    expect(body.totalTurns).toBe(20);
    expect(body.turns).toHaveLength(20);
    expect(body.prdId).toBe("prd-1");
    expect(body.bizItemId).toBe("item-1");
  });

  it("POST sixhats — BizItem 없으면 404", async () => {
    const res = await req("POST", "/api/biz-items/nonexistent/prd/prd-1/sixhats", {
      headers: authHeader,
    });
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe("BIZ_ITEM_NOT_FOUND");
  });

  it("POST sixhats — PRD 없으면 404", async () => {
    seedBizItem();

    const res = await req("POST", "/api/biz-items/item-1/prd/nonexistent/sixhats", {
      headers: authHeader,
    });
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe("PRD_NOT_FOUND");
  });

  // ─── GET /biz-items/:id/prd/:prdId/sixhats ───

  it("GET sixhats list — 토론 목록 조회", async () => {
    seedBizItem();
    seedPrd();

    // 토론 1개 생성
    await req("POST", "/api/biz-items/item-1/prd/prd-1/sixhats", { headers: authHeader });

    const res = await req("GET", "/api/biz-items/item-1/prd/prd-1/sixhats", {
      headers: authHeader,
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.debates).toHaveLength(1);
    expect(body.debates[0].prdId).toBe("prd-1");
  });

  it("GET sixhats list — 토론 없으면 빈 배열", async () => {
    seedBizItem();
    seedPrd();

    const res = await req("GET", "/api/biz-items/item-1/prd/prd-1/sixhats", {
      headers: authHeader,
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.debates).toHaveLength(0);
  });

  // ─── GET /biz-items/:id/prd/:prdId/sixhats/:debateId ───

  it("GET sixhats detail — 상세 조회", async () => {
    seedBizItem();
    seedPrd();

    const createRes = await req("POST", "/api/biz-items/item-1/prd/prd-1/sixhats", { headers: authHeader });
    const created = await createRes.json() as any;

    const res = await req("GET", `/api/biz-items/item-1/prd/prd-1/sixhats/${created.id}`, {
      headers: authHeader,
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.id).toBe(created.id);
    expect(body.turns).toHaveLength(20);
  });

  it("GET sixhats detail — 없는 debateId → 404", async () => {
    seedBizItem();
    seedPrd();

    const res = await req("GET", "/api/biz-items/item-1/prd/prd-1/sixhats/nonexistent", {
      headers: authHeader,
    });
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe("DEBATE_NOT_FOUND");
  });
});
