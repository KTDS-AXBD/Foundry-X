import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { gtmOutreachRoute } from "../routes/gtm-outreach.js";
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
    company_size TEXT,
    notes TEXT,
    tags TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS offering_packs (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL,
    share_token TEXT,
    share_expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS offering_pack_items (
    id TEXT PRIMARY KEY,
    pack_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS gtm_outreach (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    customer_id TEXT NOT NULL REFERENCES gtm_customers(id),
    offering_pack_id TEXT REFERENCES offering_packs(id),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
      CHECK(status IN ('draft', 'proposal_ready', 'sent', 'opened', 'responded', 'meeting_set', 'converted', 'declined', 'archived')),
    proposal_content TEXT,
    proposal_generated_at TEXT,
    sent_at TEXT,
    response_note TEXT,
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
  app.route("/api", gtmOutreachRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(`http://localhost${path}`, init, { DB: db } as unknown as Env),
  };
}

async function seedData(db: D1Database) {
  const exec = (q: string) => (db as unknown as { exec: (q: string) => Promise<void> }).exec(q);
  await exec(`INSERT INTO gtm_customers (id, org_id, company_name, industry, created_by) VALUES ('cust-1', 'org_test', 'KTDS', 'IT', 'u1')`);
  await exec(`INSERT INTO offering_packs (id, biz_item_id, org_id, title, created_by) VALUES ('pack-1', 'biz-1', 'org_test', 'AI 패키지', 'u1')`);
  await exec(`INSERT INTO offering_pack_items (id, pack_id, item_type, title, content, sort_order) VALUES ('item-1', 'pack-1', 'proposal', 'AI 도입', '생산성 향상', 0)`);
}

describe("GTM Outreach Route (F299)", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    const db = mockDb as unknown as D1Database;
    await seedData(db);
    app = createApp(db);
  });

  it("POST /api/gtm/outreach — creates outreach", async () => {
    const res = await app.request("/api/gtm/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: "cust-1", offeringPackId: "pack-1", title: "KTDS 제안" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe("draft");
  });

  it("POST /api/gtm/outreach — 400 on invalid", async () => {
    const res = await app.request("/api/gtm/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("GET /api/gtm/outreach — lists outreach", async () => {
    await app.request("/api/gtm/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: "cust-1", title: "테스트" }),
    });
    const res = await app.request("/api/gtm/outreach");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.items).toHaveLength(1);
  });

  it("GET /api/gtm/outreach/stats — returns stats", async () => {
    await app.request("/api/gtm/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: "cust-1", title: "A" }),
    });
    const res = await app.request("/api/gtm/outreach/stats");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.total).toBe(1);
  });

  it("GET /api/gtm/outreach/:id — returns detail", async () => {
    const createRes = await app.request("/api/gtm/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: "cust-1", title: "상세보기" }),
    });
    const created = await createRes.json() as Record<string, unknown>;
    const res = await app.request(`/api/gtm/outreach/${created.id}`);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.customerName).toBe("KTDS");
  });

  it("PATCH /api/gtm/outreach/:id/status — updates status", async () => {
    const createRes = await app.request("/api/gtm/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: "cust-1", title: "상태변경" }),
    });
    const created = await createRes.json() as Record<string, unknown>;
    const res = await app.request(`/api/gtm/outreach/${created.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "declined", responseNote: "예산 부족" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe("declined");
  });

  it("PATCH /api/gtm/outreach/:id/status — 400 on invalid transition", async () => {
    const createRes = await app.request("/api/gtm/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: "cust-1", title: "잘못된전이" }),
    });
    const created = await createRes.json() as Record<string, unknown>;
    const res = await app.request(`/api/gtm/outreach/${created.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "converted" }),
    });
    expect(res.status).toBe(400);
  });

  it("DELETE /api/gtm/outreach/:id — deletes draft", async () => {
    const createRes = await app.request("/api/gtm/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: "cust-1", title: "삭제" }),
    });
    const created = await createRes.json() as Record<string, unknown>;
    const res = await app.request(`/api/gtm/outreach/${created.id}`, { method: "DELETE" });
    expect(res.status).toBe(200);
  });

  it("POST /api/gtm/outreach/:id/generate — generates proposal", async () => {
    const createRes = await app.request("/api/gtm/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: "cust-1", offeringPackId: "pack-1", title: "제안서생성" }),
    });
    const created = await createRes.json() as Record<string, unknown>;
    const res = await app.request(`/api/gtm/outreach/${created.id}/generate`, { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.content).toContain("KTDS");
  });

  it("POST /api/gtm/outreach/:id/generate — 400 no pack", async () => {
    const createRes = await app.request("/api/gtm/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: "cust-1", title: "패키지없음" }),
    });
    const created = await createRes.json() as Record<string, unknown>;
    const res = await app.request(`/api/gtm/outreach/${created.id}/generate`, { method: "POST" });
    expect(res.status).toBe(400);
  });
});
