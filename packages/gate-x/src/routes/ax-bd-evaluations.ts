import { Hono } from "hono";
import type { GateEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { EvaluationService } from "../services/evaluation-service.js";
import {
  CreateEvaluationSchema,
  UpdateEvalStatusSchema,
  CreateKpiSchema,
  UpdateKpiSchema,
} from "../schemas/evaluation.schema.js";

export const axBdEvaluationsRoute = new Hono<{
  Bindings: GateEnv;
  Variables: TenantVariables;
}>();

axBdEvaluationsRoute.post("/ax-bd/evaluations", async (c) => {
  const body = await c.req.json();
  const parsed = CreateEvaluationSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  const svc = new EvaluationService(c.env.DB);
  const evaluation = await svc.create(c.get("orgId"), c.get("userId"), parsed.data);
  return c.json(evaluation, 201);
});

axBdEvaluationsRoute.get("/ax-bd/evaluations", async (c) => {
  const { status, limit, offset } = c.req.query();
  const svc = new EvaluationService(c.env.DB);
  const result = await svc.list(c.get("orgId"), { status: status || undefined, limit: Number(limit) || 20, offset: Number(offset) || 0 });
  return c.json(result);
});

axBdEvaluationsRoute.get("/ax-bd/evaluations/portfolio", async (c) => {
  const svc = new EvaluationService(c.env.DB);
  return c.json(await svc.getPortfolio(c.get("orgId")));
});

axBdEvaluationsRoute.get("/ax-bd/evaluations/:evalId", async (c) => {
  const svc = new EvaluationService(c.env.DB);
  const evaluation = await svc.getById(c.req.param("evalId"), c.get("orgId"));
  if (!evaluation) return c.json({ error: "Evaluation not found" }, 404);
  return c.json(evaluation);
});

axBdEvaluationsRoute.patch("/ax-bd/evaluations/:evalId", async (c) => {
  const body = await c.req.json();
  const parsed = UpdateEvalStatusSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  const svc = new EvaluationService(c.env.DB);
  try {
    const evaluation = await svc.updateStatus(c.req.param("evalId"), c.get("orgId"), c.get("userId"), parsed.data.status, parsed.data.reason);
    return c.json(evaluation);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Evaluation not found") return c.json({ error: msg }, 404);
    if (msg.startsWith("Invalid status transition")) return c.json({ error: msg }, 400);
    throw e;
  }
});

axBdEvaluationsRoute.post("/ax-bd/evaluations/:evalId/kpis", async (c) => {
  const body = await c.req.json();
  const parsed = CreateKpiSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  const svc = new EvaluationService(c.env.DB);
  const evaluation = await svc.getById(c.req.param("evalId"), c.get("orgId"));
  if (!evaluation) return c.json({ error: "Evaluation not found" }, 404);
  const kpi = await svc.createKpi(c.req.param("evalId"), parsed.data);
  return c.json(kpi, 201);
});

axBdEvaluationsRoute.get("/ax-bd/evaluations/:evalId/kpis", async (c) => {
  const svc = new EvaluationService(c.env.DB);
  const evaluation = await svc.getById(c.req.param("evalId"), c.get("orgId"));
  if (!evaluation) return c.json({ error: "Evaluation not found" }, 404);
  return c.json(await svc.listKpis(c.req.param("evalId")));
});

axBdEvaluationsRoute.patch("/ax-bd/evaluations/:evalId/kpis/:kpiId", async (c) => {
  const body = await c.req.json();
  const parsed = UpdateKpiSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  const svc = new EvaluationService(c.env.DB);
  const evaluation = await svc.getById(c.req.param("evalId"), c.get("orgId"));
  if (!evaluation) return c.json({ error: "Evaluation not found" }, 404);
  try {
    return c.json(await svc.updateKpi(c.req.param("kpiId"), c.req.param("evalId"), parsed.data));
  } catch (e) {
    if ((e as Error).message === "KPI not found") return c.json({ error: "KPI not found" }, 404);
    throw e;
  }
});

axBdEvaluationsRoute.get("/ax-bd/evaluations/:evalId/history", async (c) => {
  const svc = new EvaluationService(c.env.DB);
  return c.json(await svc.getHistory(c.req.param("evalId"), c.get("orgId")));
});
