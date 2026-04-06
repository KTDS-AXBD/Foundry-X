/**
 * F371: Offering Sections API Tests (Sprint 167)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { offeringsRoute } from "../routes/offerings.js";
import { offeringSectionsRoute } from "../routes/offering-sections.js";
import { Hono } from "hono";
import type { Env } from "../env.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const json = (res: Response) => res.json() as Promise<Any>;

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", offeringsRoute);
  app.route("/api", offeringSectionsRoute);
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

async function createOffering(app: ReturnType<typeof createApp>) {
  const res = await app.request("/api/offerings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bizItemId: "biz-1",
      title: "Test Offering",
      purpose: "report",
      format: "html",
    }),
  });
  return json(res);
}

describe("Offering Sections API", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    db = mockDb as unknown as D1Database;
    await seedBizItem(db);
    app = createApp(db);
  });

  // ── GET sections ──

  it("GET /offerings/:id/sections — returns 22 sections", async () => {
    const offering = await createOffering(app);
    const res = await app.request(`/api/offerings/${offering.id}/sections`);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.sections).toHaveLength(22);
    expect(body.sections[0].sectionKey).toBe("hero");
    expect(body.sections[0].isRequired).toBe(true);
  });

  // ── PUT section ──

  it("PUT section — updates content", async () => {
    const offering = await createOffering(app);
    const sectionsRes = await app.request(`/api/offerings/${offering.id}/sections`);
    const { sections } = await json(sectionsRes);
    const heroId = sections[0].id;

    const res = await app.request(`/api/offerings/${offering.id}/sections/${heroId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "# Healthcare AI" }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.content).toBe("# Healthcare AI");
  });

  it("PUT section — updates title", async () => {
    const offering = await createOffering(app);
    const sectionsRes = await app.request(`/api/offerings/${offering.id}/sections`);
    const { sections } = await json(sectionsRes);
    const sectionId = sections[2].id;

    const res = await app.request(`/api/offerings/${offering.id}/sections/${sectionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Custom Title" }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.title).toBe("Custom Title");
  });

  // ── PATCH toggle ──

  it("PATCH toggle — toggles optional section off", async () => {
    const offering = await createOffering(app);
    const sectionsRes = await app.request(`/api/offerings/${offering.id}/sections`);
    const { sections } = await json(sectionsRes);
    const optionalSection = sections.find((s: Any) => s.sectionKey === "s02_4");

    const res = await app.request(
      `/api/offerings/${offering.id}/sections/${optionalSection.id}/toggle`,
      { method: "PATCH" },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.isIncluded).toBe(false);
  });

  it("PATCH toggle — toggles section back on", async () => {
    const offering = await createOffering(app);
    const sectionsRes = await app.request(`/api/offerings/${offering.id}/sections`);
    const { sections } = await json(sectionsRes);
    const optionalSection = sections.find((s: Any) => s.sectionKey === "s02_4");

    // Toggle off
    await app.request(
      `/api/offerings/${offering.id}/sections/${optionalSection.id}/toggle`,
      { method: "PATCH" },
    );
    // Toggle back on
    const res = await app.request(
      `/api/offerings/${offering.id}/sections/${optionalSection.id}/toggle`,
      { method: "PATCH" },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.isIncluded).toBe(true);
  });

  it("PATCH toggle — rejects toggling required section", async () => {
    const offering = await createOffering(app);
    const sectionsRes = await app.request(`/api/offerings/${offering.id}/sections`);
    const { sections } = await json(sectionsRes);
    const requiredSection = sections[0]; // hero is required

    const res = await app.request(
      `/api/offerings/${offering.id}/sections/${requiredSection.id}/toggle`,
      { method: "PATCH" },
    );
    expect(res.status).toBe(400);
  });

  // ── POST init ──

  it("POST init — reinitializes all 22 sections", async () => {
    const offering = await createOffering(app);
    const res = await app.request(`/api/offerings/${offering.id}/sections/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includeOptional: true }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.sections).toHaveLength(22);
  });

  it("POST init — includeOptional=false returns only required", async () => {
    const offering = await createOffering(app);
    const res = await app.request(`/api/offerings/${offering.id}/sections/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includeOptional: false }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    // 22 total - 2 optional (s02_4, s02_5) = 20
    expect(body.sections).toHaveLength(20);
    expect(body.sections.every((s: Any) => s.isRequired)).toBe(true);
  });

  it("POST init — replaces existing sections", async () => {
    const offering = await createOffering(app);

    // Modify a section first
    const sectionsRes = await app.request(`/api/offerings/${offering.id}/sections`);
    const { sections } = await json(sectionsRes);
    await app.request(`/api/offerings/${offering.id}/sections/${sections[0].id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Modified" }),
    });

    // Re-init
    const res = await app.request(`/api/offerings/${offering.id}/sections/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.sections).toHaveLength(22);
    expect(body.sections[0].content).toBeNull();
  });

  // ── PUT reorder ──

  it("PUT reorder — changes section order", async () => {
    const offering = await createOffering(app);
    const sectionsRes = await app.request(`/api/offerings/${offering.id}/sections`);
    const { sections } = await json(sectionsRes);

    const reorderedIds = [sections[2].id, sections[1].id, sections[0].id, ...sections.slice(3).map((s: Any) => s.id)];

    const res = await app.request(`/api/offerings/${offering.id}/sections/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionIds: reorderedIds }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.sections[0].id).toBe(sections[2].id);
    expect(body.sections[0].sortOrder).toBe(0);
  });

  it("PUT reorder — rejects empty array", async () => {
    const offering = await createOffering(app);
    const res = await app.request(`/api/offerings/${offering.id}/sections/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionIds: [] }),
    });
    expect(res.status).toBe(400);
  });

  // ── 404 for missing offering ──

  it("GET sections — 404 for nonexistent offering", async () => {
    const res = await app.request("/api/offerings/nonexistent/sections");
    expect(res.status).toBe(404);
  });
});
