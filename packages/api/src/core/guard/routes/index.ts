import { Hono } from "hono";
import type { Env } from "../../../env.js";
import { AuditBus } from "../../infra/types.js";
import { PolicyEngine } from "../../policy/types.js";
import { GuardEngine } from "../services/guard-engine.service.js";
import { GuardCheckRequestSchema } from "../schemas/guard.js";

export const guardApp = new Hono<{ Bindings: Env }>();

function getEngine(env: Env): GuardEngine {
  const bus = new AuditBus(env.DB, env.AUDIT_HMAC_KEY ?? "default-hmac-key-32chars-pad");
  const policyEngine = new PolicyEngine(env.DB, bus);
  return new GuardEngine(
    env.DB,
    policyEngine,
    bus,
    env.GUARD_HMAC_KEY ?? "default-guard-hmac-key-32chars",
  );
}

guardApp.post("/check", async (c) => {
  const body = await c.req.json();
  const parsed = GuardCheckRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues }, 400);
  }
  const engine = getEngine(c.env);
  const result = await engine.check(parsed.data);
  return c.json(result, 200);
});
