/**
 * Sprint 234: F480 Discovery Stage Runner 라우트
 * POST /biz-items/:id/discovery-stage/:stage/run — AI 분석 실행
 * POST /biz-items/:id/discovery-stage/:stage/confirm — HITL 확인
 */
import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { createAgentRunner } from "../../agent/services/agent-runner.js";
import { StageRunnerService } from "../services/stage-runner-service.js";
import type { DiscoveryType } from "../services/analysis-path-v82.js";

const StageRunSchema = z.object({
  feedback: z.string().optional(),
});

const StageConfirmSchema = z.object({
  viabilityAnswer: z.enum(["go", "pivot", "stop"]),
  feedback: z.string().optional(),
});

export const discoveryStageRunnerRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// ─── GET /biz-items/:id/discovery-stage/:stage/result ─── (F485)
discoveryStageRunnerRoute.get("/biz-items/:id/discovery-stage/:stage/result", async (c) => {
  const bizItemId = c.req.param("id");
  const stage = c.req.param("stage");
  const orgId = c.get("orgId");

  const item = await c.env.DB
    .prepare("SELECT id FROM biz_items WHERE id = ? AND org_id = ?")
    .bind(bizItemId, orgId)
    .first();

  if (!item) {
    return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);
  }

  const runner = createAgentRunner(c.env);
  const service = new StageRunnerService(c.env.DB, runner);

  const result = await service.getStageResult(bizItemId, orgId, stage);
  if (!result) {
    return c.json({ error: "STAGE_RESULT_NOT_FOUND" }, 404);
  }

  return c.json(result);
});

// ─── POST /biz-items/:id/discovery-stage/:stage/run ───
discoveryStageRunnerRoute.post("/biz-items/:id/discovery-stage/:stage/run", async (c) => {
  const bizItemId = c.req.param("id");
  const stage = c.req.param("stage");
  const orgId = c.get("orgId");

  // biz-item 존재 확인 + discoveryType 조회
  const item = await c.env.DB
    .prepare("SELECT id, discovery_type FROM biz_items WHERE id = ? AND org_id = ?")
    .bind(bizItemId, orgId)
    .first<{ id: string; discovery_type: string | null }>();

  if (!item) {
    return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = StageRunSchema.safeParse(body);
  const feedback = parsed.success ? parsed.data.feedback : undefined;

  const runner = createAgentRunner(c.env);
  const service = new StageRunnerService(c.env.DB, runner);

  try {
    const result = await service.runStage(
      bizItemId,
      orgId,
      stage,
      (item.discovery_type as DiscoveryType) ?? null,
      feedback,
    );
    return c.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stage run failed";
    return c.json({ error: "STAGE_RUN_FAILED", message }, 500);
  }
});

// ─── POST /biz-items/:id/discovery-stage/:stage/confirm ───
discoveryStageRunnerRoute.post("/biz-items/:id/discovery-stage/:stage/confirm", async (c) => {
  const bizItemId = c.req.param("id");
  const stage = c.req.param("stage");
  const orgId = c.get("orgId");

  // biz-item 존재 확인
  const item = await c.env.DB
    .prepare("SELECT id FROM biz_items WHERE id = ? AND org_id = ?")
    .bind(bizItemId, orgId)
    .first();

  if (!item) {
    return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = StageConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const runner = createAgentRunner(c.env);
  const service = new StageRunnerService(c.env.DB, runner);

  try {
    const result = await service.confirmStage(
      bizItemId,
      orgId,
      stage,
      parsed.data.viabilityAnswer,
      parsed.data.feedback,
    );
    return c.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stage confirm failed";
    return c.json({ error: "STAGE_CONFIRM_FAILED", message }, 500);
  }
});
