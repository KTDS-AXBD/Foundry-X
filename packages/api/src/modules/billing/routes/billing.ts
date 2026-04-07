import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { usageTrackingService } from "../services/usage-tracking.service.js";
import { planService } from "../services/plan.service.js";
import { UpdatePlanSchema } from "../schemas/billing.schema.js";

export const billingRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// GET /billing/usage — 현재 월 사용량 조회
billingRoute.get("/billing/usage", async (c) => {
  const orgId = c.get("orgId");
  const db = c.env.DB;

  const summary = await usageTrackingService.getSummary(db, orgId);
  return c.json(summary);
});

// GET /billing/plans — 사용 가능한 요금제 목록
billingRoute.get("/billing/plans", async (c) => {
  const db = c.env.DB;
  const plans = await planService.listPlans(db);
  return c.json({ plans });
});

// PUT /billing/plan — 플랜 변경 (admin 전용)
billingRoute.put("/billing/plan", async (c) => {
  const orgRole = c.get("orgRole");
  if (orgRole !== "admin" && orgRole !== "owner") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const orgId = c.get("orgId");
  const db = c.env.DB;

  const body = await c.req.json();
  const parsed = UpdatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  await planService.updateTenantPlan(db, orgId, parsed.data.planId);
  return c.json({ success: true, planId: parsed.data.planId });
});
