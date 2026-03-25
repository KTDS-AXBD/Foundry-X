import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { BmcService, BMC_BLOCK_TYPES } from "../services/bmc-service.js";

describe("BmcService", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: BmcService;

  beforeEach(() => {
    db = createMockD1();

    (db as any).exec(`
      CREATE TABLE IF NOT EXISTS ax_bmcs (
        id          TEXT PRIMARY KEY,
        idea_id     TEXT,
        title       TEXT NOT NULL,
        git_ref     TEXT NOT NULL,
        author_id   TEXT NOT NULL,
        org_id      TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'synced'
                    CHECK(sync_status IN ('synced', 'pending', 'failed')),
        is_deleted  INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ax_bmc_blocks (
        bmc_id      TEXT NOT NULL REFERENCES ax_bmcs(id),
        block_type  TEXT NOT NULL CHECK(block_type IN (
                      'customer_segments', 'value_propositions', 'channels',
                      'customer_relationships', 'revenue_streams',
                      'key_resources', 'key_activities', 'key_partnerships',
                      'cost_structure'
                    )),
        content     TEXT,
        updated_at  INTEGER NOT NULL,
        PRIMARY KEY (bmc_id, block_type)
      );
    `);

    service = new BmcService(db as unknown as D1Database);
  });

  // ─── CREATE ───

  describe("create", () => {
    it("creates a BMC with 9 empty blocks", async () => {
      const bmc = await service.create("org_1", "user_1", { title: "My BMC" });

      expect(bmc.id).toBeTruthy();
      expect(bmc.title).toBe("My BMC");
      expect(bmc.orgId).toBe("org_1");
      expect(bmc.authorId).toBe("user_1");
      expect(bmc.ideaId).toBeNull();
      expect(bmc.syncStatus).toBe("pending");
      expect(bmc.blocks).toHaveLength(9);
      expect(bmc.blocks.map((b) => b.blockType).sort()).toEqual([...BMC_BLOCK_TYPES].sort());
      bmc.blocks.forEach((b) => {
        expect(b.content).toBe("");
      });
    });

    it("creates a BMC linked to an idea", async () => {
      const bmc = await service.create("org_1", "user_1", {
        title: "Linked BMC",
        ideaId: "idea_123",
      });
      expect(bmc.ideaId).toBe("idea_123");
    });
  });

  // ─── LIST ───

  describe("list", () => {
    it("returns paginated BMC list for org", async () => {
      await service.create("org_1", "user_1", { title: "BMC A" });
      await service.create("org_1", "user_1", { title: "BMC B" });
      await service.create("org_2", "user_2", { title: "Other Org BMC" });

      const result = await service.list("org_1", { page: 1, limit: 20, sort: "updated_at_desc" });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("does not include soft-deleted BMCs", async () => {
      const bmc = await service.create("org_1", "user_1", { title: "To Delete" });
      await service.softDelete("org_1", bmc.id);

      const result = await service.list("org_1", { page: 1, limit: 20, sort: "updated_at_desc" });
      expect(result.items).toHaveLength(0);
    });
  });

  // ─── GET BY ID ───

  describe("getById", () => {
    it("returns BMC with blocks", async () => {
      const created = await service.create("org_1", "user_1", { title: "Detail BMC" });
      const bmc = await service.getById("org_1", created.id);

      expect(bmc).not.toBeNull();
      expect(bmc!.title).toBe("Detail BMC");
      expect(bmc!.blocks).toHaveLength(9);
    });

    it("returns null for non-existent BMC", async () => {
      const bmc = await service.getById("org_1", "nonexistent");
      expect(bmc).toBeNull();
    });

    it("returns null for wrong org", async () => {
      const created = await service.create("org_1", "user_1", { title: "Private BMC" });
      const bmc = await service.getById("org_2", created.id);
      expect(bmc).toBeNull();
    });
  });

  // ─── UPDATE ───

  describe("update", () => {
    it("updates block content", async () => {
      const created = await service.create("org_1", "user_1", { title: "Editable BMC" });

      const updated = await service.update("org_1", created.id, "user_1", {
        blocks: [
          { blockType: "value_propositions", content: "AI 자동화 솔루션" },
          { blockType: "customer_segments", content: "중견기업 IT 부서" },
        ],
      });

      expect(updated).not.toBeNull();
      const vpBlock = updated!.blocks.find((b) => b.blockType === "value_propositions");
      expect(vpBlock!.content).toBe("AI 자동화 솔루션");

      const csBlock = updated!.blocks.find((b) => b.blockType === "customer_segments");
      expect(csBlock!.content).toBe("중견기업 IT 부서");
    });

    it("updates title", async () => {
      const created = await service.create("org_1", "user_1", { title: "Old Title" });
      const updated = await service.update("org_1", created.id, "user_1", { title: "New Title" });

      expect(updated!.title).toBe("New Title");
    });

    it("returns null for non-existent BMC", async () => {
      const result = await service.update("org_1", "nonexistent", "user_1", { title: "Nope" });
      expect(result).toBeNull();
    });
  });

  // ─── SOFT DELETE ───

  describe("softDelete", () => {
    it("soft deletes a BMC", async () => {
      const created = await service.create("org_1", "user_1", { title: "Delete Me" });
      const ok = await service.softDelete("org_1", created.id);
      expect(ok).toBe(true);

      const afterDelete = await service.getById("org_1", created.id);
      expect(afterDelete).toBeNull();
    });

    it("returns false for non-existent BMC", async () => {
      const ok = await service.softDelete("org_1", "nonexistent");
      expect(ok).toBe(false);
    });
  });

  // ─── STAGE ───

  describe("stage", () => {
    it("stages a BMC for git commit", async () => {
      const created = await service.create("org_1", "user_1", { title: "Stage Me" });
      const result = await service.stage("org_1", created.id, "user_1");

      expect(result).not.toBeNull();
      expect(result!.staged).toBe(true);
      expect(result!.bmcId).toBe(created.id);
    });

    it("returns null for non-existent BMC", async () => {
      const result = await service.stage("org_1", "nonexistent", "user_1");
      expect(result).toBeNull();
    });
  });
});
