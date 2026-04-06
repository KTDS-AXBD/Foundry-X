import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { rbac } from "../../src/middleware/rbac.js";

function createApp(minRole: "admin" | "member" | "viewer") {
  const app = new Hono();
  // Mock JWT payload setting
  app.use("*", async (c, next) => {
    const role = c.req.header("x-test-role");
    if (role) {
      c.set("jwtPayload", { role });
    }
    return next();
  });
  app.use("*", rbac(minRole));
  app.get("/api/test", (c) => c.json({ ok: true }));
  return app;
}

describe("RBAC Middleware", () => {
  it("should allow admin when minRole is admin", async () => {
    const app = createApp("admin");
    const res = await app.request("/api/test", {
      headers: { "x-test-role": "admin" },
    });
    expect(res.status).toBe(200);
  });

  it("should reject viewer when minRole is admin", async () => {
    const app = createApp("admin");
    const res = await app.request("/api/test", {
      headers: { "x-test-role": "viewer" },
    });
    expect(res.status).toBe(403);
  });

  it("should allow member when minRole is viewer", async () => {
    const app = createApp("viewer");
    const res = await app.request("/api/test", {
      headers: { "x-test-role": "member" },
    });
    expect(res.status).toBe(200);
  });

  it("should reject when no JWT payload", async () => {
    const app = createApp("member");
    const res = await app.request("/api/test");
    expect(res.status).toBe(403);
  });
});
