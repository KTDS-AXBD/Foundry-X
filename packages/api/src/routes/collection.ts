/**
 * Sprint 57 F179: Collection Routes — 수집 채널 통합 API
 * 7개 엔드포인트: agent-collect, jobs, stats, screening-queue, approve, reject, idea-portal webhook
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { AgentCollectSchema, IdeaPortalWebhookSchema, ScreeningRejectSchema } from "../schemas/collection.js";
import { CollectionPipelineService } from "../services/collection-pipeline.js";
import { AgentCollector, CollectorError } from "../services/agent-collector.js";
import { createAgentRunner } from "../services/agent-runner.js";

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
