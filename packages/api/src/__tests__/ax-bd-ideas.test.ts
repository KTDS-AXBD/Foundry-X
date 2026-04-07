import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { IdeaService } from "../core/discovery/services/idea-service.js";

describe("IdeaService", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: IdeaService;

  beforeEach(() => {
    db = createMockD1();

    (db as any).exec(`
      CREATE TABLE IF NOT EXISTS ax_ideas (
        id          TEXT PRIMARY KEY,
        title       TEXT NOT NULL,
        description TEXT CHECK(length(description) <= 200),
        tags        TEXT,
        git_ref     TEXT NOT NULL,
        author_id   TEXT NOT NULL,
        org_id      TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'synced'
                    CHECK(sync_status IN ('synced', 'pending', 'failed')),
        is_deleted  INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );
    `);

    service = new IdeaService(db as unknown as D1Database);
  });

  // ─── CREATE ───

  describe("create", () => {
    it("creates an idea with title and tags", async () => {
      const idea = await service.create("org_1", "user_1", {
        title: "AI 챗봇",
        description: "고객 응대 자동화",
        tags: ["AI", "chatbot"],
      });

      expect(idea.id).toBeTruthy();
      expect(idea.title).toBe("AI 챗봇");
      expect(idea.description).toBe("고객 응대 자동화");
      expect(idea.tags).toEqual(["AI", "chatbot"]);
      expect(idea.orgId).toBe("org_1");
      expect(idea.authorId).toBe("user_1");
      expect(idea.syncStatus).toBe("pending");
    });

    it("creates with defaults when optional fields omitted", async () => {
      const idea = await service.create("org_1", "user_1", { title: "Simple Idea" });

      expect(idea.description).toBeNull();
      expect(idea.tags).toEqual([]);
    });
  });

  // ─── LIST ───

  describe("list", () => {
    it("returns paginated ideas for org", async () => {
      await service.create("org_1", "user_1", { title: "Idea A" });
      await service.create("org_1", "user_1", { title: "Idea B" });
      await service.create("org_2", "user_2", { title: "Other Org" });

      const result = await service.list("org_1", { page: 1, limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it("filters ideas by tag", async () => {
      await service.create("org_1", "user_1", {
        title: "AI Idea",
        tags: ["AI", "automation"],
      });
      await service.create("org_1", "user_1", {
        title: "Finance Idea",
        tags: ["finance"],
      });

      const result = await service.list("org_1", { page: 1, limit: 20, tag: "AI" });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.title).toBe("AI Idea");
    });

    it("does not include soft-deleted ideas", async () => {
      const idea = await service.create("org_1", "user_1", { title: "Delete Me" });
      await service.softDelete("org_1", idea.id);

      const result = await service.list("org_1", { page: 1, limit: 20 });
      expect(result.items).toHaveLength(0);
    });
  });

  // ─── GET BY ID ───

  describe("getById", () => {
    it("returns idea by id", async () => {
      const created = await service.create("org_1", "user_1", {
        title: "Detail Idea",
        tags: ["test"],
      });

      const idea = await service.getById("org_1", created.id);

      expect(idea).not.toBeNull();
      expect(idea!.title).toBe("Detail Idea");
      expect(idea!.tags).toEqual(["test"]);
    });

    it("returns null for non-existent idea", async () => {
      const idea = await service.getById("org_1", "nonexistent");
      expect(idea).toBeNull();
    });

    it("returns null for wrong org", async () => {
      const created = await service.create("org_1", "user_1", { title: "Private" });
      const idea = await service.getById("org_2", created.id);
      expect(idea).toBeNull();
    });
  });

  // ─── UPDATE ───

  describe("update", () => {
    it("updates title and tags", async () => {
      const created = await service.create("org_1", "user_1", {
        title: "Old Title",
        tags: ["old"],
      });

      const updated = await service.update("org_1", created.id, {
        title: "New Title",
        tags: ["new", "updated"],
      });

      expect(updated!.title).toBe("New Title");
      expect(updated!.tags).toEqual(["new", "updated"]);
    });

    it("updates description only", async () => {
      const created = await service.create("org_1", "user_1", { title: "Idea" });

      const updated = await service.update("org_1", created.id, {
        description: "New description",
      });

      expect(updated!.description).toBe("New description");
      expect(updated!.title).toBe("Idea");
    });

    it("returns null for non-existent idea", async () => {
      const result = await service.update("org_1", "nonexistent", { title: "Nope" });
      expect(result).toBeNull();
    });
  });

  // ─── SOFT DELETE ───

  describe("softDelete", () => {
    it("soft deletes an idea", async () => {
      const created = await service.create("org_1", "user_1", { title: "Delete Me" });
      const ok = await service.softDelete("org_1", created.id);
      expect(ok).toBe(true);

      const afterDelete = await service.getById("org_1", created.id);
      expect(afterDelete).toBeNull();
    });

    it("returns false for non-existent idea", async () => {
      const ok = await service.softDelete("org_1", "nonexistent");
      expect(ok).toBe(false);
    });
  });
});
