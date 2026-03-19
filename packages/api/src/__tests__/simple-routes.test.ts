import { describe, it, expect, beforeAll } from "vitest";
import { app } from "../app.js";
import { createAccessToken } from "../middleware/auth.js";

const TEST_SECRET = "dev-secret";
let authHeader: Record<string, string>;

beforeAll(async () => {
  const token = await createAccessToken(
    { sub: "test-user", email: "test@example.com", role: "admin", orgId: "org_test", orgRole: "owner" },
    TEST_SECRET,
  );
  authHeader = { Authorization: `Bearer ${token}` };
});

describe("OpenAPI spec", () => {
  it("GET /api/openapi.json returns valid spec with all endpoints", async () => {
    const res = await app.request("/api/openapi.json");
    expect(res.status).toBe(200);
    const spec = (await res.json()) as any;
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBe("Foundry-X API");

    // All 9 tags present
    const tagNames = spec.tags.map((t: any) => t.name);
    expect(tagNames).toContain("Auth");
    expect(tagNames).toContain("Health");
    expect(tagNames).toContain("Wiki");
    expect(tagNames).toContain("Requirements");
    expect(tagNames).toContain("Agents");
    expect(tagNames).toContain("Tokens");

    // Key paths present
    const paths = Object.keys(spec.paths ?? {});
    expect(paths).toContain("/api/health");
    expect(paths).toContain("/api/profile");
    expect(paths).toContain("/api/wiki");
    expect(paths).toContain("/api/requirements");
    expect(paths).toContain("/api/agents");
    expect(paths).toContain("/api/auth/signup");
  });

  it("GET /api/docs returns Swagger UI HTML", async () => {
    const res = await app.request("/api/docs");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("swagger-ui");
  });
});

describe("API simple routes", () => {
  // ─── Root (public) ───

  it("GET / returns service status", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
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
    const data = (await res.json()) as any;
    expect(data).toHaveProperty("overall");
    expect(data).toHaveProperty("grade");
    expect(data.overall).toBe(82);
  });

  // ─── Profile ───

  it("GET /api/profile returns RepoProfile", async () => {
    const res = await app.request("/api/profile", { headers: authHeader });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data).toHaveProperty("mode");
    expect(data).toHaveProperty("languages");
    expect(data).toHaveProperty("frameworks");
    expect(data.architecturePattern).toBe("monorepo");
  });

  // ─── Integrity ───

  it("GET /api/integrity returns HarnessIntegrity", async () => {
    const res = await app.request("/api/integrity", { headers: authHeader });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data).toHaveProperty("passed");
    expect(data).toHaveProperty("score");
    expect(data).toHaveProperty("checks");
    expect(Array.isArray(data.checks)).toBe(true);
  });

  // ─── Freshness ───

  it("GET /api/freshness returns FreshnessReport", async () => {
    const res = await app.request("/api/freshness", { headers: authHeader });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data).toHaveProperty("documents");
    expect(data).toHaveProperty("overallStale");
    expect(data).toHaveProperty("checkedAt");
    expect(Array.isArray(data.documents)).toBe(true);
  });
});
