/**
 * Sprint 94: F263 Discovery Stage 라우트 — biz-item별 단계 진행 추적
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { DiscoveryStageService } from "../services/discovery-stage-service.js";
import { UpdateDiscoveryStageSchema } from "../schemas/discovery-stage.js";

export const discoveryStagesRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// ─── GET /biz-items/:id/discovery-progress ───
discoveryStagesRoute.get("/biz-items/:id/discovery-progress", async (c) => {
  const bizItemId = c.req.param("id");
  const orgId = c.get("orgId");
  const svc = new DiscoveryStageService(c.env.DB);

  // biz-item 존재 확인
  const item = await c.env.DB
    .prepare("SELECT id FROM biz_items WHERE id = ? AND org_id = ?")
    .bind(bizItemId, orgId)
    .first();

  if (!item) {
    return c.json({ error: "BizItem not found" }, 404);
  }

  const progress = await svc.getProgress(bizItemId, orgId);
  return c.json(progress);
});

// ─── POST /biz-items/:id/discovery-stage ───
discoveryStagesRoute.post("/biz-items/:id/discovery-stage", async (c) => {
  const bizItemId = c.req.param("id");
  const orgId = c.get("orgId");
  const body = await c.req.json();

  const parsed = UpdateDiscoveryStageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  // biz-item 존재 확인
  const item = await c.env.DB
    .prepare("SELECT id FROM biz_items WHERE id = ? AND org_id = ?")
    .bind(bizItemId, orgId)
    .first();

  if (!item) {
    return c.json({ error: "BizItem not found" }, 404);
  }

  const svc = new DiscoveryStageService(c.env.DB);
  await svc.updateStage(bizItemId, orgId, parsed.data.stage, parsed.data.status);
  return c.json({ ok: true, stage: parsed.data.stage, status: parsed.data.status });
});
