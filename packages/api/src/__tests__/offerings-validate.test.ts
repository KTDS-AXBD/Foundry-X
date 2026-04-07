/**
 * F373: Offering Validate API Tests (Sprint 168)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { offeringValidateRoute } from "../core/offering/routes/offering-validate.js";
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
  app.route("/api", offeringValidateRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

async function seedOffering(db: D1Database, id = "off-1") {
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT OR IGNORE INTO biz_items (id, org_id, title, created_by) VALUES ('biz-1', 'org_test', 'Test BizItem', 'test-user')`,
  );
  await (db as Any).exec(
    `INSERT INTO offerings (id, org_id, biz_item_id, title, purpose, format, status, current_version, created_by)
     VALUES ('${id}', 'org_test', 'biz-1', 'Healthcare AI 사업기획서', 'report', 'html', 'draft', 1, 'test-user')`,
  );
}

async function seedSectionWithContent(db: D1Database, offeringId: string, key: string, title: string, content: string) {
  const id = `sec-${key}`;
  await (db as Any).exec(
    `INSERT INTO offering_sections (id, offering_id, section_key, title, content, sort_order, is_required, is_included)
     VALUES ('${id}', '${offeringId}', '${key}', '${title}', '${content}', 0, 1, 1)`,
  );
}

const json = (res: Response) => res.json() as Promise<Any>;

describe("Offering Validate API", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  // ── POST /offerings/:id/validate ──

  it("POST /offerings/:id/validate — creates validation with all sections filled", async () => {
    await seedOffering(db);
    await seedSectionWithContent(db, "off-1", "hero", "Hero", "Healthcare AI overview");
    await seedSectionWithContent(db, "off-1", "exec_summary", "Executive Summary", "Summary content");

    const res = await app.request("/api/offerings/off-1/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.id).toBeTruthy();
    expect(body.offeringId).toBe("off-1");
    expect(body.mode).toBe("full");
    expect(body.status).toBe("passed");
    expect(body.ganScore).toBe(1.0);
    expect(body.completedAt).toBeTruthy();
  });

  it("POST /offerings/:id/validate — fails with empty sections", async () => {
    await seedOffering(db);
    // Section with no content
    await (db as Any).exec(
      `INSERT INTO offering_sections (id, offering_id, section_key, title, content, sort_order, is_required, is_included)
       VALUES ('sec-empty', 'off-1', 'hero', 'Hero', '', 0, 1, 1)`,
    );

    const res = await app.request("/api/offerings/off-1/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.status).toBe("failed");
    expect(body.ganScore).toBe(0.0);
  });

  it("POST /offerings/:id/validate — mode=quick", async () => {
    await seedOffering(db);
    await seedSectionWithContent(db, "off-1", "hero", "Hero", "Content");

    const res = await app.request("/api/offerings/off-1/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "quick" }),
    });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.mode).toBe("quick");
  });

  it("POST /offerings/:id/validate — 404 for non-existent offering", async () => {
    const res = await app.request("/api/offerings/non-existent/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(404);
  });

  // ── GET /offerings/:id/validations ──

  it("GET /offerings/:id/validations — returns validation history", async () => {
    await seedOffering(db);
    await seedSectionWithContent(db, "off-1", "hero", "Hero", "Content");

    // Run two validations
    await app.request("/api/offerings/off-1/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await app.request("/api/offerings/off-1/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "quick" }),
    });

    const res = await app.request("/api/offerings/off-1/validations");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.validations).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it("GET /offerings/:id/validations — empty for non-existent offering", async () => {
    const res = await app.request("/api/offerings/non-existent/validations");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.validations).toHaveLength(0);
  });
});
