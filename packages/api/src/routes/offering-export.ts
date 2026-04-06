/**
 * F372: Offering Export Routes (Sprint 168)
 * F380: PPTX Export 추가 (Sprint 172)
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { OfferingExportService } from "../services/offering-export-service.js";
import { ExportQuerySchema } from "../schemas/offering-export.schema.js";

export const offeringExportRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// GET /offerings/:id/export?format=html|pptx
offeringExportRoute.get("/offerings/:id/export", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const parsed = ExportQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, 400);
  }

  const svc = new OfferingExportService(c.env.DB);
  const { format } = parsed.data;

  if (format === "pptx") {
    const buffer = await svc.exportPptx(orgId, id);
    if (!buffer) return c.json({ error: "Offering not found" }, 404);

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${id}.pptx"`,
      },
    });
  }

  const html = await svc.exportHtml(orgId, id);
  if (!html) return c.json({ error: "Offering not found" }, 404);

  return c.html(html);
});
