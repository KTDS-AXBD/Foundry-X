import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { validationTierRoute } from "../modules/gate/routes/validation-tier.js";
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
    validation_tier TEXT DEFAULT 'none'
  );
  CREATE INDEX IF NOT EXISTS idx_pipeline_stages_item ON pipeline_stages(biz_item_id, entered_at DESC);
  CREATE INDEX IF NOT EXISTS idx_pipeline_stages_org ON pipeline_stages(org_id, stage);
  CREATE TABLE IF NOT EXISTS validation_history (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    tier TEXT NOT NULL,
    decision TEXT NOT NULL,
    comment TEXT NOT NULL DEFAULT '',
    decided_by TEXT NOT NULL,
    decided_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_validation_history_item ON validation_history(biz_item_id, decided_at DESC);
`;

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", validationTierRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

async function seedItemWithStage(db: D1Database, id: string, stage: string = "REVIEW", tier: string = "none") {
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('${id}', 'org_test', 'Test Item ${id}', 'other-user')`,
  );
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_by, validation_tier) VALUES ('ps-${id}', '${id}', 'org_test', '${stage}', 'test-user', '${tier}')`,
  );
}

describe("Validation Tier Routes (F294)", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  describe("POST /api/validation/division/submit", () => {
    it("approves division review", async () => {
      await seedItemWithStage(db, "item-1", "REVIEW", "none");

      const res = await app.request("/api/validation/division/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-1", decision: "approve", comment: "Good to go" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.currentTier).toBe("division_approved");
      expect(body.decision).toBe("approve");
    });

    it("rejects division review — resets to none", async () => {
      await seedItemWithStage(db, "item-2", "REVIEW", "division_pending");

      const res = await app.request("/api/validation/division/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-2", decision: "reject", comment: "Needs work" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.currentTier).toBe("none");
    });

    it("returns 400 for invalid body", async () => {
      const res = await app.request("/api/validation/division/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "approve" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when tier is already division_approved", async () => {
      await seedItemWithStage(db, "item-3", "REVIEW", "division_approved");

      const res = await app.request("/api/validation/division/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-3", decision: "approve", comment: "test" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/validation/company/submit", () => {
    it("approves company review after division approved", async () => {
      await seedItemWithStage(db, "item-4", "REVIEW", "division_approved");

      const res = await app.request("/api/validation/company/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-4", decision: "approve", comment: "Company approved" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.currentTier).toBe("company_approved");
    });

    it("returns 400 when division not yet approved", async () => {
      await seedItemWithStage(db, "item-5", "REVIEW", "none");

      const res = await app.request("/api/validation/company/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-5", decision: "approve", comment: "test" }),
      });
      expect(res.status).toBe(400);
    });

    it("rejects company review — stays at division_approved", async () => {
      await seedItemWithStage(db, "item-6", "REVIEW", "division_approved");

      const res = await app.request("/api/validation/company/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-6", decision: "reject", comment: "Needs revision" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.currentTier).toBe("division_approved");
    });
  });

  describe("GET /api/validation/division/items", () => {
    it("returns division pending items", async () => {
      await seedItemWithStage(db, "item-a", "REVIEW", "none");
      await seedItemWithStage(db, "item-b", "REVIEW", "division_approved");

      const res = await app.request("/api/validation/division/items");
      expect(res.status).toBe(200);
      const body = await res.json() as { items: unknown[]; total: number };
      expect(body.items).toHaveLength(1);
      expect(body.total).toBe(1);
    });
  });

  describe("GET /api/validation/company/items", () => {
    it("returns only division_approved items", async () => {
      await seedItemWithStage(db, "item-c", "REVIEW", "none");
      await seedItemWithStage(db, "item-d", "REVIEW", "division_approved");
      await seedItemWithStage(db, "item-e", "REVIEW", "company_approved");

      const res = await app.request("/api/validation/company/items");
      expect(res.status).toBe(200);
      const body = await res.json() as { items: unknown[]; total: number };
      expect(body.items).toHaveLength(1);
      expect(body.total).toBe(1);
    });
  });

  describe("GET /api/validation/status/:bizItemId", () => {
    it("returns validation status with history", async () => {
      await seedItemWithStage(db, "item-f", "REVIEW", "division_approved");

      // First submit to generate history
      await app.request("/api/validation/company/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "item-f", decision: "approve", comment: "LGTM" }),
      });

      const res = await app.request("/api/validation/status/item-f");
      expect(res.status).toBe(200);
      const body = await res.json() as { bizItemId: string; tier: string; history: unknown[] };
      expect(body.bizItemId).toBe("item-f");
      expect(body.tier).toBe("company_approved");
      expect(body.history.length).toBeGreaterThanOrEqual(1);
    });

    it("returns 404 for non-existent item", async () => {
      const res = await app.request("/api/validation/status/nonexistent");
      expect(res.status).toBe(404);
    });
  });
});
