import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { HitlReviewService } from "../services/hitl-review-service.js";
import { submitReviewSchema } from "../schemas/hitl-review-schema.js";

export const hitlReviewRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /hitl/review — 리뷰 기록 생성 + artifact 상태 전환
hitlReviewRoute.post("/hitl/review", async (c) => {
  const body = await c.req.json();
  const parsed = submitReviewSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new HitlReviewService(c.env.DB);
  try {
    const review = await svc.submitReview({
      orgId: c.get("orgId"),
      artifactId: parsed.data.artifactId,
      reviewerId: c.get("userId"),
      action: parsed.data.action,
      reason: parsed.data.reason,
      modifiedContent: parsed.data.modifiedContent,
    });
    return c.json(review, 201);
  } catch (err) {
    if (err instanceof Error && err.message === "Artifact not found") {
      return c.json({ error: "Artifact not found" }, 404);
    }
    throw err;
  }
});

// GET /hitl/history/:artifactId — 리뷰 이력 조회
hitlReviewRoute.get("/hitl/history/:artifactId", async (c) => {
  const svc = new HitlReviewService(c.env.DB);
  const history = await svc.getHistory(c.req.param("artifactId"));
  return c.json({ reviews: history, total: history.length });
});
