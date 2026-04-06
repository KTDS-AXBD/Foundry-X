import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { notificationsRoute } from "../modules/portal/routes/notifications.js";
import { Hono } from "hono";
import type { Env } from "../env.js";

const DDL = `
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
  CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, read_at, created_at DESC);
`;

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", notificationsRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

async function seedNotification(db: D1Database, id: string, readAt: string | null = null) {
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT INTO notifications (id, org_id, recipient_id, type, title, read_at)
     VALUES ('${id}', 'org_test', 'test-user', 'stage_change', 'Test notification', ${readAt ? `'${readAt}'` : "NULL"})`,
  );
}

describe("Notifications Routes (F233)", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  describe("GET /api/notifications", () => {
    it("returns empty list", async () => {
      const res = await app.request("/api/notifications");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { notifications: unknown[]; unreadCount: number };
      expect(body.notifications).toEqual([]);
      expect(body.unreadCount).toBe(0);
    });

    it("returns notifications with unread count", async () => {
      await seedNotification(db, "n-1");
      await seedNotification(db, "n-2");
      await seedNotification(db, "n-3", "2026-01-01T00:00:00Z");

      const res = await app.request("/api/notifications");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { notifications: unknown[]; unreadCount: number };
      expect(body.notifications).toHaveLength(3);
      expect(body.unreadCount).toBe(2);
    });

    it("filters unread only", async () => {
      await seedNotification(db, "n-1");
      await seedNotification(db, "n-2", "2026-01-01T00:00:00Z");

      const res = await app.request("/api/notifications?unreadOnly=true");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { notifications: unknown[] };
      expect(body.notifications).toHaveLength(1);
    });
  });

  describe("PATCH /api/notifications/:id/read", () => {
    it("marks notification as read", async () => {
      await seedNotification(db, "n-1");

      const res = await app.request("/api/notifications/n-1/read", { method: "PATCH" });
      expect(res.status).toBe(200);

      // Verify it's now read
      const listRes = await app.request("/api/notifications?unreadOnly=true");
      const body = (await listRes.json()) as { notifications: unknown[] };
      expect(body.notifications).toHaveLength(0);
    });

    it("returns 404 for non-existent notification", async () => {
      const res = await app.request("/api/notifications/non-existent/read", { method: "PATCH" });
      expect(res.status).toBe(404);
    });
  });
});
