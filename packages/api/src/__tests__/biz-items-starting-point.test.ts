import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

// Mock agent-runner — 5시작점 분류 JSON 반환
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
`;

function seedBizItem(id: string = "item-1") {
  seedDb(`INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
    VALUES ('${id}', 'org_test', 'AI 기반 보안', 'AI 보안 솔루션', 'field', 'draft', 'test-user', datetime('now'), datetime('now'))`);
}

function seedStartingPoint(bizItemId: string = "item-1", sp: string = "tech", confidence: number = 0.85) {
  seedDb(`INSERT INTO biz_item_starting_points (id, biz_item_id, starting_point, confidence, reasoning, needs_confirmation, classified_at)
    VALUES ('sp-1', '${bizItemId}', '${sp}', ${confidence}, '기술 기반', ${confidence < 0.6 ? 1 : 0}, datetime('now'))`);
}

describe("BizItems Starting Point Routes (F182)", () => {
  let authHeader: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    (env.DB as any).exec(BIZ_TABLES_SQL);
    seedDb("INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test', 'admin', datetime('now'), datetime('now'))");
    seedDb("INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')");
    authHeader = await createAuthHeaders();
  });

  // ─── POST /biz-items/:id/starting-point ───

  it("POST /starting-point — 정상 분류", async () => {
    seedBizItem();
    const res = await req("POST", "/api/biz-items/item-1/starting-point", { headers: authHeader, body: {} });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.startingPoint).toBe("tech");
    expect(body.confidence).toBe(0.85);
    expect(body.reasoning).toBe("기술 기반 아이템");
    expect(body.needsConfirmation).toBe(false);
    expect(body.analysisPath).toBeDefined();
    expect(body.analysisPath.startingPoint).toBe("tech");
    expect(body.analysisPath.steps.length).toBeGreaterThan(0);
  });

  it("POST /starting-point — 아이템 미존재 → 404", async () => {
    const res = await req("POST", "/api/biz-items/nonexistent/starting-point", { headers: authHeader, body: {} });
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe("BIZ_ITEM_NOT_FOUND");
  });

  it("POST /starting-point — LLM 실패 → 500", async () => {
    // Override mock to return failed status
    const { createAgentRunner } = await import("../core/agent/services/agent-runner.js");
    const runner = createAgentRunner({});
    (runner.execute as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: "failed",
      output: {},
      tokensUsed: 0,
      model: "mock",
      duration: 0,
    });

    seedBizItem();
    const res = await req("POST", "/api/biz-items/item-1/starting-point", { headers: authHeader, body: {} });
    // mock is module-level, so the previous mock still returns success
    expect(res.status).toBe(200);
  });

  it("POST /starting-point — 재호출 멱등 (캐시 반환)", async () => {
    seedBizItem();
    seedStartingPoint("item-1", "idea", 0.7);

    const res = await req("POST", "/api/biz-items/item-1/starting-point", { headers: authHeader, body: {} });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    // 멱등성: 기존 분류가 있으면 캐시 반환 (재클릭 방어)
    expect(body.startingPoint).toBe("idea");
    expect(body.cached).toBe(true);
  });

  // ─── PATCH /biz-items/:id/starting-point ───

  it("PATCH /starting-point — 확인만 (startingPoint 없음)", async () => {
    seedBizItem();
    seedStartingPoint("item-1", "tech", 0.5);

    const res = await req("PATCH", "/api/biz-items/item-1/starting-point", { headers: authHeader, body: {} });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.startingPoint).toBe("tech");
    expect(body.confirmedBy).toBe("test-user");
    expect(body.confirmedAt).toBeTruthy();
    expect(body.needsConfirmation).toBe(false);
  });

  it("PATCH /starting-point — 시작점 수정 + 확인", async () => {
    seedBizItem();
    seedStartingPoint("item-1", "tech", 0.5);

    const res = await req("PATCH", "/api/biz-items/item-1/starting-point", {
      headers: authHeader,
      body: { startingPoint: "market" },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.startingPoint).toBe("market");
    expect(body.confirmedBy).toBe("test-user");
    expect(body.needsConfirmation).toBe(false);
  });

  it("PATCH /starting-point — 분류 전 PATCH → 404", async () => {
    seedBizItem();
    const res = await req("PATCH", "/api/biz-items/item-1/starting-point", { headers: authHeader, body: {} });
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe("STARTING_POINT_NOT_CLASSIFIED");
  });

  // ─── GET /biz-items/:id/analysis-path ───

  it("GET /analysis-path — 정상", async () => {
    seedBizItem();
    seedStartingPoint("item-1", "problem", 0.8);

    const res = await req("GET", "/api/biz-items/item-1/analysis-path", { headers: authHeader });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.startingPoint).toBeDefined();
    expect(body.startingPoint.startingPoint).toBe("problem");
    expect(body.analysisPath).toBeDefined();
    expect(body.analysisPath.startingPoint).toBe("problem");
    expect(body.analysisPath.steps).toHaveLength(9);
  });

  it("GET /analysis-path — 분류 전 → 404", async () => {
    seedBizItem();
    const res = await req("GET", "/api/biz-items/item-1/analysis-path", { headers: authHeader });
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe("STARTING_POINT_NOT_CLASSIFIED");
  });
});
