// F355: O-G-D Quality Route 통합 테스트 (Sprint 160)

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { ogdQualityRoute } from "../routes/ogd-quality.js";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS prototype_jobs (
    id TEXT PRIMARY KEY, org_id TEXT NOT NULL,
    prd_content TEXT NOT NULL, prd_title TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'queued',
    builder_type TEXT NOT NULL DEFAULT 'cli',
    pages_project TEXT, pages_url TEXT, build_log TEXT DEFAULT '',
    error_message TEXT, cost_input_tokens INTEGER DEFAULT 0,
    cost_output_tokens INTEGER DEFAULT 0, cost_usd REAL DEFAULT 0.0,
    model_used TEXT DEFAULT 'haiku', fallback_used INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0, quality_score REAL,
    ogd_rounds INTEGER DEFAULT 0, feedback_content TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    started_at INTEGER, completed_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS ogd_rounds (
    id TEXT PRIMARY KEY, job_id TEXT NOT NULL, org_id TEXT NOT NULL,
    round_number INTEGER NOT NULL, quality_score REAL,
    feedback TEXT, input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0, cost_usd REAL DEFAULT 0.0,
    model_used TEXT DEFAULT 'haiku', passed INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(job_id, round_number)
  );
`;

const mockAi = {
  run: vi.fn()
    .mockResolvedValueOnce({ response: "<html><h1>Gen</h1></html>" })
    .mockResolvedValueOnce({ response: '{"qualityScore":0.9,"feedback":"OK","items":[]}' }),
};

function createApp(db: unknown) {
  const app = new Hono<{ Variables: Record<string, string> }>();
  app.use("*", async (c, next) => {
    c.set("orgId", "org_test");
    c.set("userId", "user_1");
    c.set("orgRole", "admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).env = { DB: db, AI: mockAi, ANTHROPIC_API_KEY: "test" };
    await next();
  });
  app.route("/api", ogdQualityRoute);
  return app;
}

describe("O-G-D Quality Routes", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = createMockD1();
    void db.exec(SCHEMA);
    void db
      .prepare("INSERT INTO prototype_jobs (id, org_id, prd_content, prd_title) VALUES (?, ?, ?, ?)")
      .bind("job_1", "org_test", "Test PRD for dashboard", "Test PRD")
      .run();
    mockAi.run.mockReset();
    mockAi.run
      .mockResolvedValueOnce({ response: "<html><h1>Gen</h1></html>" })
      .mockResolvedValueOnce({ response: '{"qualityScore":0.9,"feedback":"OK","items":[]}' });
    app = createApp(db);
  });

  it("POST /api/ogd/evaluate — 200 + summary 반환", async () => {
    const res = await app.request("/api/ogd/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: "job_1", prdContent: "Test PRD for dashboard app" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.summary.totalRounds).toBeGreaterThanOrEqual(1);
  });

  it("POST — 잘못된 요청이면 400", async () => {
    const res = await app.request("/api/ogd/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("GET /api/ogd/summary/:jobId — 없으면 404", async () => {
    const res = await app.request("/api/ogd/summary/nonexistent");
    expect(res.status).toBe(404);
  });
});
