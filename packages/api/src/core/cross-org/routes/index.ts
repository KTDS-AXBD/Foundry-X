// F603: Cross-Org Hono sub-app — assign-group, check-export, stats
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import { AuditBus } from "../../infra/types.js";
import { CrossOrgEnforcer } from "../services/cross-org-enforcer.service.js";
import { AssignGroupSchema, CheckExportSchema } from "../schemas/cross-org.js";

export const crossOrgApp = new Hono<{ Bindings: Env }>();

function getEnforcer(env: Env): CrossOrgEnforcer {
  const bus = new AuditBus(env.DB, env.AUDIT_HMAC_KEY ?? "default-hmac-key-32chars-pad");
  return new CrossOrgEnforcer(env.DB, bus);
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
