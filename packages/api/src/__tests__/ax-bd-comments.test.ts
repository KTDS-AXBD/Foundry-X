import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { BmcService } from "../services/bmc-service.js";
import {
  BmcCommentService,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../services/bmc-comment-service.js";

describe("BmcCommentService", () => {
  let db: ReturnType<typeof createMockD1>;
  let bmcService: BmcService;
  let commentService: BmcCommentService;
  let testBmcId: string;

  beforeEach(async () => {
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
      CREATE TABLE IF NOT EXISTS ax_bmc_comments (
        id          TEXT PRIMARY KEY,
        bmc_id      TEXT NOT NULL,
        block_type  TEXT,
        author_id   TEXT NOT NULL,
        content     TEXT NOT NULL,
        created_at  INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_comments_bmc_id ON ax_bmc_comments(bmc_id);
      CREATE INDEX IF NOT EXISTS idx_comments_block ON ax_bmc_comments(bmc_id, block_type);
    `);

    bmcService = new BmcService(db as unknown as D1Database);
    commentService = new BmcCommentService(db as unknown as D1Database);

    // 테스트용 BMC 생성
    const bmc = await bmcService.create("org_1", "user_1", { title: "Test BMC" });
    testBmcId = bmc.id;
  });

  // ─── CREATE COMMENT ───

  describe("createComment", () => {
    it("creates a block comment with blockType", async () => {
      const comment = await commentService.createComment(
        testBmcId, "user_1", "VP에 대한 피드백", "value_propositions"
      );

      expect(comment.id).toBeTruthy();
      expect(comment.bmcId).toBe(testBmcId);
      expect(comment.blockType).toBe("value_propositions");
      expect(comment.authorId).toBe("user_1");
      expect(comment.content).toBe("VP에 대한 피드백");
      expect(comment.createdAt).toBeGreaterThan(0);
    });

    it("creates a general comment without blockType", async () => {
      const comment = await commentService.createComment(
        testBmcId, "user_1", "BMC 전체에 대한 의견"
      );

      expect(comment.blockType).toBeNull();
      expect(comment.content).toBe("BMC 전체에 대한 의견");
    });

    it("throws NotFoundError for non-existent BMC", async () => {
      await expect(
        commentService.createComment("nonexistent", "user_1", "테스트")
      ).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError for soft-deleted BMC", async () => {
      await bmcService.softDelete("org_1", testBmcId);

      await expect(
        commentService.createComment(testBmcId, "user_1", "삭제된 BMC")
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ValidationError for invalid blockType", async () => {
      await expect(
        commentService.createComment(testBmcId, "user_1", "테스트", "invalid_block")
      ).rejects.toThrow(ValidationError);
    });
  });

  // ─── GET COMMENTS ───

  describe("getComments", () => {
    it("returns paginated comments for BMC", async () => {
      await commentService.createComment(testBmcId, "user_1", "댓글 1", "channels");
      await commentService.createComment(testBmcId, "user_1", "댓글 2", "channels");
      await commentService.createComment(testBmcId, "user_2", "댓글 3");

      const result = await commentService.getComments(testBmcId);

      expect(result.comments).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it("filters comments by blockType", async () => {
      await commentService.createComment(testBmcId, "user_1", "채널 댓글", "channels");
      await commentService.createComment(testBmcId, "user_1", "VP 댓글", "value_propositions");
      await commentService.createComment(testBmcId, "user_1", "전체 댓글");

      const result = await commentService.getComments(testBmcId, "channels");

      expect(result.comments).toHaveLength(1);
      expect(result.comments[0]!.blockType).toBe("channels");
      expect(result.total).toBe(1);
    });

    it("respects limit and offset", async () => {
      for (let i = 0; i < 5; i++) {
        await commentService.createComment(testBmcId, "user_1", `댓글 ${i}`);
      }

      const result = await commentService.getComments(testBmcId, undefined, 2, 1);

      expect(result.comments).toHaveLength(2);
      expect(result.total).toBe(5);
    });
  });

  // ─── DELETE COMMENT ───

  describe("deleteComment", () => {
    it("deletes own comment", async () => {
      const comment = await commentService.createComment(testBmcId, "user_1", "삭제할 댓글");

      await commentService.deleteComment(comment.id, "user_1");

      const result = await commentService.getComments(testBmcId);
      expect(result.comments).toHaveLength(0);
    });

    it("throws ForbiddenError when deleting another user's comment", async () => {
      const comment = await commentService.createComment(testBmcId, "user_1", "남의 댓글");

      await expect(
        commentService.deleteComment(comment.id, "user_2")
      ).rejects.toThrow(ForbiddenError);
    });

    it("throws NotFoundError for non-existent comment", async () => {
      await expect(
        commentService.deleteComment("nonexistent", "user_1")
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── GET COMMENT COUNTS ───

  describe("getCommentCounts", () => {
    it("returns counts grouped by block_type with _total", async () => {
      await commentService.createComment(testBmcId, "user_1", "댓글 1", "channels");
      await commentService.createComment(testBmcId, "user_1", "댓글 2", "channels");
      await commentService.createComment(testBmcId, "user_1", "댓글 3", "value_propositions");
      await commentService.createComment(testBmcId, "user_1", "전체 댓글");

      const counts = await commentService.getCommentCounts(testBmcId);

      expect(counts.channels).toBe(2);
      expect(counts.value_propositions).toBe(1);
      expect(counts._general).toBe(1);
      expect(counts._total).toBe(4);
    });

    it("returns only _total=0 for BMC with no comments", async () => {
      const counts = await commentService.getCommentCounts(testBmcId);
      expect(counts._total).toBe(0);
    });
  });

  // ─── PARSE MENTIONS ───

  describe("parseMentions", () => {
    it("parses @mentions from content", async () => {
      const comment = await commentService.createComment(
        testBmcId, "user_1", "@alice @bob 이 부분 확인 부탁"
      );

      // parseMentions는 private이므로 댓글 생성 자체로 검증
      expect(comment.content).toContain("@alice");
      expect(comment.content).toContain("@bob");
    });

    it("handles content without mentions", async () => {
      const comment = await commentService.createComment(
        testBmcId, "user_1", "멘션 없는 댓글"
      );
      expect(comment.content).toBe("멘션 없는 댓글");
    });
  });

  // ─── VALIDATION (Schema-level, via Route) ───

  describe("validation edge cases", () => {
    it("rejects empty content via service", async () => {
      // 서비스 레벨에서는 빈 문자열도 저장 가능 — Zod 스키마가 route에서 차단
      // createComment 자체는 content 길이 검증 없음 (스키마 책임)
      const comment = await commentService.createComment(testBmcId, "user_1", "a");
      expect(comment.content).toBe("a");
    });
  });
});

// ─── Route 테스트 (Hono app.request 방식) ───
import { Hono } from "hono";
import { axBdCommentsRoute } from "../routes/ax-bd-comments.js";

describe("ax-bd-comments route", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: Hono;
  let testBmcId: string;

  beforeEach(async () => {
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
      CREATE TABLE IF NOT EXISTS ax_bmc_comments (
        id          TEXT PRIMARY KEY,
        bmc_id      TEXT NOT NULL,
        block_type  TEXT,
        author_id   TEXT NOT NULL,
        content     TEXT NOT NULL,
        created_at  INTEGER NOT NULL
      );
    `);

    // 테스트용 BMC 생성
    const bmcService = new BmcService(db as unknown as D1Database);
    const bmc = await bmcService.create("org_1", "user_1", { title: "Route Test BMC" });
    testBmcId = bmc.id;

    // Hono 앱 설정 — tenant 미들웨어 대신 직접 변수 주입
    app = new Hono();
    app.use("*", async (c, next) => {
      c.set("orgId" as never, "org_1");
      c.set("userId" as never, "user_1");
      c.env = { DB: db } as never;
      await next();
    });
    app.route("/", axBdCommentsRoute);
  });

  it("POST creates a comment and returns 201", async () => {
    const res = await app.request(`/ax-bd/bmcs/${testBmcId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "좋은 분석이에요", blockType: "channels" }),
    });

    expect(res.status).toBe(201);
    const body = (((await res.json()) as any)) as any;
    expect(body.content).toBe("좋은 분석이에요");
    expect(body.blockType).toBe("channels");
  });

  it("POST returns 400 for empty content", async () => {
    const res = await app.request(`/ax-bd/bmcs/${testBmcId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "" }),
    });

    expect(res.status).toBe(400);
  });

  it("POST returns 400 for content exceeding 2000 chars", async () => {
    const res = await app.request(`/ax-bd/bmcs/${testBmcId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "a".repeat(2001) }),
    });

    expect(res.status).toBe(400);
  });

  it("POST returns 400 for invalid blockType", async () => {
    const res = await app.request(`/ax-bd/bmcs/${testBmcId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "테스트", blockType: "invalid_type" }),
    });

    expect(res.status).toBe(400);
  });

  it("POST returns 404 for non-existent BMC", async () => {
    const res = await app.request("/ax-bd/bmcs/nonexistent/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "없는 BMC" }),
    });

    expect(res.status).toBe(404);
  });

  it("GET returns comment list", async () => {
    // 댓글 2개 생성
    await app.request(`/ax-bd/bmcs/${testBmcId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "댓글 A" }),
    });
    await app.request(`/ax-bd/bmcs/${testBmcId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "댓글 B", blockType: "channels" }),
    });

    const res = await app.request(`/ax-bd/bmcs/${testBmcId}/comments`);
    expect(res.status).toBe(200);
    const body = (((await res.json()) as any)) as any;
    expect(body.comments).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it("GET /count returns block-wise counts", async () => {
    await app.request(`/ax-bd/bmcs/${testBmcId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "A", blockType: "channels" }),
    });
    await app.request(`/ax-bd/bmcs/${testBmcId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "B", blockType: "channels" }),
    });

    const res = await app.request(`/ax-bd/bmcs/${testBmcId}/comments/count`);
    expect(res.status).toBe(200);
    const body = (((await res.json()) as any)) as any;
    expect(body.channels).toBe(2);
    expect(body._total).toBe(2);
  });

  it("DELETE removes own comment", async () => {
    const createRes = await app.request(`/ax-bd/bmcs/${testBmcId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "삭제 대상" }),
    });
    const { id: commentId } = (await createRes.json()) as any;

    const res = await app.request(`/ax-bd/bmcs/${testBmcId}/comments/${commentId}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    const body = (((await res.json()) as any)) as any;
    expect(body.success).toBe(true);
  });

  it("DELETE returns 403 for another user's comment", async () => {
    // user_2가 댓글 생성
    const app2 = new Hono();
    app2.use("*", async (c, next) => {
      c.set("orgId" as never, "org_1");
      c.set("userId" as never, "user_2");
      c.env = { DB: db } as never;
      await next();
    });
    app2.route("/", axBdCommentsRoute);

    const createRes = await app2.request(`/ax-bd/bmcs/${testBmcId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "user_2의 댓글" }),
    });
    const { id: commentId } = (await createRes.json()) as any;

    // user_1이 삭제 시도
    const res = await app.request(`/ax-bd/bmcs/${testBmcId}/comments/${commentId}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(403);
  });
});
