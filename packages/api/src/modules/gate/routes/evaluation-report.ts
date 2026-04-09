import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { EvaluationReportService } from "../services/evaluation-report-service.js";
import {
  DiscoveryReportDataSchema,
  GenerateReportSchema,
  ReportListQuerySchema,
} from "../schemas/evaluation-report.schema.js";

// F493: fixture JSON을 정적 import (Cloudflare Workers에서 fs 불가)
import koamiFixture from "../../../fixtures/discovery-reports/bi-koami-001.json" with { type: "json" };
import xrStudioFixture from "../../../fixtures/discovery-reports/bi-xr-studio-001.json" with { type: "json" };
import irisFixture from "../../../fixtures/discovery-reports/bi-iris-001.json" with { type: "json" };

const FIXTURE_MAP: Record<string, unknown> = {
  "bi-koami-001": koamiFixture,
  "bi-xr-studio-001": xrStudioFixture,
  "bi-iris-001": irisFixture,
};

export const evaluationReportRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /ax-bd/evaluation-reports/seed-fixtures — v2 fixture 시드 (멱등)
evaluationReportRoute.post("/ax-bd/evaluation-reports/seed-fixtures", async (c) => {
  const svc = new EvaluationReportService(c.env.DB);
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  const results = [];
  const errors: Array<{ bizItemId: string; error: string }> = [];

  for (const [bizItemId, rawFixture] of Object.entries(FIXTURE_MAP)) {
    const parsed = DiscoveryReportDataSchema.safeParse(rawFixture);
    if (!parsed.success) {
      errors.push({ bizItemId, error: parsed.error.message });
      continue;
    }
    try {
      const report = await svc.generateFromFixture(orgId, userId, bizItemId, parsed.data);
      results.push({ id: report.id, bizItemId, title: report.title });
    } catch (e) {
      errors.push({ bizItemId, error: (e as Error).message });
    }
  }

  return c.json({ seeded: results.length, results, errors }, errors.length > 0 ? 207 : 201);
});

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
