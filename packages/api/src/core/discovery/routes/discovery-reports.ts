/**
 * Sprint 154: F342 DiscoveryReports Route — 발굴 완료 리포트 관리
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { DiscoveryReportService } from "../services/discovery-report-service.js";
import { UpsertDiscoveryReportSchema } from "../schemas/discovery-report-schema.js";

export const discoveryReportsRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// GET /ax-bd/discovery-reports/:itemId — 리포트 조회
discoveryReportsRoute.get("/ax-bd/discovery-reports/:itemId", async (c) => {
  const svc = new DiscoveryReportService(c.env.DB);
  const report = await svc.getByItem(c.req.param("itemId"));
  if (!report) {
    return c.json({ error: "Report not found" }, 404);
  }
  return c.json({ data: report });
});

// PUT /ax-bd/discovery-reports/:itemId — 리포트 생성/갱신
discoveryReportsRoute.put("/ax-bd/discovery-reports/:itemId", async (c) => {
  const body = await c.req.json();
  const parsed = UpsertDiscoveryReportSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new DiscoveryReportService(c.env.DB);
  const orgId = c.get("orgId");
  const report = await svc.upsert(c.req.param("itemId"), orgId, parsed.data);
  return c.json({ data: report });
});

// POST /ax-bd/discovery-reports/:itemId/share — 공유 토큰 생성
discoveryReportsRoute.post("/ax-bd/discovery-reports/:itemId/share", async (c) => {
  const svc = new DiscoveryReportService(c.env.DB);
  const report = await svc.getByItem(c.req.param("itemId"));
  if (!report) {
    return c.json({ error: "Report not found" }, 404);
  }

  const token = await svc.generateShareToken(c.req.param("itemId"));
  return c.json({ data: { sharedToken: token } }, 201);
});
