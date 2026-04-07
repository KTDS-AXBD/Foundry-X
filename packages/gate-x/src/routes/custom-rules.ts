import { Hono } from "hono";
import type { GateEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { CustomRuleService } from "../services/custom-rule-service.js";
import { CreateCustomRuleSchema, UpdateCustomRuleSchema } from "../schemas/custom-rule.schema.js";

export const customRulesRoute = new Hono<{ Bindings: GateEnv; Variables: TenantVariables }>();

customRulesRoute.get("/custom-rules", async (c) => {
  const svc = new CustomRuleService(c.env.DB);
  return c.json(await svc.list(c.get("orgId")));
});

customRulesRoute.post("/custom-rules", async (c) => {
  const body = await c.req.json();
  const parsed = CreateCustomRuleSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  const svc = new CustomRuleService(c.env.DB);
  return c.json(await svc.create(c.get("orgId"), c.get("userId"), parsed.data), 201);
});

customRulesRoute.get("/custom-rules/:id", async (c) => {
  const svc = new CustomRuleService(c.env.DB);
  const rule = await svc.getById(c.req.param("id"), c.get("orgId"));
  if (!rule) return c.json({ error: "Not found" }, 404);
  return c.json(rule);
});

customRulesRoute.put("/custom-rules/:id", async (c) => {
  const body = await c.req.json();
  const parsed = UpdateCustomRuleSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  const svc = new CustomRuleService(c.env.DB);
  const updated = await svc.update(c.req.param("id"), c.get("orgId"), parsed.data);
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

customRulesRoute.delete("/custom-rules/:id", async (c) => {
  const svc = new CustomRuleService(c.env.DB);
  const deleted = await svc.delete(c.req.param("id"), c.get("orgId"));
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true }, 200);
});

customRulesRoute.post("/custom-rules/:id/activate", async (c) => {
  const svc = new CustomRuleService(c.env.DB);
  const result = await svc.toggleActivate(c.req.param("id"), c.get("orgId"));
  if (!result) return c.json({ error: "Not found" }, 404);
  return c.json(result);
});
