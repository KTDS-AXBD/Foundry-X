import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

describe("Feedback context fields (F174)", () => {
  let env: ReturnType<typeof createTestEnv>;
  let authHeader: Record<string, string>;

  function req(method: string, path: string, opts?: { body?: unknown; headers?: Record<string, string> }) {
    const url = `http://localhost${path}`;
    const init: RequestInit = {
      method,
      headers: { "Content-Type": "application/json", ...opts?.headers },
    };
    if (opts?.body) init.body = JSON.stringify(opts.body);
    return app.request(url, init, env);
  }

  beforeEach(async () => {
    env = createTestEnv();

    // page_path, session_seconds, feedback_type are already in base schema (mock-d1)

    (env.DB as any).prepare(
      "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test', 'admin', datetime('now'), datetime('now'))"
    ).run();
    (env.DB as any).prepare(
      "INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')"
    ).run();

    authHeader = await createAuthHeaders();
  });

  it("POST /api/feedback: accepts context fields", async () => {
    const res = await req("POST", "/api/feedback", {
      headers: authHeader,
      body: {
        npsScore: 8,
        comment: "Great feature!",
        pagePath: "/sr-management",
        sessionSeconds: 342,
        feedbackType: "feature",
      },
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
    expect(data.npsScore).toBe(8);
  });

  it("POST /api/feedback: context fields are optional (backward compatible)", async () => {
    const res = await req("POST", "/api/feedback", {
      headers: authHeader,
      body: { npsScore: 5, comment: "OK" },
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
  });

  it("POST /api/feedback: feedbackType defaults to nps", async () => {
    const res = await req("POST", "/api/feedback", {
      headers: authHeader,
      body: { npsScore: 7 },
    });

    expect(res.status).toBe(200);

    // Verify stored in DB
    const row = await (env.DB as any).prepare(
      "SELECT feedback_type FROM onboarding_feedback ORDER BY created_at DESC LIMIT 1"
    ).first();
    expect(row.feedback_type).toBe("nps");
  });

  it("POST /api/feedback: stores pagePath and sessionSeconds in DB", async () => {
    await req("POST", "/api/feedback", {
      headers: authHeader,
      body: {
        npsScore: 9,
        pagePath: "/dashboard",
        sessionSeconds: 120,
        feedbackType: "bug",
      },
    });

    const row = await (env.DB as any).prepare(
      "SELECT page_path, session_seconds, feedback_type FROM onboarding_feedback ORDER BY created_at DESC LIMIT 1"
    ).first();
    expect(row.page_path).toBe("/dashboard");
    expect(row.session_seconds).toBe(120);
    expect(row.feedback_type).toBe("bug");
  });

  it("POST /api/feedback: rejects invalid feedbackType", async () => {
    const res = await req("POST", "/api/feedback", {
      headers: authHeader,
      body: { npsScore: 5, feedbackType: "invalid" },
    });
    expect(res.status).toBe(400);
  });
});
