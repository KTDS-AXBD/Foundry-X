import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { validationMeetingsRoute } from "../modules/gate/routes/validation-meetings.js";
import { Hono } from "hono";
import type { Env } from "../env.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS expert_meetings (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    biz_item_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'interview',
    title TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    attendees TEXT NOT NULL DEFAULT '[]',
    location TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_expert_meetings_org ON expert_meetings(org_id, biz_item_id);
`;

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", validationMeetingsRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

describe("Validation Meetings Routes (F295)", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  describe("POST /api/validation/meetings", () => {
    it("creates a meeting", async () => {
      const res = await app.request("/api/validation/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bizItemId: "item-1",
          title: "Expert Interview",
          scheduledAt: "2026-04-10T10:00:00Z",
          attendees: ["user-1", "user-2"],
          location: "회의실 A",
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json() as Record<string, unknown>;
      expect(body.title).toBe("Expert Interview");
      expect(body.type).toBe("interview");
      expect(body.status).toBe("scheduled");
      expect(body.attendees).toEqual(["user-1", "user-2"]);
    });

    it("creates with minimal fields", async () => {
      const res = await app.request("/api/validation/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bizItemId: "item-1",
          title: "Quick Chat",
          scheduledAt: "2026-04-11T14:00:00Z",
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json() as Record<string, unknown>;
      expect(body.attendees).toEqual([]);
    });

    it("returns 400 for missing title", async () => {
      const res = await app.request("/api/validation/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", scheduledAt: "2026-04-10T10:00:00Z" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/validation/meetings", () => {
    it("lists meetings", async () => {
      // Create 2 meetings
      await app.request("/api/validation/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", title: "Meeting 1", scheduledAt: "2026-04-10T10:00:00Z" }),
      });
      await app.request("/api/validation/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", title: "Meeting 2", scheduledAt: "2026-04-11T10:00:00Z" }),
      });

      const res = await app.request("/api/validation/meetings");
      expect(res.status).toBe(200);
      const body = await res.json() as { items: unknown[]; total: number };
      expect(body.items).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it("filters by bizItemId", async () => {
      await app.request("/api/validation/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", title: "M1", scheduledAt: "2026-04-10T10:00:00Z" }),
      });
      await app.request("/api/validation/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-2", title: "M2", scheduledAt: "2026-04-11T10:00:00Z" }),
      });

      const res = await app.request("/api/validation/meetings?bizItemId=item-1");
      expect(res.status).toBe(200);
      const body = await res.json() as { items: unknown[]; total: number };
      expect(body.items).toHaveLength(1);
    });
  });

  describe("GET /api/validation/meetings/:id", () => {
    it("returns meeting by id", async () => {
      const createRes = await app.request("/api/validation/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", title: "Test", scheduledAt: "2026-04-10T10:00:00Z" }),
      });
      const created = await createRes.json() as { id: string };

      const res = await app.request(`/api/validation/meetings/${created.id}`);
      expect(res.status).toBe(200);
      const body = await res.json() as { title: string };
      expect(body.title).toBe("Test");
    });

    it("returns 404 for non-existent", async () => {
      const res = await app.request("/api/validation/meetings/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/validation/meetings/:id", () => {
    it("updates meeting fields", async () => {
      const createRes = await app.request("/api/validation/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", title: "Original", scheduledAt: "2026-04-10T10:00:00Z" }),
      });
      const created = await createRes.json() as { id: string };

      const res = await app.request(`/api/validation/meetings/${created.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated", status: "completed", notes: "Great discussion" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json() as { title: string; status: string; notes: string };
      expect(body.title).toBe("Updated");
      expect(body.status).toBe("completed");
      expect(body.notes).toBe("Great discussion");
    });

    it("returns 404 for non-existent", async () => {
      const res = await app.request("/api/validation/meetings/nonexistent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "test" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/validation/meetings/:id", () => {
    it("deletes meeting", async () => {
      const createRes = await app.request("/api/validation/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", title: "ToDelete", scheduledAt: "2026-04-10T10:00:00Z" }),
      });
      const created = await createRes.json() as { id: string };

      const res = await app.request(`/api/validation/meetings/${created.id}`, { method: "DELETE" });
      expect(res.status).toBe(200);

      // Verify deleted
      const getRes = await app.request(`/api/validation/meetings/${created.id}`);
      expect(getRes.status).toBe(404);
    });

    it("returns 404 for non-existent", async () => {
      const res = await app.request("/api/validation/meetings/nonexistent", { method: "DELETE" });
      expect(res.status).toBe(404);
    });
  });
});
