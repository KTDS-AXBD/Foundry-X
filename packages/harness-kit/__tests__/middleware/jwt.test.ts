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

  // F569 TDD Red — Worker별 public path 설정
  describe("F569: Worker-specific public paths", () => {
    it("fx-discovery health is public", async () => {
      const app = createApp({ publicPaths: ["/api/discovery/health"] });
      app.get("/api/discovery/health", (c) => c.json({ domain: "discovery", status: "ok" }));
      const res = await app.request("/api/discovery/health", undefined, { JWT_SECRET: SECRET });
      expect(res.status).toBe(200);
    });

    it("fx-shaping health is public", async () => {
      const app = createApp({ publicPaths: ["/api/shaping/health", "/api/ax-bd/health"] });
      app.get("/api/shaping/health", (c) => c.json({ domain: "shaping", status: "ok" }));
      const res = await app.request("/api/shaping/health", undefined, { JWT_SECRET: SECRET });
      expect(res.status).toBe(200);
    });

    it("fx-offering health is public", async () => {
      const app = createApp({ publicPaths: ["/api/offering/health"] });
      app.get("/api/offering/health", (c) => c.json({ domain: "offering", status: "ok" }));
      const res = await app.request("/api/offering/health", undefined, { JWT_SECRET: SECRET });
      expect(res.status).toBe(200);
    });

    it("protected route still requires JWT even with domain-specific public paths", async () => {
      const app = createApp({ publicPaths: ["/api/discovery/health"] });
      app.get("/api/discovery/items", (c) => c.json({ items: [] }));
      const res = await app.request("/api/discovery/items", undefined, { JWT_SECRET: SECRET });
      expect(res.status).toBe(401);
    });
  });
});
