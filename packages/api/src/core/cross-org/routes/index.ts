// F603: Cross-Org Hono sub-app — assign-group, check-export, stats
// F626: blocking-rate 추가 (T4 마무리)
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import { AuditBus } from "../../infra/types.js";
import { CrossOrgEnforcer } from "../services/cross-org-enforcer.service.js";
import { BlockingRateService } from "../services/blocking-rate.service.js";
import { AssignGroupSchema, BlockingRateQuerySchema, CheckExportSchema } from "../schemas/cross-org.js";

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
