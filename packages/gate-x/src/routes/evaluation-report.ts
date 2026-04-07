import { Hono } from "hono";
import type { GateEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { EvaluationReportService } from "../services/evaluation-report-service.js";
import { GenerateReportSchema, ReportListQuerySchema } from "../schemas/evaluation-report.schema.js";

export const evaluationReportRoute = new Hono<{ Bindings: GateEnv; Variables: TenantVariables }>();

evaluationReportRoute.post("/ax-bd/evaluation-reports/generate", async (c) => {
  const body = await c.req.json();
  const parsed = GenerateReportSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  const report = await new EvaluationReportService(c.env.DB).generate(c.get("orgId"), c.get("userId"), parsed.data);
  return c.json(report, 201);
});

evaluationReportRoute.get("/ax-bd/evaluation-reports", async (c) => {
  const parsed = ReportListQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  return c.json(await new EvaluationReportService(c.env.DB).list(c.get("orgId"), parsed.data));
});

evaluationReportRoute.get("/ax-bd/evaluation-reports/:id", async (c) => {
  const report = await new EvaluationReportService(c.env.DB).getById(c.get("orgId"), c.req.param("id"));
  if (!report) return c.json({ error: "Evaluation report not found" }, 404);
  return c.json(report);
});
