import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { prototypeJobsRoute } from "../routes/prototype-jobs.js";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS prototype_jobs (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    prd_content TEXT NOT NULL,
    prd_title TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'queued'
      CHECK(status IN ('queued','building','deploying','live','failed','deploy_failed','dead_letter')),
    builder_type TEXT NOT NULL DEFAULT 'cli'
      CHECK(builder_type IN ('cli','api','ensemble')),
    pages_project TEXT,
    pages_url TEXT,
    build_log TEXT DEFAULT '',
    error_message TEXT,
    cost_input_tokens INTEGER DEFAULT 0,
    cost_output_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0.0,
    model_used TEXT DEFAULT 'haiku',
    fallback_used INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    started_at INTEGER,
    completed_at INTEGER
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
  app.route("/api", prototypeJobsRoute);
  return app;
}

describe("Prototype Jobs Route", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = createMockD1();
    void db.exec(SCHEMA);
    app = createApp(db);
  });

  it("POST /api/prototype-jobs — Job이 201로 생성돼요", async () => {
    const res = await app.request("/api/prototype-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prdContent: "# 테스트 PRD\n기능 설명이 들어갑니다",
        prdTitle: "손해사정 AI 지원 시스템",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.status).toBe("queued");
    expect(body.prdTitle).toBe("손해사정 AI 지원 시스템");
  });

  it("POST /api/prototype-jobs — prdContent가 짧으면 400이에요", async () => {
    const res = await app.request("/api/prototype-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prdContent: "short", prdTitle: "T" }),
    });
    expect(res.status).toBe(400);
  });

  it("GET /api/prototype-jobs — 목록 + 페이지네이션이에요", async () => {
    for (let i = 0; i < 3; i++) {
      await app.request("/api/prototype-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prdContent: `# PRD ${i}\n설명 설명 설명`, prdTitle: `PRD ${i}` }),
      });
    }

    const res = await app.request("/api/prototype-jobs?limit=2&offset=0");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.total).toBe(3);
    expect(body.items).toHaveLength(2);
  });

  it("GET /api/prototype-jobs/:id — 상세 + buildLog가 포함돼요", async () => {
    const createRes = await app.request("/api/prototype-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prdContent: "# 상세 PRD\n콘텐츠 콘텐츠", prdTitle: "상세 테스트" }),
    });
    const created = await createRes.json() as any;

    const res = await app.request(`/api/prototype-jobs/${created.id}`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.prdContent).toBe("# 상세 PRD\n콘텐츠 콘텐츠");
    expect(body.buildLog).toBeDefined();
  });

  it("GET /api/prototype-jobs/:id — 없는 ID는 404에요", async () => {
    const res = await app.request("/api/prototype-jobs/non-existent");
    expect(res.status).toBe(404);
  });

  it("PATCH /api/prototype-jobs/:id — 상태 전이 성공이에요", async () => {
    const createRes = await app.request("/api/prototype-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prdContent: "# PATCH PRD\n전이 테스트 진행", prdTitle: "전이 테스트" }),
    });
    const created = await createRes.json() as any;

    const res = await app.request(`/api/prototype-jobs/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "building", buildLog: "Starting..." }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe("building");
  });

  it("PATCH /api/prototype-jobs/:id — 무효 전이 시 409에요", async () => {
    const createRes = await app.request("/api/prototype-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prdContent: "# Invalid PRD\n무효 전이 테스트", prdTitle: "무효 전이" }),
    });
    const created = await createRes.json() as any;

    const res = await app.request(`/api/prototype-jobs/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "live" }),
    });
    expect(res.status).toBe(409);
  });
});
