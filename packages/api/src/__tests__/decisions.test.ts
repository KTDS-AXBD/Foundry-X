import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { decisionsRoute } from "../routes/decisions.js";
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
    notes TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_pipeline_stages_item ON pipeline_stages(biz_item_id, entered_at DESC);
  CREATE INDEX IF NOT EXISTS idx_pipeline_stages_org ON pipeline_stages(org_id, stage);
  CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    decision TEXT NOT NULL,
    stage TEXT NOT NULL,
    comment TEXT NOT NULL,
    decided_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_decisions_item ON decisions(biz_item_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_decisions_org ON decisions(org_id, created_at DESC);
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
  app.route("/api", decisionsRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

async function seedItemWithStage(db: D1Database, id: string, stage: string = "REVIEW") {
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('${id}', 'org_test', 'Test Item', 'other-user')`,
  );
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_by) VALUES ('ps-${id}', '${id}', 'org_test', '${stage}', 'test-user')`,
  );
}

describe("Decisions Routes (F239)", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  describe("POST /api/decisions", () => {
    it("creates GO decision", async () => {
      await seedItemWithStage(db, "item-1", "REVIEW");

      const res = await app.request("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", decision: "GO", comment: "Approved for next stage" }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { decision: string; stage: string };
      expect(body.decision).toBe("GO");
      expect(body.stage).toBe("REVIEW");
    });

    it("creates HOLD decision", async () => {
      await seedItemWithStage(db, "item-1");

      const res = await app.request("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", decision: "HOLD", comment: "Needs more research" }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { decision: string };
      expect(body.decision).toBe("HOLD");
    });

    it("creates DROP decision", async () => {
      await seedItemWithStage(db, "item-1");

      const res = await app.request("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", decision: "DROP", comment: "Not viable" }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { decision: string };
      expect(body.decision).toBe("DROP");
    });

    it("returns 400 for missing comment", async () => {
      const res = await app.request("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", decision: "GO" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid decision type", async () => {
      const res = await app.request("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", decision: "MAYBE", comment: "Unsure" }),
      });
      expect(res.status).toBe(400);
    });

    it("GO decision advances pipeline stage", async () => {
      await seedItemWithStage(db, "item-1", "DISCOVERY");

      await app.request("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", decision: "GO", comment: "Moving forward" }),
      });

      // Check that stage advanced to FORMALIZATION
      const row = await (db as unknown as { prepare: (q: string) => { bind: (...v: unknown[]) => { first: <T>() => Promise<T | null> } } })
        .prepare(`SELECT stage FROM pipeline_stages WHERE biz_item_id = ? AND exited_at IS NULL`)
        .bind("item-1")
        .first<{ stage: string }>();
      expect(row?.stage).toBe("FORMALIZATION");
    });

    it("GO decision creates notification for item creator", async () => {
      await seedItemWithStage(db, "item-1", "REVIEW");

      await app.request("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", decision: "GO", comment: "Approved" }),
      });

      const notif = await (db as unknown as { prepare: (q: string) => { bind: (...v: unknown[]) => { first: <T>() => Promise<T | null> } } })
        .prepare(`SELECT type, recipient_id FROM notifications WHERE biz_item_id = ?`)
        .bind("item-1")
        .first<{ type: string; recipient_id: string }>();
      expect(notif?.type).toBe("decision_made");
      expect(notif?.recipient_id).toBe("other-user");
    });
  });

  describe("GET /api/decisions", () => {
    it("returns org decisions", async () => {
      await seedItemWithStage(db, "item-1");
      await app.request("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", decision: "GO", comment: "Test" }),
      });

      const res = await app.request("/api/decisions");
      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(body).toHaveLength(1);
    });

    it("filters by bizItemId", async () => {
      await seedItemWithStage(db, "item-1");
      await app.request("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", decision: "HOLD", comment: "Wait" }),
      });

      const res = await app.request("/api/decisions?bizItemId=item-1");
      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(body).toHaveLength(1);
    });
  });

  describe("GET /api/decisions/stats", () => {
    it("returns decision statistics", async () => {
      await seedItemWithStage(db, "item-1");
      await seedItemWithStage(db, "item-2");

      await app.request("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", decision: "GO", comment: "Yes" }),
      });
      await app.request("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-2", decision: "DROP", comment: "No" }),
      });

      const res = await app.request("/api/decisions/stats");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { total: number; go: number; drop: number };
      expect(body.total).toBe(2);
      expect(body.go).toBe(1);
      expect(body.drop).toBe(1);
    });
  });

  describe("GET /api/decisions/pending", () => {
    it("returns items in REVIEW/DECISION stage", async () => {
      await seedItemWithStage(db, "item-1", "REVIEW");
      await seedItemWithStage(db, "item-2", "REGISTERED");

      const res = await app.request("/api/decisions/pending");
      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(body).toHaveLength(1);
    });
  });
});
