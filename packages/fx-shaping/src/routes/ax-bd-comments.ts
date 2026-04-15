import { Hono } from "hono";
import type { ShapingEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import {
  BmcCommentService,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../services/bmc-comment-service.js";
import { CreateCommentSchema } from "../schemas/bmc-comment.schema.js";

export const axBdCommentsRoute = new Hono<{
  Bindings: ShapingEnv;
  Variables: TenantVariables;
}>();

// POST /ax-bd/bmcs/:bmcId/comments — 댓글 작성
axBdCommentsRoute.post("/ax-bd/bmcs/:bmcId/comments", async (c) => {
  const body = await c.req.json();
  const parsed = CreateCommentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new BmcCommentService(c.env.DB);
  try {
    const comment = await svc.createComment(
      c.req.param("bmcId"),
      c.get("userId"),
      parsed.data.content,
      parsed.data.blockType
    );
    return c.json(comment, 201);
  } catch (e) {
    if (e instanceof NotFoundError) return c.json({ error: e.message }, 404);
    if (e instanceof ValidationError) return c.json({ error: e.message }, 400);
    throw e;
  }
});

// GET /ax-bd/bmcs/:bmcId/comments — 댓글 목록
axBdCommentsRoute.get("/ax-bd/bmcs/:bmcId/comments", async (c) => {
  const { block, limit, offset } = c.req.query();
  const svc = new BmcCommentService(c.env.DB);
  const result = await svc.getComments(
    c.req.param("bmcId"),
    block || undefined,
    Number(limit) || 20,
    Number(offset) || 0
  );
  return c.json(result);
});

// GET /ax-bd/bmcs/:bmcId/comments/count — 블록별 댓글 수
axBdCommentsRoute.get("/ax-bd/bmcs/:bmcId/comments/count", async (c) => {
  const svc = new BmcCommentService(c.env.DB);
  const counts = await svc.getCommentCounts(c.req.param("bmcId"));
  return c.json(counts);
});

// DELETE /ax-bd/bmcs/:bmcId/comments/:commentId — 댓글 삭제
axBdCommentsRoute.delete("/ax-bd/bmcs/:bmcId/comments/:commentId", async (c) => {
  const svc = new BmcCommentService(c.env.DB);
  try {
    await svc.deleteComment(c.req.param("commentId"), c.get("userId"));
    return c.json({ success: true });
  } catch (e) {
    if (e instanceof NotFoundError) return c.json({ error: e.message }, 404);
    if (e instanceof ForbiddenError) return c.json({ error: e.message }, 403);
    throw e;
  }
});
