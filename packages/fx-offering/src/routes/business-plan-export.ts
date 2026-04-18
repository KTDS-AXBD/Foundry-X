/**
 * F446: 사업기획서 Export Routes (Sprint 216)
 * GET /biz-items/:id/business-plan/export?format=html|pptx
 */
import { Hono } from "hono";
import type { OfferingEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { BusinessPlanExportService } from "../services/business-plan-export-service.js";
import { BpExportQuerySchema } from "../schemas/business-plan-export.schema.js";

export const businessPlanExportRoute = new Hono<{ Bindings: OfferingEnv; Variables: TenantVariables }>();

// GET /biz-items/:id/business-plan/export?format=html|pptx
businessPlanExportRoute.get("/biz-items/:id/business-plan/export", async (c) => {
  const id = c.req.param("id");

  const parsed = BpExportQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, 400);
  }

  const svc = new BusinessPlanExportService(c.env.DB, c.env.FILES_BUCKET);
  const { format } = parsed.data;

  if (format === "pptx") {
    const buffer = await svc.exportPptx(id);
    if (!buffer) return c.json({ error: "Business plan draft not found" }, 404);

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="business-plan-${id}.pptx"`,
      },
    });
  }

  const html = await svc.exportHtml(id);
  if (!html) return c.json({ error: "Business plan draft not found" }, 404);

  return c.html(html);
});
