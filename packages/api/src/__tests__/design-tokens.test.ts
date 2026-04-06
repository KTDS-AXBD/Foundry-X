/**
 * F381: Design Token API Tests (Sprint 173)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { designTokensRoute } from "../routes/design-tokens.js";
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
  app.route("/api", designTokensRoute);
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

async function seedOffering(db: D1Database, id = "off-1") {
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT OR IGNORE INTO offerings (id, org_id, biz_item_id, title, purpose, format, status, current_version, created_by)
     VALUES ('${id}', 'org_test', 'biz-1', 'Test Offering', 'report', 'html', 'draft', 1, 'test-user')`,
  );
}

const json = (res: Response) => res.json() as Promise<Any>;

describe("Design Token API", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    db = mockDb as unknown as D1Database;
    await seedBizItem(db);
    await seedOffering(db);
    app = createApp(db);
  });

  // ── GET /offerings/:id/tokens ──

  it("GET /tokens — returns empty array initially", async () => {
    const res = await app.request("/api/offerings/off-1/tokens");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.tokens).toHaveLength(0);
  });

  it("GET /tokens — 404 for non-existent offering", async () => {
    const res = await app.request("/api/offerings/nonexistent/tokens");
    expect(res.status).toBe(404);
  });

  // ── PUT /offerings/:id/tokens ──

  it("PUT /tokens — bulk upsert tokens", async () => {
    const res = await app.request("/api/offerings/off-1/tokens", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokens: [
          { tokenKey: "color.text.primary", tokenValue: "#222", tokenCategory: "color" },
          { tokenKey: "typography.body.size", tokenValue: "16px", tokenCategory: "typography" },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.tokens).toHaveLength(2);
    expect(body.tokens[0].tokenKey).toBe("color.text.primary");
    expect(body.tokens[0].tokenValue).toBe("#222");
  });

  it("PUT /tokens — upsert updates existing token", async () => {
    // First insert
    await app.request("/api/offerings/off-1/tokens", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokens: [{ tokenKey: "color.text.primary", tokenValue: "#111", tokenCategory: "color" }],
      }),
    });

    // Upsert with new value
    await app.request("/api/offerings/off-1/tokens", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokens: [{ tokenKey: "color.text.primary", tokenValue: "#333", tokenCategory: "color" }],
      }),
    });

    const res = await app.request("/api/offerings/off-1/tokens");
    const body = await json(res);
    expect(body.tokens).toHaveLength(1);
    expect(body.tokens[0].tokenValue).toBe("#333");
  });

  it("PUT /tokens — rejects invalid data (empty tokens)", async () => {
    const res = await app.request("/api/offerings/off-1/tokens", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens: [] }),
    });
    expect(res.status).toBe(400);
  });

  it("PUT /tokens — rejects invalid category", async () => {
    const res = await app.request("/api/offerings/off-1/tokens", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokens: [{ tokenKey: "foo", tokenValue: "bar", tokenCategory: "invalid" }],
      }),
    });
    expect(res.status).toBe(400);
  });

  it("PUT /tokens — 404 for non-existent offering", async () => {
    const res = await app.request("/api/offerings/nonexistent/tokens", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokens: [{ tokenKey: "color.text.primary", tokenValue: "#111", tokenCategory: "color" }],
      }),
    });
    expect(res.status).toBe(404);
  });

  // ── GET /offerings/:id/tokens/json ──

  it("GET /tokens/json — returns grouped by category", async () => {
    await app.request("/api/offerings/off-1/tokens", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokens: [
          { tokenKey: "color.text.primary", tokenValue: "#111", tokenCategory: "color" },
          { tokenKey: "typography.body.size", tokenValue: "15px", tokenCategory: "typography" },
          { tokenKey: "layout.maxWidth", tokenValue: "1200px", tokenCategory: "layout" },
          { tokenKey: "spacing.grid.gap", tokenValue: "20px", tokenCategory: "spacing" },
        ],
      }),
    });

    const res = await app.request("/api/offerings/off-1/tokens/json");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.color["color.text.primary"]).toBe("#111");
    expect(body.typography["typography.body.size"]).toBe("15px");
    expect(body.layout["layout.maxWidth"]).toBe("1200px");
    expect(body.spacing["spacing.grid.gap"]).toBe("20px");
  });

  it("GET /tokens/json — empty categories when no tokens", async () => {
    const res = await app.request("/api/offerings/off-1/tokens/json");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.color).toEqual({});
    expect(body.typography).toEqual({});
    expect(body.layout).toEqual({});
    expect(body.spacing).toEqual({});
  });

  // ── POST /offerings/:id/tokens/reset ──

  it("POST /tokens/reset — inserts default tokens", async () => {
    const res = await app.request("/api/offerings/off-1/tokens/reset", {
      method: "POST",
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.tokens.length).toBe(18); // 7 color + 5 typography + 3 layout + 3 spacing
    const keys = body.tokens.map((t: Any) => t.tokenKey);
    expect(keys).toContain("color.text.primary");
    expect(keys).toContain("typography.hero.size");
    expect(keys).toContain("layout.maxWidth");
    expect(keys).toContain("spacing.grid.gap");
  });

  it("POST /tokens/reset — replaces existing tokens", async () => {
    // Add custom token
    await app.request("/api/offerings/off-1/tokens", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokens: [{ tokenKey: "custom.key", tokenValue: "custom-value", tokenCategory: "color" }],
      }),
    });

    // Reset
    const res = await app.request("/api/offerings/off-1/tokens/reset", {
      method: "POST",
    });
    const body = await json(res);
    expect(body.tokens.length).toBe(18);
    const keys = body.tokens.map((t: Any) => t.tokenKey);
    expect(keys).not.toContain("custom.key");
  });

  it("POST /tokens/reset — 404 for non-existent offering", async () => {
    const res = await app.request("/api/offerings/nonexistent/tokens/reset", {
      method: "POST",
    });
    expect(res.status).toBe(404);
  });
});
