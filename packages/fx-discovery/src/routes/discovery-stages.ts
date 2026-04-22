/**
 * F539c Group B: discovery-stages 2 라우트 (FX-REQ-578)
 * GET /api/biz-items/:id/discovery-progress
 * POST /api/biz-items/:id/discovery-stage
 */
import { Hono } from "hono";
import type { DiscoveryEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { DiscoveryStageService } from "../services/discovery-stage.service.js";
import { UpdateDiscoveryStageSchema } from "../schemas/discovery-stage.js";
import { StagePublisher } from "../events/stage-publisher.js";

export const discoveryStagesRoute = new Hono<{ Bindings: DiscoveryEnv; Variables: TenantVariables }>();

// GET /biz-items/:id/discovery-progress
discoveryStagesRoute.get("/biz-items/:id/discovery-progress", async (c) => {
  const bizItemId = c.req.param("id");
  const orgId = c.get("orgId");
  const svc = new DiscoveryStageService(c.env.DB);
  const progress = await svc.getProgress(bizItemId, orgId);
  return c.json(progress);
});

// POST /biz-items/:id/discovery-stage
discoveryStagesRoute.post("/biz-items/:id/discovery-stage", async (c) => {
  const bizItemId = c.req.param("id");
  const orgId = c.get("orgId");

  const body = await c.req.json();
  const parsed = UpdateDiscoveryStageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new DiscoveryStageService(c.env.DB);
  const result = await svc.updateStage(bizItemId, orgId, parsed.data.stage, parsed.data.status);

  // F568: stage 변경 이벤트 발행 (fire-and-forget — 실패해도 응답에 영향 없음)
  const publisher = new StagePublisher(c.env.DB);
  void publisher.publishIfComplete(bizItemId, orgId, null, parsed.data.stage);

  return c.json(result);
});
