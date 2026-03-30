import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { OfferingPackService } from "../services/offering-pack-service.js";

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
`;

async function seedBizItem(db: D1Database, id: string) {
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('${id}', 'org_test', 'Test Item', 'user-1')`,
  );
}

describe("OfferingPackService (F236)", () => {
  let db: D1Database;
  let service: OfferingPackService;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    service = new OfferingPackService(db);
  });

  describe("create()", () => {
    it("creates a pack with draft status", async () => {
      await seedBizItem(db, "item-1");

      const pack = await service.create({
        bizItemId: "item-1",
        orgId: "org_test",
        title: "Sales Pack Q1",
        createdBy: "user-1",
      });

      expect(pack.status).toBe("draft");
      expect(pack.title).toBe("Sales Pack Q1");
      expect(pack.bizItemId).toBe("item-1");
      expect(pack.shareToken).toBeNull();
    });
  });

  describe("list()", () => {
    it("returns packs for org", async () => {
      await seedBizItem(db, "item-1");
      await service.create({ bizItemId: "item-1", orgId: "org_test", title: "Pack A", createdBy: "user-1" });
      await service.create({ bizItemId: "item-1", orgId: "org_test", title: "Pack B", createdBy: "user-1" });

      const packs = await service.list("org_test");
      expect(packs).toHaveLength(2);
    });

    it("filters by status", async () => {
      await seedBizItem(db, "item-1");
      const pack = await service.create({ bizItemId: "item-1", orgId: "org_test", title: "Pack A", createdBy: "user-1" });
      await service.updateStatus(pack.id, "org_test", "review");

      const drafts = await service.list("org_test", { status: "draft" });
      const reviews = await service.list("org_test", { status: "review" });

      expect(drafts).toHaveLength(0);
      expect(reviews).toHaveLength(1);
    });
  });

  describe("getById()", () => {
    it("returns pack with items", async () => {
      await seedBizItem(db, "item-1");
      const pack = await service.create({ bizItemId: "item-1", orgId: "org_test", title: "Pack A", createdBy: "user-1" });
      await service.addItem(pack.id, "org_test", { itemType: "document", title: "BDP Summary" });

      const detail = await service.getById(pack.id, "org_test");
      expect(detail).not.toBeNull();
      expect(detail!.items).toHaveLength(1);
      expect(detail!.items[0]!.title).toBe("BDP Summary");
    });

    it("returns null for unknown id", async () => {
      const result = await service.getById("nonexistent", "org_test");
      expect(result).toBeNull();
    });
  });

  describe("addItem()", () => {
    it("adds item to pack", async () => {
      await seedBizItem(db, "item-1");
      const pack = await service.create({ bizItemId: "item-1", orgId: "org_test", title: "Pack A", createdBy: "user-1" });

      const item = await service.addItem(pack.id, "org_test", {
        itemType: "slide",
        title: "Pitch Deck",
        url: "https://example.com/deck.pptx",
      });

      expect(item.itemType).toBe("slide");
      expect(item.url).toBe("https://example.com/deck.pptx");
    });
  });

  describe("updateStatus()", () => {
    it("valid transition: draft → review", async () => {
      await seedBizItem(db, "item-1");
      const pack = await service.create({ bizItemId: "item-1", orgId: "org_test", title: "Pack A", createdBy: "user-1" });

      const updated = await service.updateStatus(pack.id, "org_test", "review");
      expect(updated.status).toBe("review");
    });

    it("throws on invalid transition: draft → shared", async () => {
      await seedBizItem(db, "item-1");
      const pack = await service.create({ bizItemId: "item-1", orgId: "org_test", title: "Pack A", createdBy: "user-1" });

      await expect(service.updateStatus(pack.id, "org_test", "shared")).rejects.toThrow(
        /Invalid status transition/,
      );
    });
  });

  describe("createShareLink()", () => {
    it("generates token when approved", async () => {
      await seedBizItem(db, "item-1");
      const pack = await service.create({ bizItemId: "item-1", orgId: "org_test", title: "Pack A", createdBy: "user-1" });
      await service.updateStatus(pack.id, "org_test", "review");
      await service.updateStatus(pack.id, "org_test", "approved");

      const linked = await service.createShareLink(pack.id, "org_test", 7);
      expect(linked.shareToken).not.toBeNull();
      expect(linked.status).toBe("shared");
    });

    it("throws when pack is draft", async () => {
      await seedBizItem(db, "item-1");
      const pack = await service.create({ bizItemId: "item-1", orgId: "org_test", title: "Pack A", createdBy: "user-1" });

      await expect(service.createShareLink(pack.id, "org_test")).rejects.toThrow(
        /approved or shared/,
      );
    });
  });
});
