import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { createAuthMiddleware } from "../../src/middleware/jwt.js";
import type { HarnessConfig } from "../../src/types.js";

const SECRET = "test-jwt-secret";

function createApp(config: Partial<HarnessConfig> = {}) {
  const fullConfig: HarnessConfig = {
    serviceName: "test-service",
    serviceId: "foundry-x",
    corsOrigins: ["http://localhost:3000"],
    publicPaths: ["/api/public"],
    ...config,
  };

  const app = new Hono<{ Bindings: { JWT_SECRET: string } }>();
  app.use("*", createAuthMiddleware(fullConfig));
  app.get("/api/public/health", (c) => c.json({ ok: true }));
  app.get("/api/protected", (c) => c.json({ ok: true }));
  return app;
}

describe("JWT Middleware", () => {
  it("should skip public paths", async () => {
    const app = createApp();
    const res = await app.request("/api/public/health", undefined, {
      JWT_SECRET: SECRET,
    });
    expect(res.status).toBe(200);
  });

  it("should reject requests without token on protected paths", async () => {
    const app = createApp();
    const res = await app.request("/api/protected", undefined, {
      JWT_SECRET: SECRET,
    });
    expect(res.status).toBe(401);
  });

  it("should accept valid JWT on protected paths", async () => {
    const app = createApp();
    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      { sub: "user-1", email: "test@test.com", role: "admin", iat: now, exp: now + 3600 },
      SECRET,
    );
    const res = await app.request("/api/protected", {
      headers: { Authorization: `Bearer ${token}` },
    }, { JWT_SECRET: SECRET });
    expect(res.status).toBe(200);
  });

  it("should use dev-secret when JWT_SECRET is not set", async () => {
    const app = createApp();
    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      { sub: "user-1", email: "test@test.com", role: "admin", iat: now, exp: now + 3600 },
      "dev-secret",
    );
    const res = await app.request("/api/protected", {
      headers: { Authorization: `Bearer ${token}` },
    }, {});
    expect(res.status).toBe(200);
  });
});
