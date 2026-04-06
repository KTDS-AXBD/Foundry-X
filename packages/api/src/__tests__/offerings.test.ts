/**
 * F370: Offerings CRUD API Tests (Sprint 167)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { offeringsRoute } from "../routes/offerings.js";
import { Hono } from "hono";
import type { Env } from "../env.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", offeringsRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

async function seedBizItem(db: D1Database, id = "biz-1") {
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT OR IGNORE INTO biz_items (id, org_id, title, created_by) VALUES ('${id}', 'org_test', 'Test BizItem', 'test-user')`,
  );
}

const json = (res: Response) => res.json() as Promise<Any>;

describe("Offerings CRUD API", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    db = mockDb as unknown as D1Database;
    await seedBizItem(db);
    app = createApp(db);
  });

  // ── POST /offerings ──

  it("POST /offerings — creates offering with 22 sections", async () => {
    const res = await app.request("/api/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bizItemId: "biz-1",
        title: "Healthcare AI 사업기획서",
        purpose: "report",
        format: "html",
      }),
    });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.id).toBeTruthy();
    expect(body.title).toBe("Healthcare AI 사업기획서");
    expect(body.purpose).toBe("report");
    expect(body.format).toBe("html");
    expect(body.status).toBe("draft");
    expect(body.sections).toHaveLength(22);
    expect(body.sections[0].sectionKey).toBe("hero");
    expect(body.sections[21].sectionKey).toBe("s05");
  });

  it("POST /offerings — rejects missing bizItemId", async () => {
    const res = await app.request("/api/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", purpose: "report", format: "html" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /offerings — rejects invalid purpose", async () => {
    const res = await app.request("/api/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bizItemId: "biz-1", title: "Test", purpose: "invalid", format: "html" }),
    });
    expect(res.status).toBe(400);
  });

  // ── GET /offerings ──

  it("GET /offerings — lists offerings", async () => {
    await app.request("/api/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bizItemId: "biz-1", title: "Offering 1", purpose: "report", format: "html" }),
    });
    await app.request("/api/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bizItemId: "biz-1", title: "Offering 2", purpose: "proposal", format: "pptx" }),
    });

    const res = await app.request("/api/offerings");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.items).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it("GET /offerings — filters by status", async () => {
    await app.request("/api/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bizItemId: "biz-1", title: "Draft", purpose: "report", format: "html" }),
    });

    const res = await app.request("/api/offerings?status=approved");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.items).toHaveLength(0);
  });

  it("GET /offerings — paginates", async () => {
    for (let i = 0; i < 3; i++) {
      await app.request("/api/offerings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "biz-1", title: `O${i}`, purpose: "report", format: "html" }),
      });
    }

    const res = await app.request("/api/offerings?page=1&limit=2");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.items).toHaveLength(2);
    expect(body.total).toBe(3);
  });

  // ── GET /offerings/:id ──

  it("GET /offerings/:id — returns offering with sections", async () => {
    const createRes = await app.request("/api/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bizItemId: "biz-1", title: "Detail Test", purpose: "review", format: "html" }),
    });
    const { id } = await json(createRes);

    const res = await app.request(`/api/offerings/${id}`);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.id).toBe(id);
    expect(body.sections).toHaveLength(22);
  });

  it("GET /offerings/:id — 404 for missing", async () => {
    const res = await app.request("/api/offerings/nonexistent");
    expect(res.status).toBe(404);
  });

  // ── PUT /offerings/:id ──

  it("PUT /offerings/:id — updates title", async () => {
    const createRes = await app.request("/api/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bizItemId: "biz-1", title: "Original", purpose: "report", format: "html" }),
    });
    const { id } = await json(createRes);

    const res = await app.request(`/api/offerings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated Title" }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.title).toBe("Updated Title");
  });

  it("PUT /offerings/:id — updates status", async () => {
    const createRes = await app.request("/api/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bizItemId: "biz-1", title: "Status Test", purpose: "report", format: "html" }),
    });
    const { id } = await json(createRes);

    const res = await app.request(`/api/offerings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "review" }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.status).toBe("review");
  });

  // ── DELETE /offerings/:id ──

  it("DELETE /offerings/:id — deletes offering", async () => {
    const createRes = await app.request("/api/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bizItemId: "biz-1", title: "To Delete", purpose: "report", format: "html" }),
    });
    const { id } = await json(createRes);

    const res = await app.request(`/api/offerings/${id}`, { method: "DELETE" });
    expect(res.status).toBe(204);

    const getRes = await app.request(`/api/offerings/${id}`);
    expect(getRes.status).toBe(404);
  });

  // ── Versions ──

  it("POST /offerings/:id/versions — creates version snapshot", async () => {
    const createRes = await app.request("/api/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bizItemId: "biz-1", title: "Version Test", purpose: "report", format: "html" }),
    });
    const { id } = await json(createRes);

    const res = await app.request(`/api/offerings/${id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changeSummary: "Initial sections filled" }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.version).toBe(2);
    expect(body.changeSummary).toBe("Initial sections filled");
    expect(body.snapshot).toBeTruthy();
  });

  it("GET /offerings/:id/versions — lists version history", async () => {
    const createRes = await app.request("/api/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bizItemId: "biz-1", title: "Versions List", purpose: "report", format: "html" }),
    });
    const { id } = await json(createRes);

    await app.request(`/api/offerings/${id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await app.request(`/api/offerings/${id}/versions`);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.versions).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  // ── Multi-tenancy ──

  it("multi-tenancy — different org cannot access offering", async () => {
    const createRes = await app.request("/api/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bizItemId: "biz-1", title: "Org Test", purpose: "report", format: "html" }),
    });
    const { id } = await json(createRes);

    const otherApp = new Hono<{ Bindings: Env }>();
    otherApp.use("*", async (c, next) => {
      c.set("orgId" as never, "org_other");
      c.set("jwtPayload" as never, { sub: "other-user" });
      await next();
    });
    otherApp.route("/api", offeringsRoute);

    const res = await otherApp.request(`/api/offerings/${id}`, {}, { DB: db } as unknown as Env);
    expect(res.status).toBe(404);
  });
});
