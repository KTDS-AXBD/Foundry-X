// F355: O-G-D Quality Route 통합 테스트 (Sprint 160)
// F466: POST /ogd/regenerate/:jobId 테스트 (Sprint 228)

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { ogdQualityRoute } from "../core/harness/routes/ogd-quality.js";

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
  CREATE TABLE IF NOT EXISTS prototype_feedback (
    id TEXT PRIMARY KEY, job_id TEXT NOT NULL,
    org_id TEXT NOT NULL, author_id TEXT,
    category TEXT NOT NULL DEFAULT 'other',
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS prototype_quality (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    job_id TEXT NOT NULL,
    round INTEGER NOT NULL DEFAULT 0,
    total_score REAL NOT NULL,
    build_score REAL NOT NULL,
    ui_score REAL NOT NULL,
    functional_score REAL NOT NULL,
    prd_score REAL NOT NULL,
    code_score REAL NOT NULL,
    generation_mode TEXT NOT NULL DEFAULT 'api',
    cost_usd REAL NOT NULL DEFAULT 0,
    feedback TEXT,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

  // F466: POST /ogd/regenerate/:jobId 테스트
  it("F466: POST /api/ogd/regenerate/:jobId — feedback_pending job이면 200 + summary 반환", async () => {
    // job을 feedback_pending 상태로 설정
    await db
      .prepare(
        "UPDATE prototype_jobs SET status = 'feedback_pending', feedback_content = ? WHERE id = ?",
      )
      .bind("CTA 버튼을 더 크게 해주세요", "job_1")
      .run();

    mockAi.run
      .mockResolvedValueOnce({ response: "<html><h1>Regenerated</h1></html>" })
      .mockResolvedValueOnce({ response: '{"qualityScore":0.92,"feedback":"Better","items":[]}' });

    const res = await app.request("/api/ogd/regenerate/job_1", { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe("live");
    expect(body.summary).toBeDefined();
    expect(body.jobId).toBe("job_1");
  });

  it("F466: POST /api/ogd/regenerate/:jobId — feedback_pending 아닌 경우 400", async () => {
    // job이 기본 'queued' 상태
    const res = await app.request("/api/ogd/regenerate/job_1", { method: "POST" });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toContain("not in feedback_pending");
  });

  it("F466: POST /api/ogd/regenerate/:jobId — job 없으면 404", async () => {
    const res = await app.request("/api/ogd/regenerate/nonexistent", { method: "POST" });
    expect(res.status).toBe(404);
  });

  it("F466: 재생성 완료 후 job 상태가 live로 복귀해요", async () => {
    await db
      .prepare(
        "UPDATE prototype_jobs SET status = 'feedback_pending', feedback_content = ? WHERE id = ?",
      )
      .bind("디자인 개선 필요", "job_1")
      .run();

    mockAi.run
      .mockResolvedValueOnce({ response: "<html>Improved</html>" })
      .mockResolvedValueOnce({ response: '{"qualityScore":0.88,"feedback":"Good","items":[]}' });

    await app.request("/api/ogd/regenerate/job_1", { method: "POST" });

    const row = await db
      .prepare("SELECT status FROM prototype_jobs WHERE id = ?")
      .bind("job_1")
      .first<{ status: string }>();
    expect(row!.status).toBe("live");
  });

  it("F466: OGD 루프 실패 시 job 상태가 failed로 전환돼요", async () => {
    await db
      .prepare(
        "UPDATE prototype_jobs SET status = 'feedback_pending', feedback_content = ? WHERE id = ?",
      )
      .bind("테스트 피드백", "job_1")
      .run();

    // 기존 mock 초기화 후 AI가 에러를 던지도록 설정
    mockAi.run.mockReset();
    mockAi.run.mockRejectedValue(new Error("AI service unavailable"));

    const res = await app.request("/api/ogd/regenerate/job_1", { method: "POST" });
    expect(res.status).toBe(500);

    const row = await db
      .prepare("SELECT status FROM prototype_jobs WHERE id = ?")
      .bind("job_1")
      .first<{ status: string }>();
    expect(row!.status).toBe("failed");
  });

  it("F466: 재생성 완료 후 pending 피드백이 applied로 업데이트돼요", async () => {
    await db
      .prepare(
        "UPDATE prototype_jobs SET status = 'feedback_pending', feedback_content = ? WHERE id = ?",
      )
      .bind("페이지 로딩 느림", "job_1")
      .run();
    await db
      .prepare(
        "INSERT INTO prototype_feedback (id, job_id, org_id, category, content, status) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind("fb_1", "job_1", "org_test", "ux", "페이지 로딩 느림", "pending")
      .run();

    mockAi.run
      .mockResolvedValueOnce({ response: "<html>Fast</html>" })
      .mockResolvedValueOnce({ response: '{"qualityScore":0.9,"feedback":"Fixed","items":[]}' });

    await app.request("/api/ogd/regenerate/job_1", { method: "POST" });

    const fb = await db
      .prepare("SELECT status FROM prototype_feedback WHERE id = ?")
      .bind("fb_1")
      .first<{ status: string }>();
    expect(fb!.status).toBe("applied");
  });
});
