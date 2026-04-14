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
import { DiagnosticCollector } from "../../agent/services/diagnostic-collector.js";
import { MetaAgent } from "../../agent/services/meta-agent.js";
import { MetaApprovalService } from "../../agent/services/meta-approval.js";
import { ProposalRubric } from "../../agent/services/proposal-rubric.js";
import type { DiscoveryType } from "../services/analysis-path-v82.js";
import { GraphSessionService } from "../services/graph-session-service.js";

/**
 * F536/F544: MetaAgent 자동 진단 훅 — Graph 실행 완료 후 자동 호출.
 * DiagnosticReport를 수집하여 score < 70 축에 대한 ImprovementProposal을 저장한다.
 * F544: rubricScore 포함 저장(manual 경로와 동일), metaAgentModel 파라미터 추가.
 * 에러 발생 시 조용히 처리 (호출처에서 .catch 처리).
 */
export async function autoTriggerMetaAgent(
  db: D1Database,
  sessionId: string,
  apiKey: string,
  bizItemId?: string,
  metaAgentModel?: string,
): Promise<void> {
  const collector = new DiagnosticCollector(db);
  // F537: bizItemId 제공 시 biz_item 기반 집계. 아니면 legacy collect.
  const report = bizItemId
    ? await collector.collectByBizItem(bizItemId, sessionId)
    : await collector.collect(sessionId, "discovery-graph");

  console.log("[F544] autoTrigger start", {
    sessionId,
    bizItemId: bizItemId ?? "none",
    overallScore: report.overallScore,
  });

  // F544: metaAgentModel 파라미터로 모델 통일 (default: claude-sonnet-4-6)
  const model = metaAgentModel ?? "claude-sonnet-4-6";
  const metaAgent = new MetaAgent({ apiKey, model });
  let proposals;
  try {
    proposals = await metaAgent.diagnose(report);
  } catch (e) {
    console.error("[F544] MetaAgent.diagnose failed:", e);
    return;
  }

  console.log("[F544] autoTrigger diagnose result", { proposalsCount: proposals.length });

  if (proposals.length === 0) return;

  // F544: rubricScore 포함 저장 — manual path(/api/meta/diagnose)와 동일 경로
  const rubric = new ProposalRubric();
  const approvalService = new MetaApprovalService(db);
  for (const proposal of proposals) {
    const rubricScore = rubric.score(proposal);
    await approvalService.save({ ...proposal, rubricScore, status: "pending" });
  }

  console.log("[F544] autoTrigger saved", { saved: proposals.length, sessionId });
}

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
  const service = new StageRunnerService(c.env.DB, runner, new DiagnosticCollector(c.env.DB));

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
  const service = new StageRunnerService(c.env.DB, runner, new DiagnosticCollector(c.env.DB));

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
  const service = new StageRunnerService(c.env.DB, runner, new DiagnosticCollector(c.env.DB));

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
  const service = new StageRunnerService(c.env.DB, runner, new DiagnosticCollector(c.env.DB));

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

// ─── F535: POST /biz-items/:id/discovery-graph/run-all (정식 API) ───
// Graph 실행 정식 API — sessionId D1 저장 + 조회 지원
const GraphRunAllSchema = z.object({
  discoveryType: z.string().optional(),
  feedback: z.string().optional(),
  graphMode: z.boolean().optional(),
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

  const sessionId = `graph-${bizItemId}-${Date.now()}`;
  const sessionService = new GraphSessionService(c.env.DB);
  await sessionService.createSession(bizItemId, orgId, sessionId, parsed.data.discoveryType);

  const runner = createAgentRunner(c.env);
  const apiKey = c.env.ANTHROPIC_API_KEY ?? "";
  const graphService = new DiscoveryGraphService(runner, c.env.DB, sessionId, apiKey);

  try {
    const result = await graphService.runAll({
      bizItemId,
      orgId,
      discoveryType: parsed.data.discoveryType as DiscoveryType | undefined,
      feedback: parsed.data.feedback,
    });
    await sessionService.updateStatus(sessionId, "completed");
    // F544: waitUntil로 Workers 응답 후에도 완료 보장 (void fire-and-forget → 컨텍스트 종료 위험 해소)
    const triggerTask = autoTriggerMetaAgent(
      c.env.DB, sessionId, apiKey, bizItemId, c.env.META_AGENT_MODEL,
    ).catch((e) => console.error("[F544] MetaAgent auto-trigger failed:", e));
    try {
      c.executionCtx.waitUntil(triggerTask);
    } catch {
      // non-Worker 환경(테스트 등)에서는 waitUntil 없음 — fire-and-forget fallback
    }
    return c.json({ sessionId, status: "completed", result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Graph run failed";
    await sessionService.updateStatus(sessionId, "failed", message);
    return c.json({ error: "GRAPH_RUN_FAILED", message, sessionId, status: "failed" }, 500);
  }
});

// ─── F535: GET /biz-items/:id/discovery-graph/sessions ───
// graph_sessions 목록 조회 (최신순)
discoveryStageRunnerRoute.get("/biz-items/:id/discovery-graph/sessions", async (c) => {
  const bizItemId = c.req.param("id");
  const orgId = c.get("orgId");

  const item = await c.env.DB
    .prepare("SELECT id FROM biz_items WHERE id = ? AND org_id = ?")
    .bind(bizItemId, orgId)
    .first();

  if (!item) {
    return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);
  }

  const sessionService = new GraphSessionService(c.env.DB);
  const sessions = await sessionService.listSessions(bizItemId, orgId);
  const latest = sessions[0] ?? null;

  return c.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      status: s.status,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      errorMsg: s.errorMsg,
    })),
    latestSessionId: latest?.id ?? null,
  });
});
