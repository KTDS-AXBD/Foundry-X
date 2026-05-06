import { Hono } from "hono";
import { AuditBus } from "../../infra/types.js";
import { EthicsEnforcer } from "../services/ethics-enforcer.service.js";
import {
  CheckConfidenceSchema,
  RecordFPSchema,
  KillSwitchToggleSchema,
} from "../schemas/ethics.js";
import type { Env } from "../../../env.js";

export const ethicsApp = new Hono<{ Bindings: Env }>();

function getEnforcer(env: Env): EthicsEnforcer {
  const bus = new AuditBus(env.DB, env.AUDIT_HMAC_KEY ?? "default-hmac-key-32chars-pad");
  return new EthicsEnforcer(env.DB, bus);
}

ethicsApp.post("/check-confidence", async (c) => {
  const body = await c.req.json();
  const parsed = CheckConfidenceSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);
  const result = await getEnforcer(c.env).checkConfidence(parsed.data);
  return c.json(result, 200);
});

ethicsApp.get("/violations", async (c) => {
  const agentId = c.req.query("agent_id") ?? "";
  const limit = Number(c.req.query("limit") ?? 20);
  const rows = await c.env.DB
    .prepare(
      `SELECT * FROM ethics_violations
       WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .bind(agentId, limit)
    .all();
  return c.json({ items: rows.results ?? [] });
});

ethicsApp.post("/kill-switch", async (c) => {
  const body = await c.req.json();
  const parsed = KillSwitchToggleSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);
  const state = await getEnforcer(c.env).triggerKillSwitch(parsed.data);
  return c.json(state, 200);
});

ethicsApp.get("/fp-stats", async (c) => {
  const agentId = c.req.query("agent_id") ?? "";
  const orgId = c.req.query("org_id") ?? "";
  const days = Number(c.req.query("days") ?? 7);
  const result = await getEnforcer(c.env).getFPRate(orgId, agentId, days);
  return c.json(result);
});
