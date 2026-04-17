import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { axBdProgressRoute } from "../core/shaping/routes/ax-bd-progress.js";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, plan TEXT NOT NULL DEFAULT 'free', settings TEXT NOT NULL DEFAULT '{}');
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', password_hash TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS biz_items (id TEXT PRIMARY KEY, org_id TEXT, title TEXT, description TEXT, source TEXT, status TEXT, created_by TEXT, created_at TEXT, updated_at TEXT);
  CREATE TABLE IF NOT EXISTS pipeline_stages (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
    stage TEXT NOT NULL, entered_at TEXT NOT NULL DEFAULT (datetime('now')),
    exited_at TEXT, entered_by TEXT NOT NULL, notes TEXT
  );
  CREATE TABLE IF NOT EXISTS ax_viability_checkpoints (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
    stage TEXT NOT NULL, decision TEXT NOT NULL, question TEXT NOT NULL,
    reason TEXT, decided_by TEXT NOT NULL, decided_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(biz_item_id, stage)
  );
  CREATE TABLE IF NOT EXISTS ax_commit_gates (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
    question_1_answer TEXT, question_2_answer TEXT, question_3_answer TEXT, question_4_answer TEXT,
    final_decision TEXT NOT NULL, decided_by TEXT NOT NULL,
    decided_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
    decision TEXT NOT NULL, stage TEXT NOT NULL, comment TEXT NOT NULL,
    decided_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS bd_artifacts (
    id TEXT PRIMARY KEY, org_id TEXT NOT NULL, biz_item_id TEXT NOT NULL,
    skill_id TEXT NOT NULL, stage_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    input_text TEXT NOT NULL, output_text TEXT, model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
    tokens_used INTEGER DEFAULT 0, duration_ms INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const SEED = `
  INSERT INTO organizations (id, name, slug) VALUES ('org1', 'Test Org', 'test-org');
  INSERT INTO users (id, email, name, created_at, updated_at) VALUES ('user1', 'test@test.com', 'Tester', '2026-01-01', '2026-01-01');
  INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
    VALUES ('biz1', 'org1', 'AI Chatbot', 'AI chatbot desc', 'discovery', 'draft', 'user1', '2026-01-01', '2026-01-01');
  INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, exited_at, entered_by)
    VALUES ('ps1', 'biz1', 'org1', 'DISCOVERY', '2026-03-01', NULL, 'user1');
`;

function createApp(db: D1Database) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org1");
    c.set("userId" as never, "user1");
    c.env = { DB: db } as never;
    await next();
  });
  app.route("/", axBdProgressRoute);
  return app;
}

describe("ax-bd-progress route", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(SCHEMA);
    (db as any).exec(SEED);
    app = createApp(db as unknown as D1Database);
  });

  it("GET /ax-bd/progress/:bizItemId returns item progress", async () => {
    const res = await app.request("/ax-bd/progress/biz1");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.bizItemId).toBe("biz1");
    expect(body.pipelineStage).toBe("DISCOVERY");
    expect(body.totalStageCount).toBe(11);
    expect((body.trafficLight as Record<string, unknown>).overallSignal).toBe("green");
  });

  it("GET /ax-bd/progress/:bizItemId returns 404 for missing item", async () => {
    const res = await app.request("/ax-bd/progress/nonexistent");
    expect(res.status).toBe(404);
  });

  it("GET /ax-bd/progress returns portfolio with summary", async () => {
    const res = await app.request("/ax-bd/progress");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.items).toHaveLength(1);
    expect(body.summary).toBeDefined();
    expect((body.summary as Record<string, unknown>).totalItems).toBe(1);
  });

  it("GET /ax-bd/progress?signal=red filters by signal", async () => {
    (db as any).exec(`
      INSERT INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, decided_by, decided_at)
        VALUES ('cp1', 'biz1', 'org1', '2-1', 'drop', 'Bad market', 'user1', '2026-03-10');
    `);

    const redRes = await app.request("/ax-bd/progress?signal=red");
    expect(redRes.status).toBe(200);
    const redBody = (await redRes.json()) as Record<string, unknown>;
    expect(redBody.items).toHaveLength(1);

    const greenRes = await app.request("/ax-bd/progress?signal=green");
    expect(greenRes.status).toBe(200);
    const greenBody = (await greenRes.json()) as Record<string, unknown>;
    expect(greenBody.items).toHaveLength(0);
  });

  it("GET /ax-bd/progress/summary returns summary only", async () => {
    const res = await app.request("/ax-bd/progress/summary");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.totalItems).toBe(1);
    expect(body.bySignal).toBeDefined();
  });
});
