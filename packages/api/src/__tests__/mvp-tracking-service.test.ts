import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { MvpTrackingService } from "../services/mvp-tracking-service.js";

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
  CREATE TABLE IF NOT EXISTS mvp_tracking (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'in_dev',
    repo_url TEXT,
    deploy_url TEXT,
    tech_stack TEXT,
    assigned_to TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS mvp_status_history (
    id TEXT PRIMARY KEY,
    mvp_id TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by TEXT NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
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

async function seedBizItem(db: D1Database, id: string) {
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('${id}', 'org_test', 'Test Item', 'user-1')`,
  );
}

describe("MvpTrackingService (F238)", () => {
  let db: D1Database;
  let service: MvpTrackingService;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    service = new MvpTrackingService(db);
  });

  describe("create()", () => {
    it("creates MVP with in_dev status and initial history entry", async () => {
      await seedBizItem(db, "item-1");

      const mvp = await service.create({
        bizItemId: "item-1",
        orgId: "org_test",
        title: "MVP Prototype",
        createdBy: "user-1",
      });

      expect(mvp.status).toBe("in_dev");
      expect(mvp.title).toBe("MVP Prototype");

      const history = await service.getHistory(mvp.id, "org_test");
      expect(history).toHaveLength(1);
      expect(history[0]!.toStatus).toBe("in_dev");
      expect(history[0]!.fromStatus).toBeNull();
    });
  });

  describe("list()", () => {
    it("returns MVPs for org", async () => {
      await seedBizItem(db, "item-1");
      await service.create({ bizItemId: "item-1", orgId: "org_test", title: "MVP A", createdBy: "user-1" });
      await service.create({ bizItemId: "item-1", orgId: "org_test", title: "MVP B", createdBy: "user-1" });

      const mvps = await service.list("org_test");
      expect(mvps).toHaveLength(2);
    });
  });

  describe("getById()", () => {
    it("returns MVP by id", async () => {
      await seedBizItem(db, "item-1");
      const mvp = await service.create({
        bizItemId: "item-1",
        orgId: "org_test",
        title: "MVP A",
        createdBy: "user-1",
      });

      const found = await service.getById(mvp.id, "org_test");
      expect(found).not.toBeNull();
      expect(found!.id).toBe(mvp.id);
    });

    it("returns null for unknown id", async () => {
      const result = await service.getById("nonexistent", "org_test");
      expect(result).toBeNull();
    });
  });

  describe("updateStatus()", () => {
    it("changes status and creates history entry", async () => {
      await seedBizItem(db, "item-1");
      const mvp = await service.create({
        bizItemId: "item-1",
        orgId: "org_test",
        title: "MVP A",
        createdBy: "user-1",
      });

      const updated = await service.updateStatus(mvp.id, "org_test", {
        status: "testing",
        changedBy: "user-2",
        reason: "Ready for QA",
      });

      expect(updated.status).toBe("testing");

      const history = await service.getHistory(mvp.id, "org_test");
      expect(history).toHaveLength(2);
      // Find the transition entry (not the initial null→in_dev entry)
      const transitionEntry = history.find((h) => h.fromStatus !== null)!;
      expect(transitionEntry.fromStatus).toBe("in_dev");
      expect(transitionEntry.toStatus).toBe("testing");
    });
  });

  describe("getHistory()", () => {
    it("returns history entries in descending order", async () => {
      await seedBizItem(db, "item-1");
      const mvp = await service.create({
        bizItemId: "item-1",
        orgId: "org_test",
        title: "MVP A",
        createdBy: "user-1",
      });

      await service.updateStatus(mvp.id, "org_test", { status: "testing", changedBy: "user-1" });
      await service.updateStatus(mvp.id, "org_test", { status: "released", changedBy: "user-1" });

      const history = await service.getHistory(mvp.id, "org_test");
      expect(history).toHaveLength(3);
      const statuses = history.map((h) => h.toStatus);
      expect(statuses).toContain("released");
      expect(statuses).toContain("testing");
      expect(statuses).toContain("in_dev");
    });
  });
});
