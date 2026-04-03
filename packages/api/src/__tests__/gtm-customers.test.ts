import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { gtmCustomersRoute } from "../routes/gtm-customers.js";
import { Hono } from "hono";
import type { Env } from "../env.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS gtm_customers (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    industry TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_role TEXT,
    company_size TEXT CHECK(company_size IN ('startup', 'smb', 'mid', 'enterprise')),
    notes TEXT,
    tags TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", gtmCustomersRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(`http://localhost${path}`, init, { DB: db } as unknown as Env),
  };
}

describe("GTM Customers Route (F299)", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    app = createApp(mockDb as unknown as D1Database);
  });

  it("POST /api/gtm/customers — creates customer", async () => {
    const res = await app.request("/api/gtm/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName: "KTDS", industry: "IT", companySize: "enterprise" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.companyName).toBe("KTDS");
  });

  it("POST /api/gtm/customers — 400 on invalid", async () => {
    const res = await app.request("/api/gtm/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("GET /api/gtm/customers — lists customers", async () => {
    await app.request("/api/gtm/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName: "A사" }),
    });
    const res = await app.request("/api/gtm/customers");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.items).toHaveLength(1);
  });

  it("GET /api/gtm/customers/:id — returns customer", async () => {
    const createRes = await app.request("/api/gtm/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName: "B사" }),
    });
    const created = await createRes.json() as Record<string, unknown>;
    const res = await app.request(`/api/gtm/customers/${created.id}`);
    expect(res.status).toBe(200);
  });

  it("GET /api/gtm/customers/:id — 404 not found", async () => {
    const res = await app.request("/api/gtm/customers/nonexistent");
    expect(res.status).toBe(404);
  });

  it("PATCH /api/gtm/customers/:id — updates", async () => {
    const createRes = await app.request("/api/gtm/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName: "원래" }),
    });
    const created = await createRes.json() as Record<string, unknown>;
    const res = await app.request(`/api/gtm/customers/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName: "수정됨" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.companyName).toBe("수정됨");
  });

  it("PATCH /api/gtm/customers/:id — 404 not found", async () => {
    const res = await app.request("/api/gtm/customers/nonexistent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName: "X" }),
    });
    expect(res.status).toBe(404);
  });
});
