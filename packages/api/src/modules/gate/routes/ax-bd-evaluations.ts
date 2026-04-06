import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { EvaluationService } from "../services/evaluation-service.js";
import { KpiService } from "../../portal/services/kpi-service.js";
import {
  CreateEvaluationSchema,
  UpdateEvalStatusSchema,
  CreateKpiSchema,
  UpdateKpiSchema,
} from "../schemas/evaluation.schema.js";

export const axBdEvaluationsRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /ax-bd/evaluations — 평가 생성
axBdEvaluationsRoute.post("/ax-bd/evaluations", async (c) => {
  const body = await c.req.json();
  const parsed = CreateEvaluationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new EvaluationService(c.env.DB);
  const evaluation = await svc.create(c.get("orgId"), c.get("userId"), parsed.data);
  return c.json(evaluation, 201);
});

// GET /ax-bd/evaluations — 평가 목록
axBdEvaluationsRoute.get("/ax-bd/evaluations", async (c) => {
  const { status, limit, offset } = c.req.query();
  const svc = new EvaluationService(c.env.DB);
  const result = await svc.list(c.get("orgId"), {
    status: status || undefined,
    limit: Number(limit) || 20,
    offset: Number(offset) || 0,
  });
  return c.json(result);
});

// GET /ax-bd/evaluations/portfolio — 포트폴리오 요약 (MUST be before /:evalId)
axBdEvaluationsRoute.get("/ax-bd/evaluations/portfolio", async (c) => {
  const svc = new EvaluationService(c.env.DB);
  const portfolio = await svc.getPortfolio(c.get("orgId"));
  return c.json(portfolio);
});

// GET /ax-bd/evaluations/:evalId — 평가 상세
axBdEvaluationsRoute.get("/ax-bd/evaluations/:evalId", async (c) => {
  const svc = new EvaluationService(c.env.DB);
  const evaluation = await svc.getById(c.req.param("evalId"), c.get("orgId"));
  if (!evaluation) {
    return c.json({ error: "Evaluation not found" }, 404);
  }
  return c.json(evaluation);
});

// PATCH /ax-bd/evaluations/:evalId — 상태 변경
axBdEvaluationsRoute.patch("/ax-bd/evaluations/:evalId", async (c) => {
  const body = await c.req.json();
  const parsed = UpdateEvalStatusSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new EvaluationService(c.env.DB);
  try {
    const evaluation = await svc.updateStatus(
      c.req.param("evalId"),
      c.get("orgId"),
      c.get("userId"),
      parsed.data.status,
      parsed.data.reason,
    );
    return c.json(evaluation);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Evaluation not found") return c.json({ error: msg }, 404);
    if (msg.startsWith("Invalid status transition")) return c.json({ error: msg }, 400);
    throw e;
  }
});

// POST /ax-bd/evaluations/:evalId/kpis — KPI 생성
axBdEvaluationsRoute.post("/ax-bd/evaluations/:evalId/kpis", async (c) => {
  const body = await c.req.json();
  const parsed = CreateKpiSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  // Verify evaluation exists
  const evalSvc = new EvaluationService(c.env.DB);
  const evaluation = await evalSvc.getById(c.req.param("evalId"), c.get("orgId"));
  if (!evaluation) {
    return c.json({ error: "Evaluation not found" }, 404);
  }

  const kpiSvc = new KpiService(c.env.DB);
  const kpi = await kpiSvc.create(c.req.param("evalId"), parsed.data);
  return c.json(kpi, 201);
});

// GET /ax-bd/evaluations/:evalId/kpis — KPI 목록
axBdEvaluationsRoute.get("/ax-bd/evaluations/:evalId/kpis", async (c) => {
  const evalSvc = new EvaluationService(c.env.DB);
  const evaluation = await evalSvc.getById(c.req.param("evalId"), c.get("orgId"));
  if (!evaluation) {
    return c.json({ error: "Evaluation not found" }, 404);
  }

  const kpiSvc = new KpiService(c.env.DB);
  const kpis = await kpiSvc.listByEval(c.req.param("evalId"));
  return c.json(kpis);
});

// PATCH /ax-bd/evaluations/:evalId/kpis/:kpiId — KPI 수정
axBdEvaluationsRoute.patch("/ax-bd/evaluations/:evalId/kpis/:kpiId", async (c) => {
  const body = await c.req.json();
  const parsed = UpdateKpiSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const evalSvc = new EvaluationService(c.env.DB);
  const evaluation = await evalSvc.getById(c.req.param("evalId"), c.get("orgId"));
  if (!evaluation) {
    return c.json({ error: "Evaluation not found" }, 404);
  }

  const kpiSvc = new KpiService(c.env.DB);
  try {
    const kpi = await kpiSvc.update(c.req.param("kpiId"), c.req.param("evalId"), parsed.data);
    return c.json(kpi);
  } catch (e) {
    if ((e as Error).message === "KPI not found") {
      return c.json({ error: "KPI not found" }, 404);
    }
    throw e;
  }
});

// GET /ax-bd/evaluations/:evalId/history — 이력 조회
axBdEvaluationsRoute.get("/ax-bd/evaluations/:evalId/history", async (c) => {
  const svc = new EvaluationService(c.env.DB);
  const history = await svc.getHistory(c.req.param("evalId"), c.get("orgId"));
  return c.json(history);
});
