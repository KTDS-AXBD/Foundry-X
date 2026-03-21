import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

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

describe("Feedback Routes", () => {
  let authHeader: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    seedDb("INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test', 'admin', datetime('now'), datetime('now'))");
    seedDb("INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')");
    authHeader = await createAuthHeaders();
  });

  it("POST /api/feedback: valid submission returns 200", async () => {
    const res = await req("POST", "/api/feedback", {
      headers: authHeader,
      body: { npsScore: 8, comment: "Excellent!" },
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
    expect(data.id).toMatch(/^fb-/);
    expect(data.npsScore).toBe(8);
  });

  it("POST /api/feedback: invalid npsScore returns 400", async () => {
    const res0 = await req("POST", "/api/feedback", {
      headers: authHeader,
      body: { npsScore: 0 },
    });
    expect(res0.status).toBe(400);

    const res11 = await req("POST", "/api/feedback", {
      headers: authHeader,
      body: { npsScore: 11 },
    });
    expect(res11.status).toBe(400);
  });

  it("POST /api/feedback: unauthorized returns 401", async () => {
    const res = await req("POST", "/api/feedback", {
      body: { npsScore: 5 },
    });
    expect(res.status).toBe(401);
  });

  it("GET /api/feedback/summary: returns summary", async () => {
    // Submit data first
    await req("POST", "/api/feedback", {
      headers: authHeader,
      body: { npsScore: 7 },
    });

    const res = await req("GET", "/api/feedback/summary", {
      headers: authHeader,
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data).toHaveProperty("averageNps");
    expect(data).toHaveProperty("totalResponses");
    expect(data).toHaveProperty("recentFeedback");
    expect(data.totalResponses).toBeGreaterThanOrEqual(1);
  });
});
