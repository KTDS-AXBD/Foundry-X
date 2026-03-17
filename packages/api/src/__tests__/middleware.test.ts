import { describe, it, expect, beforeAll } from "vitest";
import { app } from "../app.js";
import { createAccessToken } from "../middleware/auth.js";

const TEST_SECRET = "dev-secret";

describe("JWT middleware", () => {
  it("rejects requests without Authorization header", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(401);
  });

  it("rejects requests with invalid token", async () => {
    const res = await app.request("/api/health", {
      headers: { Authorization: "Bearer invalid.jwt.token" },
    });
    expect(res.status).toBe(401);
  });

  it("accepts requests with valid JWT", async () => {
    const token = await createAccessToken(
      { sub: "u1", email: "a@b.com", role: "admin" },
      TEST_SECRET,
    );
    const res = await app.request("/api/health", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
  });

  it("rejects expired tokens", async () => {
    // Create token with past expiry by using sign directly
    const { sign } = await import("hono/jwt");
    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      { sub: "u1", email: "a@b.com", role: "admin", iat: now - 7200, exp: now - 3600 },
      TEST_SECRET,
    );
    const res = await app.request("/api/health", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
  });
});

describe("RBAC middleware", () => {
  let adminHeaders: Record<string, string>;
  let memberHeaders: Record<string, string>;
  let viewerHeaders: Record<string, string>;

  beforeAll(async () => {
    const adminToken = await createAccessToken(
      { sub: "admin-1", email: "admin@test.com", role: "admin" },
      TEST_SECRET,
    );
    adminHeaders = { Authorization: `Bearer ${adminToken}` };

    const memberToken = await createAccessToken(
      { sub: "member-1", email: "member@test.com", role: "member" },
      TEST_SECRET,
    );
    memberHeaders = { Authorization: `Bearer ${memberToken}` };

    const viewerToken = await createAccessToken(
      { sub: "viewer-1", email: "viewer@test.com", role: "viewer" },
      TEST_SECRET,
    );
    viewerHeaders = { Authorization: `Bearer ${viewerToken}` };
  });

  it("viewer can access read-only routes", async () => {
    const res = await app.request("/api/health", { headers: viewerHeaders });
    expect(res.status).toBe(200);
  });

  it("viewer cannot access write routes (wiki POST)", async () => {
    const res = await app.request("/api/wiki", {
      method: "POST",
      headers: { ...viewerHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ filePath: "test.md", content: "hello" }),
    });
    expect(res.status).toBe(403);
  });

  it("member can access write routes (wiki POST)", async () => {
    // Will fail with 500 because no D1, but should not be 403
    const res = await app.request("/api/wiki", {
      method: "POST",
      headers: { ...memberHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ filePath: "test.md", content: "hello" }),
    });
    // member passes RBAC (not 403), D1 error is expected (500)
    expect(res.status).not.toBe(403);
  });
});
