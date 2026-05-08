// F603: Cross-Org Hono sub-app — assign-group, check-export, stats
// F626: blocking-rate 추가 (T4 마무리)
// F620: policy-embedder + expert-review + launch-blocking-signal (T5 마지막)
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import { AuditBus } from "../../infra/types.js";
import { KVCacheService } from "../../infra/kv-cache.js";
import { LLMService } from "../../infra/llm.js";
import { CrossOrgEnforcer } from "../services/cross-org-enforcer.service.js";
import { BlockingRateService } from "../services/blocking-rate.service.js";
import { PolicyEmbedder } from "../services/policy-embedder.service.js";
import { ExpertReviewManager } from "../services/expert-review-manager.service.js";
import { LaunchBlockingSignalService } from "../services/launch-blocking-signal.service.js";
import {
  AssignGroupSchema,
  BlockingRateQuerySchema,
  CheckExportSchema,
  EmbedPolicySchema,
  EnqueueReviewSchema,
  FindSimilarSchema,
  NotifyLaunchSchema,
  SignOffReviewSchema,
} from "../schemas/cross-org.js";

export const crossOrgApp = new Hono<{ Bindings: Env }>();

function getAuditBus(env: Env): AuditBus {
  return new AuditBus(env.DB, env.AUDIT_HMAC_KEY ?? "default-hmac-key-32chars-pad");
}

function getEnforcer(env: Env): CrossOrgEnforcer {
  return new CrossOrgEnforcer(env.DB, getAuditBus(env));
}

function getBlockingRateService(env: Env): BlockingRateService {
  return new BlockingRateService(env.DB, getAuditBus(env));
}

function getPolicyEmbedder(env: Env): PolicyEmbedder {
  const cache = new KVCacheService(env.CACHE);
  const llm = new LLMService(env.AI, env.ANTHROPIC_API_KEY);
  return new PolicyEmbedder(env.DB, cache, llm);
}

function getReviewManager(env: Env): ExpertReviewManager {
  return new ExpertReviewManager(env.DB, getAuditBus(env));
}

function getLaunchBlockingSignal(env: Env): LaunchBlockingSignalService {
  return new LaunchBlockingSignalService(getAuditBus(env));
}

crossOrgApp.post("/assign-group", async (c) => {
  const body = await c.req.json();
  const parsed = AssignGroupSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);
  const assignment = await getEnforcer(c.env).assignGroup(parsed.data);
  return c.json(assignment, 200);
});

crossOrgApp.post("/check-export", async (c) => {
  const body = await c.req.json();
  const parsed = CheckExportSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);
  const result = await getEnforcer(c.env).checkExport(parsed.data);
  return c.json(result, 200);
});

crossOrgApp.get("/stats", async (c) => {
  const orgId = c.req.query("org_id");
  if (!orgId) return c.json({ error: "org_id required" }, 400);
  const stats = await getEnforcer(c.env).getGroupStats(orgId);
  return c.json(stats, 200);
});

// F626: core_differentiator 차단율 측정 (PRD §5.3 100% 미달 게이트)
crossOrgApp.get("/blocking-rate", async (c) => {
  const parsed = BlockingRateQuerySchema.safeParse({
    org_id: c.req.query("org_id"),
    days: c.req.query("days"),
  });
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);
  const result = await getBlockingRateService(c.env).calculateBlockingRate(
    parsed.data.org_id,
    parsed.data.days,
  );
  return c.json(result, 200);
});

// F620 CO-I01: PolicyEmbedder
crossOrgApp.post("/embed", async (c) => {
  const parsed = EmbedPolicySchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);
  const result = await getPolicyEmbedder(c.env).embedPolicy(
    parsed.data.text,
    parsed.data.orgId,
    parsed.data.sourceKind,
  );
  return c.json(result, 200);
});

crossOrgApp.post("/find-similar", async (c) => {
  const parsed = FindSimilarSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);
  const result = await getPolicyEmbedder(c.env).findSimilar(
    parsed.data.text,
    parsed.data.orgId,
    parsed.data.threshold,
    parsed.data.limit,
  );
  return c.json(result, 200);
});

// F620 CO-I04: ExpertReviewManager
crossOrgApp.post("/review/enqueue", async (c) => {
  const parsed = EnqueueReviewSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);
  const result = await getReviewManager(c.env).enqueueReview(parsed.data);
  return c.json(result, 200);
});

crossOrgApp.get("/review/queue", async (c) => {
  const orgId = c.req.query("org_id");
  if (!orgId) return c.json({ error: "org_id required" }, 400);
  const status = c.req.query("status") as "pending" | "in_review" | "signed_off" | undefined;
  const queue = await getReviewManager(c.env).getQueue(orgId, status);
  return c.json(queue, 200);
});

crossOrgApp.post("/review/sign-off", async (c) => {
  const parsed = SignOffReviewSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);
  const result = await getReviewManager(c.env).signOff(parsed.data);
  if (!result) return c.json({ error: "review not found" }, 404);
  return c.json(result, 200);
});

// F620 CO-I07: Launch-X 차단 신호
crossOrgApp.post("/launch/notify-blocked", async (c) => {
  const parsed = NotifyLaunchSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);
  const result = await getLaunchBlockingSignal(c.env).notifyLaunch(parsed.data);
  return c.json(result, 200);
});
