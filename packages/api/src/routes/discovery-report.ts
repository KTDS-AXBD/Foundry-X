/**
 * Sprint 156: F346 — 발굴 완료 리포트 라우트
 * GET /ax-bd/discovery-report/:itemId
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { DiscoveryReportService } from "../services/discovery-report-service.js";
import { DiscoveryReportParamsSchema } from "../schemas/discovery-report.js";

export const discoveryReportRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// ─── GET /ax-bd/discovery-report/:itemId ───
discoveryReportRoute.get(
  "/ax-bd/discovery-report/:itemId",
  async (c) => {
    const parsed = DiscoveryReportParamsSchema.safeParse({
      itemId: c.req.param("itemId"),
    });
    if (!parsed.success) {
      return c.json(
        { error: "Invalid params", details: parsed.error.flatten() },
        400,
      );
    }

    const orgId = c.get("orgId");
    const svc = new DiscoveryReportService(c.env.DB);
    const report = await svc.getReport(parsed.data.itemId, orgId);

    if (!report) {
      return c.json({ error: "BizItem not found" }, 404);
    }

    return c.json(report);
  },
);
