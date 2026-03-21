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

describe("Onboarding Routes", () => {
  let authHeader: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    seedDb("INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test', 'admin', datetime('now'), datetime('now'))");
    seedDb("INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')");
    authHeader = await createAuthHeaders();
  });

  it("GET /api/onboarding/progress: returns initial state", async () => {
    const res = await req("GET", "/api/onboarding/progress", {
      headers: authHeader,
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data).toHaveProperty("userId");
    expect(data).toHaveProperty("completedSteps");
    expect(data).toHaveProperty("totalSteps");
    expect(data).toHaveProperty("progressPercent");
    expect(data).toHaveProperty("steps");
    expect(data.totalSteps).toBe(5);
    expect(data.steps).toHaveLength(5);
  });

  it("PATCH /api/onboarding/progress: completes a step", async () => {
    const res = await req("PATCH", "/api/onboarding/progress", {
      headers: authHeader,
      body: { stepId: "view_dashboard" },
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
    expect(data.stepId).toBe("view_dashboard");
    expect(data.progressPercent).toBeGreaterThan(0);
  });

  it("PATCH /api/onboarding/progress: invalid stepId returns 400", async () => {
    const res = await req("PATCH", "/api/onboarding/progress", {
      headers: authHeader,
      body: { stepId: "nonexistent_step" },
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toContain("Invalid stepId");
  });

  it("PATCH /api/onboarding/progress: unauthorized returns 401", async () => {
    const res = await req("PATCH", "/api/onboarding/progress", {
      body: { stepId: "view_dashboard" },
    });
    expect(res.status).toBe(401);
  });
});
