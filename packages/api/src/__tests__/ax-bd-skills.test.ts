import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { axBdSkillsRoute } from "../core/shaping/routes/ax-bd-skills.js";

const TABLES = `
  CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, plan TEXT NOT NULL DEFAULT 'free', settings TEXT NOT NULL DEFAULT '{}');
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', password_hash TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS biz_items (id TEXT PRIMARY KEY, org_id TEXT, title TEXT, description TEXT, source TEXT, status TEXT, created_by TEXT, created_at TEXT, updated_at TEXT);
  CREATE TABLE IF NOT EXISTS bd_artifacts (
    id TEXT PRIMARY KEY, org_id TEXT NOT NULL, biz_item_id TEXT NOT NULL,
    skill_id TEXT NOT NULL, stage_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    input_text TEXT NOT NULL, output_text TEXT,
    model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20250714',
    tokens_used INTEGER DEFAULT 0, duration_ms INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_bd_artifacts_version ON bd_artifacts(biz_item_id, skill_id, version);
  CREATE TABLE IF NOT EXISTS prompt_sanitization_rules (
    id TEXT PRIMARY KEY, pattern TEXT NOT NULL, replacement TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'custom', enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT, event_type TEXT NOT NULL,
    metadata TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

function createTestApp(db: any, apiKey = "test-api-key") {
  const app = new Hono();
  app.use("*", async (c, next) => {
    (c as any).env = { DB: db, ANTHROPIC_API_KEY: apiKey };
    c.set("orgId" as any, "org1");
    c.set("userId" as any, "user1");
    await next();
  });
  app.route("/api", axBdSkillsRoute);
  return app;
}

describe("ax-bd-skills routes", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: Hono;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(TABLES);
    (db as any).exec(`
      INSERT INTO organizations (id, name, slug) VALUES ('org1', 'Test Org', 'test-org');
      INSERT INTO users (id, email, name, created_at, updated_at) VALUES ('user1', 'test@test.com', 'Test User', '2026-01-01', '2026-01-01');
      INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
        VALUES ('biz1', 'org1', 'AI Chatbot', 'Chatbot for support', 'discovery', 'draft', 'user1', '2026-01-01', '2026-01-01');
    `);
    app = createTestApp(db);
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("GET /api/ax-bd/skills returns supported skill list", async () => {
    const res = await app.request("/api/ax-bd/skills");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.skills).toBeInstanceOf(Array);
    expect(body.total).toBeGreaterThan(0);
    expect(body.skills).toContain("ai-biz:ecosystem-map");
  });

  it("POST /api/ax-bd/skills/:skillId/execute — success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "## Analysis\nResult..." }],
        usage: { input_tokens: 50, output_tokens: 150 },
      }),
    }));

    const res = await app.request("/api/ax-bd/skills/ai-biz:ecosystem-map/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bizItemId: "biz1",
        stageId: "2-1",
        inputText: "Analyze AI chatbot ecosystem",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe("completed");
    expect(body.version).toBe(1);
    expect(body.outputText).toContain("Analysis");
  });

  it("POST execute — rejects invalid stageId", async () => {
    const res = await app.request("/api/ax-bd/skills/ai-biz:ecosystem-map/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bizItemId: "biz1",
        stageId: "invalid",
        inputText: "test",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("POST execute — rejects unsupported skill", async () => {
    const res = await app.request("/api/ax-bd/skills/nonexistent:skill/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bizItemId: "biz1",
        stageId: "2-1",
        inputText: "test",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toContain("Unsupported skill");
  });

  it("POST execute — returns 503 without API key", async () => {
    const noKeyApp = createTestApp(db, "");
    const res = await noKeyApp.request("/api/ax-bd/skills/ai-biz:ecosystem-map/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bizItemId: "biz1",
        stageId: "2-1",
        inputText: "test",
      }),
    });
    expect(res.status).toBe(503);
  });

  it("POST execute — rejects empty inputText", async () => {
    const res = await app.request("/api/ax-bd/skills/ai-biz:ecosystem-map/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bizItemId: "biz1",
        stageId: "2-1",
        inputText: "",
      }),
    });
    expect(res.status).toBe(400);
  });
});
