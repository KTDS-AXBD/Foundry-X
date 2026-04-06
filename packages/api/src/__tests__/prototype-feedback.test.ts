// F356: Prototype Feedback Route 테스트 (Sprint 160)

import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { prototypeFeedbackRoute } from "../routes/prototype-feedback.js";

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
  CREATE TABLE IF NOT EXISTS prototype_feedback (
    id TEXT PRIMARY KEY, job_id TEXT NOT NULL,
    org_id TEXT NOT NULL, author_id TEXT,
    category TEXT NOT NULL CHECK(category IN ('layout','content','functionality','ux','other')),
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','applied','dismissed')),
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`;

function createApp(db: unknown) {
  const app = new Hono<{ Variables: Record<string, string> }>();
  app.use("*", async (c, next) => {
    c.set("orgId", "org_test");
    c.set("userId", "user_1");
    c.set("orgRole", "admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).env = { DB: db };
    await next();
  });
  app.route("/api", prototypeFeedbackRoute);
  return app;
}

describe("Prototype Feedback Routes", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = createMockD1();
    void db.exec(SCHEMA);
    void db
      .prepare(
        "INSERT INTO prototype_jobs (id, org_id, prd_content, prd_title, status) VALUES (?, ?, ?, ?, ?)",
      )
      .bind("job_1", "org_test", "Test PRD", "Test Title", "live")
      .run();
    app = createApp(db);
  });

  it("POST — 피드백이 201로 생성돼요", async () => {
    const res = await app.request("/api/prototype-jobs/job_1/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "ux", content: "버튼이 너무 작아요" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.feedback.category).toBe("ux");
    expect(body.jobStatus).toBe("feedback_pending");
  });

  it("POST — 없는 Job이면 404예요", async () => {
    const res = await app.request("/api/prototype-jobs/no_job/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "layout", content: "test feedback" }),
    });
    expect(res.status).toBe(404);
  });

  it("POST — 잘못된 카테고리면 400이에요", async () => {
    const res = await app.request("/api/prototype-jobs/job_1/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "invalid", content: "test" }),
    });
    expect(res.status).toBe(400);
  });

  it("GET — 피드백 목록 조회돼요", async () => {
    await app.request("/api/prototype-jobs/job_1/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "ux", content: "피드백 1" }),
    });
    const res = await app.request("/api/prototype-jobs/job_1/feedback");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.items).toHaveLength(1);
  });
});
