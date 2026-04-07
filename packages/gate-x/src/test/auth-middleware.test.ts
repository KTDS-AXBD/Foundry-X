import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { createGateAuthMiddleware } from "../middleware/auth.js";
import type { GateEnv } from "../env.js";
import type { HarnessConfig } from "@foundry-x/harness-kit";

const SECRET = "test-secret";

const config: HarnessConfig = {
  serviceName: "gate-x",
  serviceId: "gate-x",
  corsOrigins: [],
  publicPaths: ["/api/health"],
};

function makeApp() {
  const app = new Hono<{ Bindings: GateEnv }>();

  // Stub DB with ApiKeyService mock
  app.use("*", async (c, next) => {
    // Provide JWT_SECRET in env
    (c.env as Record<string, unknown>) = { JWT_SECRET: SECRET };
    return next();
  });

  app.use("/api/*", createGateAuthMiddleware(config) as Parameters<typeof app.use>[1]);

  app.get("/api/health", (c) => c.json({ ok: true }));
  app.get("/api/protected", (c) => c.json({ secret: "data" }));

  return app;
}

describe("createGateAuthMiddleware", () => {
  it("allows public path without auth", async () => {
    const app = makeApp();
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
  });

  it("returns 401 with no auth headers", async () => {
    const app = makeApp();
    const res = await app.request("/api/protected");
    expect(res.status).toBe(401);
  });

  it("accepts valid Bearer JWT", async () => {
    const app = makeApp();
    const token = await sign(
      { sub: "user-1", email: "a@b.com", role: "member", iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 },
      SECRET,
    );
    const res = await app.request("/api/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
  });

  it("rejects invalid Bearer JWT with 401", async () => {
    const app = makeApp();
    const res = await app.request("/api/protected", {
      headers: { Authorization: "Bearer invalid.jwt.token" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 when X-API-Key present but invalid (no DB mock)", async () => {
    const app = makeApp();
    // Without real DB, API Key verification throws → 401
    const res = await app.request("/api/protected", {
      headers: { "X-API-Key": "gx_invalidkey" },
    });
    // Should be 401 (key not verified)
    expect(res.status).toBe(401);
  });
});
