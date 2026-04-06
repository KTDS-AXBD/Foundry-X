// ─── F391: User Evaluations Routes (Sprint 178) ───

import { Hono } from "hono";
import { CreateUserEvaluationSchema } from "../schemas/user-evaluation-schema.js";
import { UserEvaluationService } from "../services/user-evaluation-service.js";
import { CalibrationService } from "../services/calibration-service.js";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";

export const userEvaluationsRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /user-evaluations — 수동 평가 등록
userEvaluationsRoute.post("/user-evaluations", async (c) => {
  const orgId = c.get("orgId");
  const raw = await c.req.json();
  const parsed = CreateUserEvaluationSchema.safeParse(raw);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const svc = new UserEvaluationService(c.env.DB);
  const evaluation = await svc.create(orgId, parsed.data);
  return c.json({ evaluation }, 201);
});

// GET /user-evaluations/correlation — 자동-수동 상관관계
// NOTE: 이 라우트를 /:jobId보다 먼저 등록해야 함
userEvaluationsRoute.get("/user-evaluations/correlation", async (c) => {
  const orgId = c.get("orgId");
  const svc = new CalibrationService(c.env.DB);
  const correlation = await svc.computeCorrelation(orgId);
  return c.json({ correlation });
});

// GET /user-evaluations/:jobId — Job별 수동 평가 목록
userEvaluationsRoute.get("/user-evaluations/:jobId", async (c) => {
  const orgId = c.get("orgId");
  const jobId = c.req.param("jobId");
  const svc = new UserEvaluationService(c.env.DB);
  const items = await svc.listByJob(orgId, jobId);
  return c.json({ items });
});
