import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { roleGuard } from "../middleware/role-guard.js";

function createApp(minRole: "owner" | "admin" | "member" | "viewer") {
  const app = new Hono();
  app.use("*", async (c, next) => {
    const role = c.req.header("X-Test-Role");
    if (role) (c as any).set("orgRole", role);
    await next();
  });
  app.get("/test", roleGuard(minRole), (c) => c.json({ ok: true }));
  return app;
}

describe("roleGuard", () => {
  it("owner passes roleGuard('admin')", async () => {
    const app = createApp("admin");
    const res = await app.request("/test", { headers: { "X-Test-Role": "owner" } });
    expect(res.status).toBe(200);
  });

  it("admin passes roleGuard('admin')", async () => {
    const app = createApp("admin");
    const res = await app.request("/test", { headers: { "X-Test-Role": "admin" } });
    expect(res.status).toBe(200);
  });

  it("member fails roleGuard('admin')", async () => {
    const app = createApp("admin");
    const res = await app.request("/test", { headers: { "X-Test-Role": "member" } });
    expect(res.status).toBe(403);
  });

  it("viewer fails roleGuard('admin')", async () => {
    const app = createApp("admin");
    const res = await app.request("/test", { headers: { "X-Test-Role": "viewer" } });
    expect(res.status).toBe(403);
  });

  it("owner passes roleGuard('owner')", async () => {
    const app = createApp("owner");
    const res = await app.request("/test", { headers: { "X-Test-Role": "owner" } });
    expect(res.status).toBe(200);
  });

  it("admin fails roleGuard('owner')", async () => {
    const app = createApp("owner");
    const res = await app.request("/test", { headers: { "X-Test-Role": "admin" } });
    expect(res.status).toBe(403);
  });

  it("member passes roleGuard('member')", async () => {
    const app = createApp("member");
    const res = await app.request("/test", { headers: { "X-Test-Role": "member" } });
    expect(res.status).toBe(200);
  });

  it("viewer fails roleGuard('member')", async () => {
    const app = createApp("member");
    const res = await app.request("/test", { headers: { "X-Test-Role": "viewer" } });
    expect(res.status).toBe(403);
  });

  it("no role set returns 403", async () => {
    const app = createApp("member");
    const res = await app.request("/test");
    expect(res.status).toBe(403);
  });
});
