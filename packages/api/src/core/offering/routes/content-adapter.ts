/**
 * F378: Content Adapter Routes (Sprint 171)
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { ContentAdapterService } from "../services/content-adapter-service.js";
import {
  AdaptRequestSchema,
  AdaptPreviewQuerySchema,
} from "../schemas/content-adapter.schema.js";

export const contentAdapterRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// POST /offerings/:id/adapt — 톤 변환 적용 (DB 반영)
contentAdapterRoute.post("/offerings/:id/adapt", async (c) => {
  const orgId = c.get("orgId");
  const offeringId = c.req.param("id");

  const body = await c.req.json();
  const parsed = AdaptRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  try {
    const svc = new ContentAdapterService(c.env.DB);
    const adaptedSections = await svc.adaptSections(
      orgId,
      offeringId,
      parsed.data.tone,
      parsed.data.sectionKeys,
    );

    return c.json({
      adaptedSections,
      tone: parsed.data.tone,
      offeringId,
      sectionCount: adaptedSections.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Offering not found") {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 500);
  }
});

// GET /offerings/:id/adapt/preview — 톤 변환 프리뷰 (DB 미반영)
contentAdapterRoute.get("/offerings/:id/adapt/preview", async (c) => {
  const orgId = c.get("orgId");
  const offeringId = c.req.param("id");

  const parsed = AdaptPreviewQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  try {
    const svc = new ContentAdapterService(c.env.DB);
    const adaptedSections = await svc.previewAdapt(orgId, offeringId, parsed.data.tone);

    return c.json({
      adaptedSections,
      tone: parsed.data.tone,
      offeringId,
      sectionCount: adaptedSections.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Offering not found") {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 500);
  }
});
