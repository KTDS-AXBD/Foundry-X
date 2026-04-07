/**
 * F381: Design Token Routes (Sprint 173)
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { DesignTokenService } from "../services/design-token-service.js";
import { BulkUpdateTokensSchema } from "../schemas/design-token.schema.js";

export const designTokensRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

/** Verify offering exists and belongs to org */
async function verifyOffering(db: D1Database, orgId: string, offeringId: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT id FROM offerings WHERE id = ? AND org_id = ?")
    .bind(offeringId, orgId)
    .first<{ id: string }>();
  return row !== null;
}

// GET /offerings/:id/tokens — list all tokens
designTokensRoute.get("/offerings/:id/tokens", async (c) => {
  const orgId = c.get("orgId");
  const offeringId = c.req.param("id");

  if (!(await verifyOffering(c.env.DB, orgId, offeringId))) {
    return c.json({ error: "Offering not found" }, 404);
  }

  const svc = new DesignTokenService(c.env.DB);
  const tokens = await svc.list(offeringId);
  return c.json({ tokens });
});

// GET /offerings/:id/tokens/json — JSON format grouped by category
designTokensRoute.get("/offerings/:id/tokens/json", async (c) => {
  const orgId = c.get("orgId");
  const offeringId = c.req.param("id");

  if (!(await verifyOffering(c.env.DB, orgId, offeringId))) {
    return c.json({ error: "Offering not found" }, 404);
  }

  const svc = new DesignTokenService(c.env.DB);
  const json = await svc.getAsJson(offeringId);
  return c.json(json);
});

// PUT /offerings/:id/tokens — bulk upsert
designTokensRoute.put("/offerings/:id/tokens", async (c) => {
  const orgId = c.get("orgId");
  const offeringId = c.req.param("id");

  if (!(await verifyOffering(c.env.DB, orgId, offeringId))) {
    return c.json({ error: "Offering not found" }, 404);
  }

  const body = await c.req.json();
  const parsed = BulkUpdateTokensSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new DesignTokenService(c.env.DB);
  const tokens = await svc.bulkUpsert(offeringId, parsed.data.tokens);
  return c.json({ tokens });
});

// POST /offerings/:id/tokens/reset — reset to defaults
designTokensRoute.post("/offerings/:id/tokens/reset", async (c) => {
  const orgId = c.get("orgId");
  const offeringId = c.req.param("id");

  if (!(await verifyOffering(c.env.DB, orgId, offeringId))) {
    return c.json({ error: "Offering not found" }, 404);
  }

  const svc = new DesignTokenService(c.env.DB);
  const tokens = await svc.resetToDefaults(offeringId);
  return c.json({ tokens });
});
