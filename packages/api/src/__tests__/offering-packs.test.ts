import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { offeringPacksRoute } from "../routes/offering-packs.js";
import { Hono } from "hono";
import type { Env } from "../env.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS biz_items (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'active',
    created_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS offering_packs (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
      CHECK(status IN ('draft','review','approved','shared')),
    created_by TEXT NOT NULL,
    share_token TEXT UNIQUE,
    share_expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
  );
  CREATE TABLE IF NOT EXISTS offering_pack_items (
    id TEXT PRIMARY KEY,
    pack_id TEXT NOT NULL,
    item_type TEXT NOT NULL
      CHECK(item_type IN ('proposal','demo_link','tech_review','pricing','prototype','bmc','custom')),
    title TEXT NOT NULL,
    content TEXT,
    url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (pack_id) REFERENCES offering_packs(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_offering_packs_biz_item ON offering_packs(biz_item_id);
  CREATE INDEX IF NOT EXISTS idx_offering_packs_org ON offering_packs(org_id, status);
  CREATE INDEX IF NOT EXISTS idx_offering_pack_items_pack ON offering_pack_items(pack_id, sort_order);
`;

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", offeringPacksRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

async function seedBizItem(db: D1Database, id: string = "biz-1") {
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('${id}', 'org_test', 'Test BizItem', 'test-user')`,
  );
}

async function seedPack(
  app: ReturnType<typeof createApp>,
  bizItemId: string = "biz-1",
  title: string = "Test Pack",
): Promise<string> {
  const res = await app.request("/api/offering-packs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bizItemId, title }),
  });
  const body = (await res.json()) as { id: string };
  return body.id;
}

describe("Offering Packs Routes (F236)", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  describe("POST /api/offering-packs", () => {
    it("creates offering pack with status draft", async () => {
      await seedBizItem(db);

      const res = await app.request("/api/offering-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "biz-1", title: "Sales Pack Q1" }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { status: string; title: string; createdBy: string };
      expect(body.status).toBe("draft");
      expect(body.title).toBe("Sales Pack Q1");
      expect(body.createdBy).toBe("test-user");
    });

    it("creates offering pack with optional description", async () => {
      await seedBizItem(db);

      const res = await app.request("/api/offering-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "biz-1", title: "Pack with desc", description: "A detailed description" }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { description: string };
      expect(body.description).toBe("A detailed description");
    });

    it("returns 400 for missing title", async () => {
      await seedBizItem(db);

      const res = await app.request("/api/offering-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "biz-1" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing bizItemId", async () => {
      const res = await app.request("/api/offering-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "No BizItem" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/offering-packs", () => {
    it("returns empty list when no packs exist", async () => {
      const res = await app.request("/api/offering-packs");
      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(0);
    });

    it("lists created packs", async () => {
      await seedBizItem(db);
      await seedPack(app);

      const res = await app.request("/api/offering-packs");
      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(body).toHaveLength(1);
    });

    it("filters by status", async () => {
      await seedBizItem(db);
      await seedPack(app, "biz-1", "Draft Pack");

      const res = await app.request("/api/offering-packs?status=draft");
      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(body).toHaveLength(1);

      const resReview = await app.request("/api/offering-packs?status=review");
      expect(resReview.status).toBe(200);
      const bodyReview = (await resReview.json()) as unknown[];
      expect(bodyReview).toHaveLength(0);
    });
  });

  describe("GET /api/offering-packs/:id", () => {
    it("returns pack detail with items array", async () => {
      await seedBizItem(db);
      const packId = await seedPack(app);

      const res = await app.request(`/api/offering-packs/${packId}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { id: string; items: unknown[] };
      expect(body.id).toBe(packId);
      expect(Array.isArray(body.items)).toBe(true);
    });

    it("returns 404 for unknown pack", async () => {
      const res = await app.request("/api/offering-packs/unknown-id");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/offering-packs/:id/items", () => {
    it("adds item to pack (201)", async () => {
      await seedBizItem(db);
      const packId = await seedPack(app);

      const res = await app.request(`/api/offering-packs/${packId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType: "proposal", title: "Sales Proposal Doc" }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { itemType: string; title: string };
      expect(body.itemType).toBe("proposal");
      expect(body.title).toBe("Sales Proposal Doc");
    });

    it("adds demo_link item with url", async () => {
      await seedBizItem(db);
      const packId = await seedPack(app);

      const res = await app.request(`/api/offering-packs/${packId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: "demo_link",
          title: "Live Demo",
          url: "https://demo.example.com",
        }),
      });
      expect(res.status).toBe(201);
    });

    it("returns 400 for invalid item type", async () => {
      await seedBizItem(db);
      const packId = await seedPack(app);

      const res = await app.request(`/api/offering-packs/${packId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType: "invalid_type", title: "Bad Item" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing title", async () => {
      await seedBizItem(db);
      const packId = await seedPack(app);

      const res = await app.request(`/api/offering-packs/${packId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType: "proposal" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/offering-packs/:id/status", () => {
    it("advances draft to review", async () => {
      await seedBizItem(db);
      const packId = await seedPack(app);

      const res = await app.request(`/api/offering-packs/${packId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "review" }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string };
      expect(body.status).toBe("review");
    });

    it("returns 400 for invalid status transition (draft → shared)", async () => {
      await seedBizItem(db);
      const packId = await seedPack(app);

      const res = await app.request(`/api/offering-packs/${packId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "shared" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid status value", async () => {
      await seedBizItem(db);
      const packId = await seedPack(app);

      const res = await app.request(`/api/offering-packs/${packId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/offering-packs/:id/share", () => {
    it("creates share link when pack is approved", async () => {
      await seedBizItem(db);
      const packId = await seedPack(app);

      // Advance to approved
      await app.request(`/api/offering-packs/${packId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "review" }),
      });
      await app.request(`/api/offering-packs/${packId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      const res = await app.request(`/api/offering-packs/${packId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: 30 }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { shareToken: string };
      expect(body.shareToken).toBeTruthy();
    });

    it("returns 400 when pack is still in draft (not shareable)", async () => {
      await seedBizItem(db);
      const packId = await seedPack(app);

      const res = await app.request(`/api/offering-packs/${packId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });
});
