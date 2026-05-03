/**
 * F539c Group B: discovery-stages 2 라우트 (FX-REQ-578)
 * GET /api/biz-items/:id/discovery-progress
 * POST /api/biz-items/:id/discovery-stage
 * F582: DiagnosticCollector + autoTriggerMetaAgent 배선 (GAP-4 회복)
 */
import { Hono } from "hono";
import type { DiscoveryEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { DiscoveryStageService } from "../services/discovery-stage.service.js";
import { UpdateDiscoveryStageSchema } from "../schemas/discovery-stage.js";
import { StagePublisher } from "../events/stage-publisher.js";
import { DiagnosticCollector } from "../services/diagnostic-collector.js";
import { autoTriggerMetaAgent } from "../services/auto-trigger-meta-agent.js";

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

  // F582: DiagnosticCollector — stage 업데이트 기록 (GAP-4 회복)
  // sessionId 패턴: "stage-{stage}-{bizItemId}" (StageRunnerService와 동일)
  const collector = new DiagnosticCollector(c.env.DB);
  void collector
    .record(
      `stage-${parsed.data.stage}-${bizItemId}`,
      "discovery-stage-runner",
      "success",
      0,
      0,
    )
    .catch((e: unknown) => console.error("[F582] DiagnosticCollector.record failed:", e));

  // F582: autoTriggerMetaAgent — completed 상태 전환 시 MetaAgent 자동 진단 (fire-and-forget)
  if (parsed.data.status === "completed" && c.env.ANTHROPIC_API_KEY) {
    const triggerSessionId = `stage-${parsed.data.stage}-${bizItemId}`;
    void autoTriggerMetaAgent(
      c.env.DB,
      triggerSessionId,
      c.env.ANTHROPIC_API_KEY,
      bizItemId,
    ).catch((e: unknown) => console.error("[F582] autoTriggerMetaAgent failed:", e));
  }

  // F568: stage 변경 이벤트 발행 (fire-and-forget — 실패해도 응답에 영향 없음)
  const publisher = new StagePublisher(c.env.DB);
  void publisher.publishIfComplete(bizItemId, orgId, null, parsed.data.stage);

  return c.json(result);
});
