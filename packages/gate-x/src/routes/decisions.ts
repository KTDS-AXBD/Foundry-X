import { Hono } from "hono";
import type { GateEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { DecisionService } from "../services/decision-service.js";
import { CreateDecisionSchema, DecisionFilterSchema } from "../schemas/decision.schema.js";

export const decisionsRoute = new Hono<{ Bindings: GateEnv; Variables: TenantVariables }>();

decisionsRoute.post("/decisions", async (c) => {
  const body = await c.req.json();
  const parsed = CreateDecisionSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  const svc = new DecisionService(c.env.DB);
  const decision = await svc.create({ bizItemId: parsed.data.bizItemId, orgId: c.get("orgId"), decision: parsed.data.decision, comment: parsed.data.comment, decidedBy: c.get("userId") });
  return c.json(decision, 201);
});

decisionsRoute.get("/decisions/stats", async (c) => {
  return c.json(await new DecisionService(c.env.DB).getStats(c.get("orgId")));
});

decisionsRoute.get("/decisions/pending", async (c) => {
  return c.json(await new DecisionService(c.env.DB).getPending(c.get("orgId")));
});

decisionsRoute.get("/decisions", async (c) => {
  const parsed = DecisionFilterSchema.safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: "Invalid filters", details: parsed.error.flatten() }, 400);
  const svc = new DecisionService(c.env.DB);
  const bizItemId = c.req.query("bizItemId");
  if (bizItemId) return c.json(await svc.listByItem(bizItemId, c.get("orgId")));
  return c.json(await svc.listByOrg(c.get("orgId"), { limit: parsed.data.limit, offset: parsed.data.offset }));
});
