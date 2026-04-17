import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { axBdArtifactsRoute } from "../core/discovery/routes/ax-bd-artifacts.js";

const TABLES = `
  CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, plan TEXT NOT NULL DEFAULT 'free', settings TEXT NOT NULL DEFAULT '{}');
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', password_hash TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS biz_items (id TEXT PRIMARY KEY, org_id TEXT, title TEXT, description TEXT, source TEXT, status TEXT, created_by TEXT, created_at TEXT, updated_at TEXT);
  CREATE TABLE IF NOT EXISTS bd_artifacts (
    id TEXT PRIMARY KEY, org_id TEXT NOT NULL, biz_item_id TEXT NOT NULL,
    skill_id TEXT NOT NULL, stage_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    input_text TEXT NOT NULL, output_text TEXT,
    model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
    tokens_used INTEGER DEFAULT 0, duration_ms INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bd_artifacts_org ON bd_artifacts(org_id);
  CREATE INDEX IF NOT EXISTS idx_bd_artifacts_biz_item ON bd_artifacts(biz_item_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_bd_artifacts_version ON bd_artifacts(biz_item_id, skill_id, version);
`;

function createTestApp(db: any) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    (c as any).env = { DB: db };
    c.set("orgId" as any, "org1");
    c.set("userId" as any, "user1");
    await next();
  });
  app.route("/api", axBdArtifactsRoute);
  return app;
}

function seedArtifacts(db: any) {
  (db as any).exec(`
    INSERT INTO organizations (id, name, slug) VALUES ('org1', 'Test Org', 'test-org');
    INSERT INTO users (id, email, name, created_at, updated_at) VALUES ('user1', 'test@test.com', 'Test User', '2026-01-01', '2026-01-01');
    INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
      VALUES ('biz1', 'org1', 'AI Chatbot', 'desc', 'discovery', 'draft', 'user1', '2026-01-01', '2026-01-01');
    INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, status, created_by, created_at, tokens_used, duration_ms, model)
      VALUES ('art1', 'org1', 'biz1', 'ai-biz:ecosystem-map', '2-1', 1, 'input1', '## Ecosystem\nResult', 'completed', 'user1', '2026-03-31T10:00:00Z', 300, 2500, 'claude-haiku-4-5-20251001');
    INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, status, created_by, created_at, tokens_used, duration_ms, model)
      VALUES ('art2', 'org1', 'biz1', 'ai-biz:ecosystem-map', '2-1', 2, 'input2', '## Ecosystem v2\nUpdated', 'completed', 'user1', '2026-03-31T11:00:00Z', 350, 2800, 'claude-haiku-4-5-20251001');
    INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, status, created_by, created_at, tokens_used, duration_ms, model)
      VALUES ('art3', 'org1', 'biz1', 'pm:persona', '2-6', 1, 'persona input', '## Persona\nProfile', 'completed', 'user1', '2026-03-31T12:00:00Z', 200, 1500, 'claude-haiku-4-5-20251001');
  `);
}

describe("ax-bd-artifacts routes", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: Hono;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(TABLES);
    seedArtifacts(db);
    app = createTestApp(db);
  });

  it("GET /api/ax-bd/artifacts — returns all artifacts", async () => {
    const res = await app.request("/api/ax-bd/artifacts");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.total).toBe(3);
    expect(body.items).toHaveLength(3);
  });

  it("GET /api/ax-bd/artifacts — filters by stageId", async () => {
    const res = await app.request("/api/ax-bd/artifacts?stageId=2-6");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.total).toBe(1);
    expect(body.items[0].skillId).toBe("pm:persona");
  });

  it("GET /api/ax-bd/artifacts — filters by skillId", async () => {
    const res = await app.request("/api/ax-bd/artifacts?skillId=ai-biz:ecosystem-map");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.total).toBe(2);
  });

  it("GET /api/ax-bd/artifacts/:id — returns artifact detail", async () => {
    const res = await app.request("/api/ax-bd/artifacts/art1");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.id).toBe("art1");
    expect(body.outputText).toContain("Ecosystem");
    expect(body.version).toBe(1);
  });

  it("GET /api/ax-bd/artifacts/:id — returns 404 for missing", async () => {
    const res = await app.request("/api/ax-bd/artifacts/nonexistent");
    expect(res.status).toBe(404);
  });

  it("GET /api/ax-bd/biz-items/:bizItemId/artifacts — returns biz-item artifacts", async () => {
    const res = await app.request("/api/ax-bd/biz-items/biz1/artifacts");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.total).toBe(3);
  });

  it("GET versions — returns version history ordered by version desc", async () => {
    const res = await app.request("/api/ax-bd/artifacts/biz1/ai-biz:ecosystem-map/versions");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.total).toBe(2);
    expect(body.versions[0].version).toBe(2);
    expect(body.versions[1].version).toBe(1);
  });

  it("GET /api/ax-bd/artifacts — pagination works", async () => {
    const res = await app.request("/api/ax-bd/artifacts?page=1&limit=2");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.total).toBe(3);
    expect(body.items).toHaveLength(2);
  });
});
