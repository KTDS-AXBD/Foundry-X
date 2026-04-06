import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { shareLinksRoute } from "../modules/launch/routes/share-links.js";
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
  CREATE TABLE IF NOT EXISTS share_links (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    access_level TEXT NOT NULL DEFAULT 'view',
    expires_at TEXT,
    created_by TEXT NOT NULL,
    revoked_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
  );
  CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    type TEXT NOT NULL,
    biz_item_id TEXT,
    title TEXT NOT NULL,
    body TEXT,
    actor_id TEXT,
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", shareLinksRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

describe("ShareLinks Routes (F233)", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    await mockDb.exec(
      `INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('item-1', 'org_test', 'Test Item', 'test-user')`,
    );
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  describe("POST /api/share-links", () => {
    it("creates a share link", async () => {
      const res = await app.request("/api/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", accessLevel: "view" }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { token: string; accessLevel: string };
      expect(body.token).toBeTruthy();
      expect(body.accessLevel).toBe("view");
    });

    it("creates with expiration", async () => {
      const res = await app.request("/api/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", accessLevel: "edit", expiresInDays: 7 }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { expiresAt: string | null };
      expect(body.expiresAt).toBeTruthy();
    });

    it("returns 400 for missing bizItemId", async () => {
      const res = await app.request("/api/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessLevel: "view" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/share-links", () => {
    it("returns user share links", async () => {
      await app.request("/api/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1" }),
      });

      const res = await app.request("/api/share-links");
      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(body).toHaveLength(1);
    });
  });

  describe("DELETE /api/share-links/:id", () => {
    it("revokes a share link", async () => {
      const createRes = await app.request("/api/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1" }),
      });
      const link = (await createRes.json()) as { id: string };

      const res = await app.request(`/api/share-links/${link.id}`, { method: "DELETE" });
      expect(res.status).toBe(200);

      // Should not appear in list
      const listRes = await app.request("/api/share-links");
      const list = (await listRes.json()) as unknown[];
      expect(list).toHaveLength(0);
    });

    it("returns 404 for non-existent link", async () => {
      const res = await app.request("/api/share-links/non-existent", { method: "DELETE" });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/share-links/:id/review-request", () => {
    it("sends review request notifications", async () => {
      const createRes = await app.request("/api/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1" }),
      });
      const link = (await createRes.json()) as { id: string };

      const res = await app.request(`/api/share-links/${link.id}/review-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientIds: ["user-a", "user-b"], message: "Please review" }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { notified: number };
      expect(body.notified).toBe(2);
    });

    it("returns 400 for empty recipients", async () => {
      const res = await app.request("/api/share-links/some-id/review-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientIds: [] }),
      });
      expect(res.status).toBe(400);
    });
  });
});
