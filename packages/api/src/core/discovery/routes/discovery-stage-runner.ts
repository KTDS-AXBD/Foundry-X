/**
 * Sprint 234: F480 Discovery Stage Runner 라우트
 * POST /biz-items/:id/discovery-stage/:stage/run — AI 분석 실행
 * POST /biz-items/:id/discovery-stage/:stage/confirm — HITL 확인
 */
import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { createAgentRunner, createRoutedRunner } from "../../agent/services/agent-runner.js";
import { StageRunnerService } from "../services/stage-runner-service.js";
import { DiscoveryGraphService } from "../services/discovery-graph-service.js";
import type { DiscoveryType } from "../services/analysis-path-v82.js";

const StageRunSchema = z.object({
  feedback: z.string().optional(),
});

const StageConfirmSchema = z.object({
  viabilityAnswer: z.enum(["go", "pivot", "stop"]),
  feedback: z.string().optional(),
});

const StageResultPatchSchema = z.object({
  summary: z.string().min(1).optional(),
  details: z.string().min(1).optional(),
  confidence: z.number().int().min(0).max(100).optional(),
}).refine((v) => v.summary !== undefined || v.details !== undefined || v.confidence !== undefined, {
  message: "At least one field must be provided",
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

// ─── PATCH /biz-items/:id/discovery-stage/:stage/result ─── (수동 편집)
discoveryStageRunnerRoute.patch("/biz-items/:id/discovery-stage/:stage/result", async (c) => {
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

  const body = await c.req.json().catch(() => ({}));
  const parsed = StageResultPatchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const runner = createAgentRunner(c.env);
  const service = new StageRunnerService(c.env.DB, runner);

  const updated = await service.updateStageResult(bizItemId, orgId, stage, parsed.data);
  if (!updated) {
    return c.json({ error: "STAGE_RESULT_NOT_FOUND" }, 404);
  }

  return c.json(updated);
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

  const runner = await createRoutedRunner(c.env, "discovery-analysis", c.env.DB);
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
    if (message === "STAGE_ALREADY_RUNNING") {
      return c.json({ error: "STAGE_ALREADY_RUNNING", message: "이 단계가 이미 실행 중이에요." }, 409);
    }
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

// ─── POST /biz-items/:id/discovery-graph/run-all ─── (Phase 42 dogfood)
// F531 DiscoveryGraphService.runAll() — 9-stage Graph 파이프라인 전체 실행
const GraphRunAllSchema = z.object({
  discoveryType: z.string().optional(),
  feedback: z.string().optional(),
});

discoveryStageRunnerRoute.post("/biz-items/:id/discovery-graph/run-all", async (c) => {
  const bizItemId = c.req.param("id");
  const orgId = c.get("orgId");

  const item = await c.env.DB
    .prepare("SELECT id FROM biz_items WHERE id = ? AND org_id = ?")
    .bind(bizItemId, orgId)
    .first();

  if (!item) {
    return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = GraphRunAllSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const runner = createAgentRunner(c.env);
  const sessionId = `graph-dogfood-${bizItemId}-${Date.now()}`;
  const apiKey = c.env.ANTHROPIC_API_KEY ?? "";
  const service = new DiscoveryGraphService(runner, c.env.DB, sessionId, apiKey);

  try {
    const result = await service.runAll({
      bizItemId,
      orgId,
      discoveryType: parsed.data.discoveryType as DiscoveryType | undefined,
      feedback: parsed.data.feedback,
    });
    return c.json({ sessionId, result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Graph run failed";
    return c.json({ error: "GRAPH_RUN_FAILED", message, sessionId }, 500);
  }
});
