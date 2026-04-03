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
  CREATE TABLE IF NOT EXISTS offering_briefs (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    offering_pack_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    target_audience TEXT,
    meeting_type TEXT NOT NULL DEFAULT 'initial'
      CHECK(meeting_type IN ('initial','followup','demo','closing')),
    generated_by TEXT NOT NULL DEFAULT 'ai',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    FOREIGN KEY (offering_pack_id) REFERENCES offering_packs(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_offering_briefs_pack ON offering_briefs(offering_pack_id);
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

async function seedPack(app: ReturnType<typeof createApp>, bizItemId = "biz-1", title = "Test Pack"): Promise<string> {
  const res = await app.request("/api/offering-packs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bizItemId, title, description: "A test offering pack" }),
  });
  const body = (await res.json()) as { id: string };
  return body.id;
}

async function seedPackWithItems(app: ReturnType<typeof createApp>, packId: string): Promise<void> {
  await app.request(`/api/offering-packs/${packId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemType: "proposal", title: "기술 제안서", content: "AI 기반 솔루션 제안" }),
  });
  await app.request(`/api/offering-packs/${packId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemType: "pricing", title: "가격표", content: "월 100만원~" }),
  });
}

describe("Offering Brief Routes (F293)", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  describe("POST /api/offering-packs/:id/brief", () => {
    it("creates a brief from offering pack", async () => {
      await seedBizItem(db);
      const packId = await seedPack(app);
      await seedPackWithItems(app, packId);

      const res = await app.request(`/api/offering-packs/${packId}/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as { title: string; content: string; meetingType: string; generatedBy: string };
      expect(body.title).toContain("Brief");
      expect(body.content).toContain("Test Pack");
      expect(body.meetingType).toBe("initial");
      expect(body.generatedBy).toBe("ai");
    });

    it("creates a brief with targetAudience and meetingType", async () => {
      await seedBizItem(db);
      const packId = await seedPack(app);

      const res = await app.request(`/api/offering-packs/${packId}/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetAudience: "CTO", meetingType: "demo" }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as { targetAudience: string; meetingType: string; content: string };
      expect(body.targetAudience).toBe("CTO");
      expect(body.meetingType).toBe("demo");
      expect(body.content).toContain("CTO");
    });

    it("returns 404 for non-existent pack", async () => {
      const res = await app.request("/api/offering-packs/nonexistent/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(404);
    });

    it("generates content with grouped items", async () => {
      await seedBizItem(db);
      const packId = await seedPack(app);
      await seedPackWithItems(app, packId);

      const res = await app.request(`/api/offering-packs/${packId}/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const body = (await res.json()) as { content: string };
      expect(body.content).toContain("제안서");
      expect(body.content).toContain("가격 정보");
      expect(body.content).toContain("기술 제안서");
    });
  });

  describe("GET /api/offering-packs/:id/brief", () => {
    it("returns latest brief", async () => {
      await seedBizItem(db);
      const packId = await seedPack(app);

      // Create two briefs
      await app.request(`/api/offering-packs/${packId}/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingType: "initial" }),
      });
      await app.request(`/api/offering-packs/${packId}/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingType: "followup" }),
      });

      const res = await app.request(`/api/offering-packs/${packId}/brief`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { meetingType: string };
      expect(body.meetingType).toBe("followup");
    });

    it("returns 404 when no briefs exist", async () => {
      await seedBizItem(db);
      const packId = await seedPack(app);

      const res = await app.request(`/api/offering-packs/${packId}/brief`);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/offering-packs/:id/briefs", () => {
    it("returns list of briefs", async () => {
      await seedBizItem(db);
      const packId = await seedPack(app);

      await app.request(`/api/offering-packs/${packId}/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await app.request(`/api/offering-packs/${packId}/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingType: "demo" }),
      });

      const res = await app.request(`/api/offering-packs/${packId}/briefs`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { items: unknown[] };
      expect(body.items).toHaveLength(2);
    });

    it("returns empty list when no briefs", async () => {
      await seedBizItem(db);
      const packId = await seedPack(app);

      const res = await app.request(`/api/offering-packs/${packId}/briefs`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { items: unknown[] };
      expect(body.items).toHaveLength(0);
    });

    it("supports pagination", async () => {
      await seedBizItem(db);
      const packId = await seedPack(app);

      for (let i = 0; i < 3; i++) {
        await app.request(`/api/offering-packs/${packId}/brief`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      }

      const res = await app.request(`/api/offering-packs/${packId}/briefs?limit=2&offset=0`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { items: unknown[] };
      expect(body.items).toHaveLength(2);
    });
  });
});
