/**
 * Sprint 57 F179: Collection Routes — 수집 채널 통합 API
 * 7개 엔드포인트: agent-collect, jobs, stats, screening-queue, approve, reject, idea-portal webhook
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { AgentCollectSchema, IdeaPortalWebhookSchema, ScreeningRejectSchema, AgentScheduleCreateSchema, AgentRunsQuerySchema, AgentTriggerSchema } from "../schemas/collection.js";
import { CollectionPipelineService } from "../services/collection-pipeline.js";
import { AgentCollector, CollectorError } from "../../discovery/services/agent-collector.js";
import { createAgentRunner } from "../../../core/agent/services/agent-runner.js";
import { AgentCollectionService } from "../../agent/services/agent-collection.js";

export const collectionRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// ─── POST /collection/agent-collect — LLM 기반 자동 수집 ───

collectionRoute.post("/collection/agent-collect", async (c) => {
  const body = await c.req.json();
  const parsed = AgentCollectSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "INVALID_KEYWORDS", details: parsed.error.flatten() }, 400);
  }

  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const pipeline = new CollectionPipelineService(c.env.DB);

  const jobId = await pipeline.createJob(orgId, userId, "agent", parsed.data.keywords);

  const runner = createAgentRunner(c.env);
  const collector = new AgentCollector(runner);

  try {
    const collectResult = await collector.collect(parsed.data);
    const result = await pipeline.ingest(orgId, userId, collectResult.items, jobId);

    return c.json({
      ...result,
      tokensUsed: collectResult.tokensUsed,
      model: collectResult.model,
      duration: collectResult.duration,
    }, 201);
  } catch (e) {
    await pipeline.failJob(jobId, e instanceof Error ? e.message : "Unknown error");
    if (e instanceof CollectorError) {
      const status = e.code === "LLM_PARSE_ERROR" ? 502 : e.code === "EMPTY_RESULT" ? 422 : 502;
      return c.json({ error: e.code, message: e.message }, status);
    }
    throw e;
  }
});

// ─── GET /collection/jobs — 수집 작업 이력 ───

collectionRoute.get("/collection/jobs", async (c) => {
  const orgId = c.get("orgId");
  const channel = c.req.query("channel") || undefined;
  const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;

  const pipeline = new CollectionPipelineService(c.env.DB);
  const jobs = await pipeline.listJobs(orgId, { channel, limit });

  return c.json({ jobs });
});

// ─── GET /collection/stats — 수집 통계 ───

collectionRoute.get("/collection/stats", async (c) => {
  const orgId = c.get("orgId");
  const pipeline = new CollectionPipelineService(c.env.DB);
  const stats = await pipeline.getStats(orgId);

  return c.json(stats);
});

// ─── GET /collection/screening-queue — 심사 대기 목록 ───

collectionRoute.get("/collection/screening-queue", async (c) => {
  const orgId = c.get("orgId");
  const pipeline = new CollectionPipelineService(c.env.DB);
  const items = await pipeline.getScreeningQueue(orgId);

  return c.json({ items });
});

// ─── POST /collection/screening-queue/:id/approve — 아이템 승인 ───

collectionRoute.post("/collection/screening-queue/:id/approve", async (c) => {
  const id = c.req.param("id");
  const orgId = c.get("orgId");

  const row = await c.env.DB
    .prepare(`SELECT id, status FROM biz_items WHERE id = ? AND org_id = ?`)
    .bind(id, orgId)
    .first<{ id: string; status: string }>();

  if (!row) {
    return c.json({ error: "ITEM_NOT_FOUND" }, 404);
  }
  if (row.status !== "pending_review") {
    return c.json({ error: "NOT_PENDING_REVIEW" }, 409);
  }

  const pipeline = new CollectionPipelineService(c.env.DB);
  await pipeline.approveItem(id);

  return c.json({ id, status: "draft" });
});

// ─── POST /collection/screening-queue/:id/reject — 아이템 반려 ───

collectionRoute.post("/collection/screening-queue/:id/reject", async (c) => {
  const id = c.req.param("id");
  const orgId = c.get("orgId");

  const body = await c.req.json().catch(() => ({}));
  const parsed = ScreeningRejectSchema.safeParse(body);

  const row = await c.env.DB
    .prepare(`SELECT id, status FROM biz_items WHERE id = ? AND org_id = ?`)
    .bind(id, orgId)
    .first<{ id: string; status: string }>();

  if (!row) {
    return c.json({ error: "ITEM_NOT_FOUND" }, 404);
  }
  if (row.status !== "pending_review") {
    return c.json({ error: "NOT_PENDING_REVIEW" }, 409);
  }

  const pipeline = new CollectionPipelineService(c.env.DB);
  await pipeline.rejectItem(id, parsed.success ? parsed.data.reason : undefined);

  return c.json({ id, status: "rejected" });
});

// ─── POST /collection/agent-schedule — 자동 수집 스케줄 설정 ───

collectionRoute.post("/collection/agent-schedule", async (c) => {
  const body = await c.req.json();
  const parsed = AgentScheduleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "INVALID_SCHEDULE", details: parsed.error.flatten() }, 400);
  }

  const orgId = c.get("orgId");
  const svc = new AgentCollectionService(c.env.DB);
  const schedule = await svc.createSchedule(orgId, parsed.data);

  return c.json({ schedule }, 201);
});

// ─── GET /collection/agent-runs — 수집 실행 이력 ───

collectionRoute.get("/collection/agent-runs", async (c) => {
  const orgId = c.get("orgId");
  const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;
  const status = c.req.query("status") || undefined;

  const parsed = AgentRunsQuerySchema.safeParse({ limit, status });
  if (!parsed.success) {
    return c.json({ error: "INVALID_QUERY", details: parsed.error.flatten() }, 400);
  }

  const svc = new AgentCollectionService(c.env.DB);
  const result = await svc.listRuns(orgId, parsed.data);

  return c.json(result);
});

// ─── POST /collection/agent-trigger — 즉시 수집 실행 ───

collectionRoute.post("/collection/agent-trigger", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = AgentTriggerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "INVALID_TRIGGER", details: parsed.error.flatten() }, 400);
  }

  const orgId = c.get("orgId");
  const svc = new AgentCollectionService(c.env.DB);

  const source = parsed.data.source ?? "market";
  const run = await svc.createRun(orgId, source);

  // 비동기 수집 — run 생성 즉시 응답, 실제 수집은 백그라운드
  const runner = createAgentRunner(c.env);
  const collector = new AgentCollector(runner);
  const keywords = parsed.data.keywords ?? [];

  const collectTask = (async () => {
    try {
      const result = await collector.collect({ keywords, maxItems: 5, focusArea: source });
      const pipeline = new CollectionPipelineService(c.env.DB);
      const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
      await pipeline.ingest(orgId, userId, result.items, run.id);
      await svc.completeRun(run.id, result.items.length);
    } catch (e) {
      await svc.failRun(run.id, e instanceof Error ? e.message : "Unknown error");
    }
  })();

  try {
    c.executionCtx.waitUntil(collectTask);
  } catch {
    // Workers 밖 환경(테스트 등)에서는 waitUntil 없음 — fire and forget
  }

  return c.json({ runId: run.id, status: "running" }, 201);
});

// ─── POST /webhooks/idea-portal — 외부 IDEA Portal Webhook ───

export const ideaPortalWebhookRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

ideaPortalWebhookRoute.post("/webhooks/idea-portal", async (c) => {
  // HMAC-SHA256 서명 검증
  const signature = c.req.header("X-Webhook-Signature") ?? "";
  const secret = c.env.WEBHOOK_SECRET;

  if (!secret) {
    return c.json({ error: "WEBHOOK_NOT_CONFIGURED" }, 500);
  }

  const rawBody = await c.req.text();

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (signature !== `sha256=${expected}`) {
    return c.json({ error: "INVALID_SIGNATURE" }, 401);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return c.json({ error: "INVALID_PAYLOAD" }, 400);
  }

  const parsed = IdeaPortalWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "INVALID_PAYLOAD", details: parsed.error.flatten() }, 400);
  }

  // Webhook은 org_id를 query param으로 받음
  const orgId = c.req.query("org_id");
  if (!orgId) {
    return c.json({ error: "MISSING_ORG_ID" }, 400);
  }

  const pipeline = new CollectionPipelineService(c.env.DB);
  const userId = parsed.data.submittedBy ?? "idea-portal";
  const jobId = await pipeline.createJob(orgId, userId, "idea_portal");

  const result = await pipeline.ingest(orgId, userId, [{
    title: parsed.data.title,
    description: parsed.data.description ?? "",
    source: "idea_portal",
  }], jobId);

  const firstItem = result.items[0];
  return c.json({
    id: firstItem?.id ?? jobId,
    status: "pending_review",
  }, 201);
});
