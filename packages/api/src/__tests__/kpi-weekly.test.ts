import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

describe("KPI weekly-summary endpoint", () => {
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

  function seedDb(sql: string, ...bindings: unknown[]) {
    if (bindings.length > 0) {
      (env.DB as any).prepare(sql).bind(...bindings).run();
    } else {
      (env.DB as any).prepare(sql).run();
    }
  }

  beforeEach(async () => {
    env = createTestEnv();
    seedDb("INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test', 'admin', datetime('now'), datetime('now'))");
    authHeader = await createAuthHeaders();
  });

  it("GET /api/kpi/weekly-summary: returns summary structure", async () => {
    const res = await req("GET", "/api/kpi/weekly-summary", { headers: authHeader });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;

    expect(data).toHaveProperty("period");
    expect(data.period).toHaveProperty("start");
    expect(data.period).toHaveProperty("end");
    expect(data).toHaveProperty("activeUsers");
    expect(data).toHaveProperty("totalPageViews");
    expect(data).toHaveProperty("onboardingCompletion");
    expect(data.onboardingCompletion).toHaveProperty("completed");
    expect(data.onboardingCompletion).toHaveProperty("total");
    expect(data.onboardingCompletion).toHaveProperty("rate");
    expect(data).toHaveProperty("averageNps");
    expect(data).toHaveProperty("feedbackCount");
    expect(data).toHaveProperty("topPages");
    expect(Array.isArray(data.topPages)).toBe(true);
  });

  it("GET /api/kpi/weekly-summary: counts seeded data correctly", async () => {
    const now = new Date().toISOString();

    // Seed kpi_events
    seedDb(
      "INSERT INTO kpi_events (id, tenant_id, event_type, user_id, metadata, created_at) VALUES (?, ?, 'page_view', ?, ?, ?)",
      "ev-1", "org_test", "test-user", JSON.stringify({ page: "/dashboard" }), now,
    );
    seedDb(
      "INSERT INTO kpi_events (id, tenant_id, event_type, user_id, metadata, created_at) VALUES (?, ?, 'page_view', ?, ?, ?)",
      "ev-2", "org_test", "test-user", JSON.stringify({ page: "/dashboard" }), now,
    );
    seedDb(
      "INSERT INTO kpi_events (id, tenant_id, event_type, user_id, metadata, created_at) VALUES (?, ?, 'page_view', ?, ?, ?)",
      "ev-3", "org_test", "user-2", JSON.stringify({ page: "/agents" }), now,
    );

    // Seed onboarding_feedback
    seedDb(
      "INSERT INTO onboarding_feedback (id, tenant_id, user_id, nps_score, created_at) VALUES (?, ?, ?, ?, ?)",
      "fb-1", "org_test", "test-user", 8, now,
    );
    seedDb(
      "INSERT INTO onboarding_feedback (id, tenant_id, user_id, nps_score, created_at) VALUES (?, ?, ?, ?, ?)",
      "fb-2", "org_test", "user-2", 6, now,
    );

    const res = await req("GET", "/api/kpi/weekly-summary", { headers: authHeader });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;

    expect(data.activeUsers).toBe(2); // test-user + user-2
    expect(data.totalPageViews).toBe(3);
    expect(data.averageNps).toBe(7); // (8+6)/2
    expect(data.feedbackCount).toBe(2);
    expect(data.topPages.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/kpi/weekly-summary: returns empty data when no events", async () => {
    const res = await req("GET", "/api/kpi/weekly-summary", { headers: authHeader });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;

    expect(data.activeUsers).toBe(0);
    expect(data.totalPageViews).toBe(0);
    expect(data.averageNps).toBe(0);
    expect(data.feedbackCount).toBe(0);
    expect(data.topPages).toEqual([]);
  });

  it("GET /api/kpi/weekly-summary: requires authentication", async () => {
    const res = await req("GET", "/api/kpi/weekly-summary");
    expect(res.status).toBe(401);
  });
});
