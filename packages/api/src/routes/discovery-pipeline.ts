/**
 * F312+F313: Discovery Pipeline Routes — 10 EP
 * 발굴→형상화 통합 파이프라인 오케스트레이션
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { DiscoveryPipelineService } from "../services/discovery-pipeline-service.js";
import { ShapingOrchestratorService } from "../services/shaping-orchestrator-service.js";
import {
  createPipelineRunSchema,
  listPipelineRunsSchema,
  stepCompleteSchema,
  stepFailedSchema,
  stepActionSchema,
  triggerShapingSchema,
  autoAdvanceSchema,
  checkpointDecisionSchema,
} from "../schemas/discovery-pipeline.js";
import { SkillPipelineRunner } from "../services/skill-pipeline-runner.js";
import { PipelineCheckpointService } from "../services/pipeline-checkpoint-service.js";

export const discoveryPipelineRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// 1) POST /discovery-pipeline/runs — 파이프라인 생성 + 시작
discoveryPipelineRoute.post("/discovery-pipeline/runs", async (c) => {
  const body = await c.req.json();
  const parsed = createPipelineRunSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const svc = new DiscoveryPipelineService(c.env.DB);

  const run = await svc.createRun(orgId, userId, parsed.data);

  // 자동 시작
  await svc.startRun(run.id, userId);

  const detail = await svc.getRun(run.id, orgId);
  return c.json(detail, 201);
});

// 2) GET /discovery-pipeline/runs — 목록 조회
discoveryPipelineRoute.get("/discovery-pipeline/runs", async (c) => {
  const parsed = listPipelineRunsSchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const svc = new DiscoveryPipelineService(c.env.DB);
  const result = await svc.listRuns(c.get("orgId"), parsed.data);
  return c.json(result);
});

// 3) GET /discovery-pipeline/runs/:id — 상세 조회
discoveryPipelineRoute.get("/discovery-pipeline/runs/:id", async (c) => {
  const svc = new DiscoveryPipelineService(c.env.DB);
  const detail = await svc.getRun(c.req.param("id"), c.get("orgId"));

  if (!detail) {
    return c.json({ error: "Pipeline run not found" }, 404);
  }
  return c.json(detail);
});

// 4) POST /discovery-pipeline/runs/:id/step-complete — 단계 완료 보고
discoveryPipelineRoute.post("/discovery-pipeline/runs/:id/step-complete", async (c) => {
  const body = await c.req.json();
  const parsed = stepCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const runId = c.req.param("id");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const svc = new DiscoveryPipelineService(c.env.DB);

  const result = await svc.reportStepComplete(runId, parsed.data.stepId, parsed.data.payload, userId);

  // 2-10 완료 시 자동 형상화 트리거
  if (result.shouldTriggerShaping) {
    const orgId = c.get("orgId");
    await svc.triggerShaping(runId, userId);

    const run = await svc.getRun(runId, orgId);
    const orchestrator = new ShapingOrchestratorService(c.env.DB);
    const shapingRunId = await orchestrator.startAutoShaping(runId, run!.bizItemId, orgId);

    return c.json({ ...result, shapingTriggered: true, shapingRunId });
  }

  return c.json(result);
});

// 5) POST /discovery-pipeline/runs/:id/step-failed — 단계 실패 보고
discoveryPipelineRoute.post("/discovery-pipeline/runs/:id/step-failed", async (c) => {
  const body = await c.req.json();
  const parsed = stepFailedSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const svc = new DiscoveryPipelineService(c.env.DB);
  const result = await svc.reportStepFailed(
    c.req.param("id"),
    parsed.data.stepId,
    parsed.data.errorCode,
    parsed.data.errorMessage,
    userId,
  );
  return c.json(result);
});

// 6) POST /discovery-pipeline/runs/:id/action — 에러 복구 (retry/skip/abort)
discoveryPipelineRoute.post("/discovery-pipeline/runs/:id/action", async (c) => {
  const body = await c.req.json();
  const parsed = stepActionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const svc = new DiscoveryPipelineService(c.env.DB);
  const result = await svc.handleAction(c.req.param("id"), parsed.data, userId);
  return c.json(result);
});

// 7) POST /discovery-pipeline/runs/:id/trigger-shaping — 수동 형상화 트리거
discoveryPipelineRoute.post("/discovery-pipeline/runs/:id/trigger-shaping", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = triggerShapingSchema.safeParse(body);
  const options = parsed.success ? parsed.data : { mode: "auto" as const, maxIterations: 3 };

  const runId = c.req.param("id");
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const svc = new DiscoveryPipelineService(c.env.DB);
  await svc.triggerShaping(runId, userId);

  const run = await svc.getRun(runId, orgId);
  if (!run) {
    return c.json({ error: "Pipeline run not found" }, 404);
  }

  const orchestrator = new ShapingOrchestratorService(c.env.DB);
  const shapingRunId = await orchestrator.startAutoShaping(runId, run.bizItemId, orgId, options);

  return c.json({ shapingRunId, status: "shaping_running" });
});

// 8) POST /discovery-pipeline/runs/:id/pause — 일시 중지
discoveryPipelineRoute.post("/discovery-pipeline/runs/:id/pause", async (c) => {
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const svc = new DiscoveryPipelineService(c.env.DB);
  const result = await svc.pauseRun(c.req.param("id"), userId);
  return c.json(result);
});

// 9) POST /discovery-pipeline/runs/:id/resume — 재개
discoveryPipelineRoute.post("/discovery-pipeline/runs/:id/resume", async (c) => {
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const svc = new DiscoveryPipelineService(c.env.DB);
  const result = await svc.resumeRun(c.req.param("id"), userId);
  return c.json(result);
});

// 10) GET /discovery-pipeline/runs/:id/events — 이벤트 로그
discoveryPipelineRoute.get("/discovery-pipeline/runs/:id/events", async (c) => {
  const svc = new DiscoveryPipelineService(c.env.DB);
  const events = await svc.getEvents(c.req.param("id"));
  return c.json({ events });
});

// ── F314: 자동 파이프라인 + HITL 체크포인트 ──

// 11) POST /discovery-pipeline/runs/:id/auto-advance — 다음 단계 자동 실행
discoveryPipelineRoute.post("/discovery-pipeline/runs/:id/auto-advance", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = autoAdvanceSchema.safeParse(body);
  const options = parsed.success ? parsed.data : { skipCheckpoints: false };

  const runId = c.req.param("id");
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const runner = new SkillPipelineRunner(c.env.DB, c.env.ANTHROPIC_API_KEY);
  const result = await runner.runNextStep(runId, orgId, userId, options.skipCheckpoints);

  // 형상화 트리거 시 자동 연동
  if (result.status === "shaping_triggered") {
    const svc = new DiscoveryPipelineService(c.env.DB);
    await svc.triggerShaping(runId, userId);

    const run = await svc.getRun(runId, orgId);
    const orchestrator = new ShapingOrchestratorService(c.env.DB);
    const shapingRunId = await orchestrator.startAutoShaping(runId, run!.bizItemId, orgId);

    return c.json({ ...result, shapingRunId });
  }

  return c.json(result);
});

// 12) GET /discovery-pipeline/runs/:id/checkpoints — 체크포인트 목록
discoveryPipelineRoute.get("/discovery-pipeline/runs/:id/checkpoints", async (c) => {
  const cpService = new PipelineCheckpointService(c.env.DB);
  const checkpoints = await cpService.listByRun(c.req.param("id"));
  return c.json({ checkpoints });
});

// 13) POST /discovery-pipeline/runs/:id/checkpoints/:cpId/approve — 체크포인트 승인
discoveryPipelineRoute.post("/discovery-pipeline/runs/:id/checkpoints/:cpId/approve", async (c) => {
  const body = await c.req.json();
  const parsed = checkpointDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const cpService = new PipelineCheckpointService(c.env.DB);
  const result = await cpService.approve(c.req.param("cpId"), userId, parsed.data);
  return c.json(result);
});

// 14) POST /discovery-pipeline/runs/:id/checkpoints/:cpId/reject — 체크포인트 거부
discoveryPipelineRoute.post("/discovery-pipeline/runs/:id/checkpoints/:cpId/reject", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason : undefined;

  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const cpService = new PipelineCheckpointService(c.env.DB);
  const checkpoint = await cpService.reject(c.req.param("cpId"), userId, reason);
  return c.json(checkpoint);
});
