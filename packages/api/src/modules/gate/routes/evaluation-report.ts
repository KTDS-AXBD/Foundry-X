import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { EvaluationReportService } from "../services/evaluation-report-service.js";
import {
  GenerateReportSchema,
  ReportListQuerySchema,
} from "../schemas/evaluation-report.schema.js";

export const evaluationReportRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /ax-bd/evaluation-reports/generate — 결과서 생성
evaluationReportRoute.post("/ax-bd/evaluation-reports/generate", async (c) => {
  const body = await c.req.json();
  const parsed = GenerateReportSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new EvaluationReportService(c.env.DB);
  const report = await svc.generate(c.get("orgId"), c.get("userId"), parsed.data);
  return c.json(report, 201);
});

// GET /ax-bd/evaluation-reports — 결과서 목록
evaluationReportRoute.get("/ax-bd/evaluation-reports", async (c) => {
  const parsed = ReportListQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const svc = new EvaluationReportService(c.env.DB);
  const result = await svc.list(c.get("orgId"), parsed.data);
  return c.json(result);
});

// GET /ax-bd/evaluation-reports/:id — 결과서 상세
evaluationReportRoute.get("/ax-bd/evaluation-reports/:id", async (c) => {
  const svc = new EvaluationReportService(c.env.DB);
  const report = await svc.getById(c.get("orgId"), c.req.param("id"));
  if (!report) {
    return c.json({ error: "Evaluation report not found" }, 404);
  }
  return c.json(report);
});
