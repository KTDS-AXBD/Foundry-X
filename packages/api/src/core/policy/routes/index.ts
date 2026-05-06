import { Hono } from "hono";
import { AuditBus } from "../../infra/audit-bus.js";
import { PolicyEngine } from "../services/policy-engine.service.js";
import { EvaluatePolicySchema, RegisterPolicySchema } from "../schemas/policy.js";
import type { Env } from "../../../env.js";

export const policyApp = new Hono<{ Bindings: Env }>();

function getEngine(env: Env): PolicyEngine {
  const bus = new AuditBus(env.DB, env.AUDIT_HMAC_KEY ?? "default-hmac-key-32chars-pad");
  return new PolicyEngine(env.DB, bus);
}

policyApp.post("/evaluate", async (c) => {
  const body = await c.req.json();
  const parsed = EvaluatePolicySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues }, 400);
  }
  const engine = getEngine(c.env);
  const result = await engine.evaluate(parsed.data.orgId, parsed.data.actionType, parsed.data.context);
  return c.json(result, 200);
});

policyApp.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = RegisterPolicySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues }, 400);
  }
  const engine = getEngine(c.env);
  const result = await engine.registerPolicy(parsed.data);
  return c.json(result, 201);
});
