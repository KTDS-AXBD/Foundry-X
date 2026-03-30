/**
 * Sprint 79: Decisions Routes — 의사결정 워크플로 (F239)
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { DecisionService } from "../services/decision-service.js";
import { CreateDecisionSchema, DecisionFilterSchema } from "../schemas/decision.schema.js";

export const decisionsRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// POST /decisions — 의사결정 등록 (Go/Hold/Drop)
decisionsRoute.post("/decisions", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json();
  const parsed = CreateDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new DecisionService(c.env.DB);
  const decision = await svc.create({
    bizItemId: parsed.data.bizItemId,
    orgId,
    decision: parsed.data.decision,
    comment: parsed.data.comment,
    decidedBy: userId,
  });

  return c.json(decision, 201);
});

// GET /decisions — 의사결정 이력
decisionsRoute.get("/decisions", async (c) => {
  const orgId = c.get("orgId");
  const query = c.req.query();
  const parsed = DecisionFilterSchema.safeParse(query);
  if (!parsed.success) {
    return c.json({ error: "Invalid filters", details: parsed.error.flatten() }, 400);
  }

  const bizItemId = c.req.query("bizItemId");
  const svc = new DecisionService(c.env.DB);

  if (bizItemId) {
    const decisions = await svc.listByItem(bizItemId, orgId);
    return c.json(decisions);
  }

  const decisions = await svc.listByOrg(orgId, {
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });
  return c.json(decisions);
});

// GET /decisions/stats — 의사결정 통계
decisionsRoute.get("/decisions/stats", async (c) => {
  const orgId = c.get("orgId");
  const svc = new DecisionService(c.env.DB);
  const stats = await svc.getStats(orgId);
  return c.json(stats);
});

// GET /decisions/pending — 대기 중 의사결정
decisionsRoute.get("/decisions/pending", async (c) => {
  const orgId = c.get("orgId");
  const svc = new DecisionService(c.env.DB);
  const pending = await svc.getPending(orgId);
  return c.json(pending);
});
