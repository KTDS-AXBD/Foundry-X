/**
 * F262: BD 프로세스 진행 추적 라우트
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { BdProcessTracker } from "../services/bd-process-tracker.js";
import { progressQuerySchema } from "../schemas/bd-progress.schema.js";

export const axBdProgressRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// ─── GET /ax-bd/progress/summary — 포트폴리오 요약만 ───

axBdProgressRoute.get("/ax-bd/progress/summary", async (c) => {
  const tracker = new BdProcessTracker(c.env.DB);
  const summary = await tracker.getPortfolioSummary(c.get("orgId"));
  return c.json(summary);
});

// ─── GET /ax-bd/progress/:bizItemId — 단일 아이템 진행 상태 ───

axBdProgressRoute.get("/ax-bd/progress/:bizItemId", async (c) => {
  const tracker = new BdProcessTracker(c.env.DB);
  const progress = await tracker.getItemProgress(c.req.param("bizItemId"), c.get("orgId"));

  if (!progress) {
    return c.json({ error: "Item not found in pipeline" }, 404);
  }

  return c.json(progress);
});

// ─── GET /ax-bd/progress — 포트폴리오 진행 목록 ───

axBdProgressRoute.get("/ax-bd/progress", async (c) => {
  const parsed = progressQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const tracker = new BdProcessTracker(c.env.DB);
  const result = await tracker.getPortfolioProgress(c.get("orgId"), parsed.data);
  return c.json(result);
});
