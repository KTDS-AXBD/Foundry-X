import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import {
  IdeaBmcLinkService,
  NotFoundError,
  ConflictError,
} from "../core/shaping/services/idea-bmc-link-service.js";
import { IdeaService } from "../core/collection/services/idea-service.js";
import { BmcService } from "../core/shaping/services/bmc-service.js";

describe("IdeaBmcLinkService", () => {
  let db: ReturnType<typeof createMockD1>;
  let linkService: IdeaBmcLinkService;
  let ideaService: IdeaService;
  let bmcService: BmcService;

  const ORG = "org_1";
  const USER = "user_1";
  const OTHER_ORG = "org_2";

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
      CREATE TABLE IF NOT EXISTS ax_idea_bmc_links (
        id         TEXT PRIMARY KEY,
        idea_id    TEXT NOT NULL,
        bmc_id     TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(idea_id, bmc_id)
      );
      CREATE INDEX IF NOT EXISTS idx_links_idea_id ON ax_idea_bmc_links(idea_id);
      CREATE INDEX IF NOT EXISTS idx_links_bmc_id ON ax_idea_bmc_links(bmc_id);
    `);

    const mockDb = db as unknown as D1Database;
    linkService = new IdeaBmcLinkService(mockDb);
    ideaService = new IdeaService(mockDb);
    bmcService = new BmcService(mockDb);
  });

  // ─── createBmcFromIdea ───

  describe("createBmcFromIdea", () => {
    it("creates a new BMC from idea and auto-links", async () => {
      const idea = await ideaService.create(ORG, USER, { title: "AI 챗봇" });

      const result = await linkService.createBmcFromIdea(idea.id, ORG, USER);

      expect(result.bmc).toBeDefined();
      expect(result.bmc.title).toBe("BMC: AI 챗봇");
      expect(result.linkId).toBeTruthy();

      // 링크가 실제로 존재하는지 확인
      const bmcs = await linkService.getBmcsByIdea(idea.id, ORG);
      expect(bmcs).toHaveLength(1);
      expect(bmcs[0]!.id).toBe(result.bmc.id);
    });

    it("uses custom title when provided", async () => {
      const idea = await ideaService.create(ORG, USER, { title: "AI 챗봇" });

      const result = await linkService.createBmcFromIdea(idea.id, ORG, USER, "커스텀 BMC");

      expect(result.bmc.title).toBe("커스텀 BMC");
    });

    it("throws NotFoundError for non-existent idea", async () => {
      await expect(
        linkService.createBmcFromIdea("nonexistent", ORG, USER)
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── linkBmc ───

  describe("linkBmc", () => {
    it("links an existing BMC to an idea", async () => {
      const idea = await ideaService.create(ORG, USER, { title: "아이디어" });
      const bmc = await bmcService.create(ORG, USER, { title: "기존 BMC" });

      const result = await linkService.linkBmc(idea.id, bmc.id, ORG);

      expect(result.linkId).toBeTruthy();

      const bmcs = await linkService.getBmcsByIdea(idea.id, ORG);
      expect(bmcs).toHaveLength(1);
      expect(bmcs[0]!.id).toBe(bmc.id);
    });

    it("throws NotFoundError for non-existent idea", async () => {
      const bmc = await bmcService.create(ORG, USER, { title: "BMC" });

      await expect(
        linkService.linkBmc("nonexistent", bmc.id, ORG)
      ).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError for non-existent BMC", async () => {
      const idea = await ideaService.create(ORG, USER, { title: "아이디어" });

      await expect(
        linkService.linkBmc(idea.id, "nonexistent", ORG)
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ConflictError for duplicate link", async () => {
      const idea = await ideaService.create(ORG, USER, { title: "아이디어" });
      const bmc = await bmcService.create(ORG, USER, { title: "BMC" });

      await linkService.linkBmc(idea.id, bmc.id, ORG);

      await expect(
        linkService.linkBmc(idea.id, bmc.id, ORG)
      ).rejects.toThrow(ConflictError);
    });
  });

  // ─── unlinkBmc ───

  describe("unlinkBmc", () => {
    it("removes a link between idea and BMC", async () => {
      const idea = await ideaService.create(ORG, USER, { title: "아이디어" });
      const bmc = await bmcService.create(ORG, USER, { title: "BMC" });
      await linkService.linkBmc(idea.id, bmc.id, ORG);

      await linkService.unlinkBmc(idea.id, bmc.id, ORG);

      const bmcs = await linkService.getBmcsByIdea(idea.id, ORG);
      expect(bmcs).toHaveLength(0);
    });

    it("throws NotFoundError when link does not exist", async () => {
      const idea = await ideaService.create(ORG, USER, { title: "아이디어" });
      const bmc = await bmcService.create(ORG, USER, { title: "BMC" });

      await expect(
        linkService.unlinkBmc(idea.id, bmc.id, ORG)
      ).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError for non-existent idea", async () => {
      await expect(
        linkService.unlinkBmc("nonexistent", "bmc_id", ORG)
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── getBmcsByIdea ───

  describe("getBmcsByIdea", () => {
    it("returns multiple linked BMCs", async () => {
      const idea = await ideaService.create(ORG, USER, { title: "아이디어" });
      const bmc1 = await bmcService.create(ORG, USER, { title: "BMC 1" });
      const bmc2 = await bmcService.create(ORG, USER, { title: "BMC 2" });

      await linkService.linkBmc(idea.id, bmc1.id, ORG);
      await linkService.linkBmc(idea.id, bmc2.id, ORG);

      const bmcs = await linkService.getBmcsByIdea(idea.id, ORG);

      expect(bmcs).toHaveLength(2);
      expect(bmcs.map((b) => b.title).sort()).toEqual(["BMC 1", "BMC 2"]);
      expect(bmcs[0]!.createdAt).toBeDefined();
      expect(bmcs[0]!.updatedAt).toBeDefined();
    });

    it("returns empty array when no BMCs linked", async () => {
      const idea = await ideaService.create(ORG, USER, { title: "아이디어" });

      const bmcs = await linkService.getBmcsByIdea(idea.id, ORG);

      expect(bmcs).toHaveLength(0);
    });

    it("throws NotFoundError for non-existent idea", async () => {
      await expect(
        linkService.getBmcsByIdea("nonexistent", ORG)
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── getIdeaByBmc ───

  describe("getIdeaByBmc", () => {
    it("returns the linked idea", async () => {
      const idea = await ideaService.create(ORG, USER, { title: "AI 챗봇" });
      const bmc = await bmcService.create(ORG, USER, { title: "BMC" });
      await linkService.linkBmc(idea.id, bmc.id, ORG);

      const result = await linkService.getIdeaByBmc(bmc.id, ORG);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(idea.id);
      expect(result!.title).toBe("AI 챗봇");
      expect(result!.createdAt).toBeDefined();
    });

    it("returns null when BMC has no linked idea", async () => {
      const bmc = await bmcService.create(ORG, USER, { title: "BMC" });

      const result = await linkService.getIdeaByBmc(bmc.id, ORG);

      expect(result).toBeNull();
    });

    it("throws NotFoundError for non-existent BMC", async () => {
      await expect(
        linkService.getIdeaByBmc("nonexistent", ORG)
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── 타 테넌트 격리 ───

  describe("tenant isolation", () => {
    it("blocks access to other tenant's idea", async () => {
      const idea = await ideaService.create(OTHER_ORG, USER, { title: "타 테넌트 아이디어" });
      const bmc = await bmcService.create(ORG, USER, { title: "내 BMC" });

      await expect(
        linkService.linkBmc(idea.id, bmc.id, ORG)
      ).rejects.toThrow(NotFoundError);
    });

    it("blocks access to other tenant's BMC", async () => {
      const idea = await ideaService.create(ORG, USER, { title: "내 아이디어" });
      const bmc = await bmcService.create(OTHER_ORG, USER, { title: "타 테넌트 BMC" });

      await expect(
        linkService.linkBmc(idea.id, bmc.id, ORG)
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── 재연결 ───

  describe("re-link after unlink", () => {
    it("allows re-linking after unlinking", async () => {
      const idea = await ideaService.create(ORG, USER, { title: "아이디어" });
      const bmc = await bmcService.create(ORG, USER, { title: "BMC" });

      // 연결 → 해제 → 재연결
      await linkService.linkBmc(idea.id, bmc.id, ORG);
      await linkService.unlinkBmc(idea.id, bmc.id, ORG);
      const result = await linkService.linkBmc(idea.id, bmc.id, ORG);

      expect(result.linkId).toBeTruthy();

      const bmcs = await linkService.getBmcsByIdea(idea.id, ORG);
      expect(bmcs).toHaveLength(1);
    });
  });
});
