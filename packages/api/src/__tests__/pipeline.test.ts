import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { pipelineRoute } from "../routes/pipeline.js";
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
  CREATE TABLE IF NOT EXISTS pipeline_stages (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'REGISTERED',
    entered_at TEXT NOT NULL DEFAULT (datetime('now')),
    exited_at TEXT,
    entered_by TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
  );
  CREATE INDEX IF NOT EXISTS idx_pipeline_stages_item ON pipeline_stages(biz_item_id, entered_at DESC);
  CREATE INDEX IF NOT EXISTS idx_pipeline_stages_org ON pipeline_stages(org_id, stage);
`;

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  // Mock tenant middleware
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", pipelineRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

async function seedItem(db: D1Database, id: string, title: string) {
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('${id}', 'org_test', '${title}', 'test-user')`,
  );
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_by) VALUES ('ps-${id}', '${id}', 'org_test', 'REGISTERED', 'test-user')`,
  );
}

describe("Pipeline Routes (F232)", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  describe("GET /api/pipeline/items", () => {
    it("returns empty list when no items", async () => {
      const res = await app.request("/api/pipeline/items");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { items: unknown[]; total: number };
      expect(body.items).toEqual([]);
      expect(body.total).toBe(0);
    });

    it("returns items with pagination", async () => {
      await seedItem(db, "item-1", "Test Item 1");
      await seedItem(db, "item-2", "Test Item 2");

      const res = await app.request("/api/pipeline/items?limit=1");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { items: unknown[]; total: number };
      expect(body.items).toHaveLength(1);
      expect(body.total).toBe(2);
    });

    it("filters by stage", async () => {
      await seedItem(db, "item-1", "Test Item 1");
      const res = await app.request("/api/pipeline/items?stage=DISCOVERY");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { items: unknown[]; total: number };
      expect(body.items).toHaveLength(0);
    });
  });

  describe("GET /api/pipeline/items/:id", () => {
    it("returns item detail with stage history", async () => {
      await seedItem(db, "item-1", "Detail Item");
      const res = await app.request("/api/pipeline/items/item-1");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { id: string; stageHistory: unknown[] };
      expect(body.id).toBe("item-1");
      expect(body.stageHistory).toHaveLength(1);
    });

    it("returns 404 for non-existent item", async () => {
      const res = await app.request("/api/pipeline/items/non-existent");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/pipeline/items/:id/stage", () => {
    it("advances stage successfully", async () => {
      await seedItem(db, "item-1", "Stage Item");
      const res = await app.request("/api/pipeline/items/item-1/stage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "DISCOVERY", notes: "Starting discovery" }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { stage: string };
      expect(body.stage).toBe("DISCOVERY");
    });

    it("returns 400 for invalid stage", async () => {
      await seedItem(db, "item-1", "Stage Item");
      const res = await app.request("/api/pipeline/items/item-1/stage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "INVALID" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/pipeline/stats", () => {
    it("returns stats with counts", async () => {
      await seedItem(db, "item-1", "Stats Item");
      const res = await app.request("/api/pipeline/stats");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { totalItems: number; byStage: Record<string, number> };
      expect(body.totalItems).toBe(1);
      expect(body.byStage.REGISTERED).toBe(1);
    });
  });

  describe("GET /api/pipeline/kanban", () => {
    it("returns kanban columns for all stages", async () => {
      await seedItem(db, "item-1", "Kanban Item");
      const res = await app.request("/api/pipeline/kanban");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { stage: string; items: unknown[]; count: number }[];
      expect(body).toHaveLength(7);
      const registered = body.find((c) => c.stage === "REGISTERED");
      expect(registered?.count).toBe(1);
    });
  });
});
