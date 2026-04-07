import { Hono } from "hono";
import type { GateEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { ValidationService, ValidationTierError } from "../services/validation-service.js";
import { SubmitValidationSchema, ValidationFilterSchema } from "../schemas/validation.schema.js";

export const validationTierRoute = new Hono<{ Bindings: GateEnv; Variables: TenantVariables }>();

validationTierRoute.post("/validation/division/submit", async (c) => {
  const body = await c.req.json();
  const parsed = SubmitValidationSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  try {
    return c.json(await new ValidationService(c.env.DB).submitDivisionReview(parsed.data.bizItemId, c.get("orgId"), parsed.data.decision, parsed.data.comment ?? "", c.get("userId")));
  } catch (e) {
    if (e instanceof ValidationTierError) return c.json({ error: e.message }, 400);
    throw e;
  }
});

validationTierRoute.post("/validation/company/submit", async (c) => {
  const body = await c.req.json();
  const parsed = SubmitValidationSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  try {
    return c.json(await new ValidationService(c.env.DB).submitCompanyReview(parsed.data.bizItemId, c.get("orgId"), parsed.data.decision, parsed.data.comment ?? "", c.get("userId")));
  } catch (e) {
    if (e instanceof ValidationTierError) return c.json({ error: e.message }, 400);
    throw e;
  }
});

validationTierRoute.get("/validation/division/items", async (c) => {
  const parsed = ValidationFilterSchema.safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: "Invalid filters", details: parsed.error.flatten() }, 400);
  return c.json(await new ValidationService(c.env.DB).getDivisionItems(c.get("orgId"), parsed.data));
});

validationTierRoute.get("/validation/company/items", async (c) => {
  const parsed = ValidationFilterSchema.safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: "Invalid filters", details: parsed.error.flatten() }, 400);
  return c.json(await new ValidationService(c.env.DB).getCompanyItems(c.get("orgId"), parsed.data));
});

validationTierRoute.get("/validation/status/:bizItemId", async (c) => {
  const status = await new ValidationService(c.env.DB).getValidationStatus(c.req.param("bizItemId"), c.get("orgId"));
  if (!status) return c.json({ error: "Item not found" }, 404);
  return c.json(status);
});
