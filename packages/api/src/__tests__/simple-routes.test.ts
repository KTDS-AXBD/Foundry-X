import { describe, it, expect, beforeAll } from "vitest";
import { app } from "../app.js";
import { createAccessToken } from "../middleware/auth.js";
import {
  MOCK_HEALTH,
  MOCK_PROFILE,
  MOCK_INTEGRITY,
  MOCK_FRESHNESS,
} from "../services/data-reader.js";

const TEST_SECRET = "dev-secret";
let authHeader: Record<string, string>;

beforeAll(async () => {
  const token = await createAccessToken(
    { sub: "test-user", email: "test@example.com", role: "admin" },
    TEST_SECRET,
  );
  authHeader = { Authorization: `Bearer ${token}` };
});

describe("API simple routes", () => {
  // ─── Root (public) ───

  it("GET / returns service status", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data).toEqual({ status: "ok", service: "foundry-x-api" });
  });

  // ─── Protected routes require JWT ───

  it("GET /api/health returns 401 without token", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(401);
  });

  // ─── Health ───

  it("GET /api/health returns HealthScore", async () => {
    const res = await app.request("/api/health", { headers: authHeader });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data).toEqual(MOCK_HEALTH);
    expect(data).toHaveProperty("overall");
    expect(data).toHaveProperty("grade");
  });

  // ─── Profile ───

  it("GET /api/profile returns RepoProfile (fallback to mock)", async () => {
    const res = await app.request("/api/profile", { headers: authHeader });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data).toHaveProperty("mode");
    expect(data).toHaveProperty("languages");
    expect(data).toHaveProperty("frameworks");
    expect(data.architecturePattern).toBe("monorepo");
  });

  // ─── Integrity ───

  it("GET /api/integrity returns HarnessIntegrity (fallback to mock)", async () => {
    const res = await app.request("/api/integrity", { headers: authHeader });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data).toHaveProperty("passed");
    expect(data).toHaveProperty("score");
    expect(data).toHaveProperty("checks");
    expect(Array.isArray(data.checks)).toBe(true);
  });

  // ─── Freshness ───

  it("GET /api/freshness returns FreshnessReport (fallback to mock)", async () => {
    const res = await app.request("/api/freshness", { headers: authHeader });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data).toHaveProperty("documents");
    expect(data).toHaveProperty("overallStale");
    expect(data).toHaveProperty("checkedAt");
    expect(Array.isArray(data.documents)).toBe(true);
  });
});
