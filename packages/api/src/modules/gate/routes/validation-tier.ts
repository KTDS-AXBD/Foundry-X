/**
 * Sprint 116: Validation 2-tier Routes — 본부/전사 검증 워크플로 (F294)
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { ValidationService, ValidationTierError } from "../services/validation-service.js";
import { SubmitValidationSchema, ValidationFilterSchema } from "../schemas/validation.schema.js";

export const validationTierRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// POST /validation/division/submit — 본부 검증 제출
validationTierRoute.post("/validation/division/submit", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json();
  const parsed = SubmitValidationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new ValidationService(c.env.DB);
  try {
    const result = await svc.submitDivisionReview(
      parsed.data.bizItemId, orgId, parsed.data.decision, parsed.data.comment ?? "", userId,
    );
    return c.json(result, 200);
  } catch (e) {
    if (e instanceof ValidationTierError) {
      return c.json({ error: e.message }, 400);
    }
    throw e;
  }
});

// POST /validation/company/submit — 전사 검증 제출
validationTierRoute.post("/validation/company/submit", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json();
  const parsed = SubmitValidationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new ValidationService(c.env.DB);
  try {
    const result = await svc.submitCompanyReview(
      parsed.data.bizItemId, orgId, parsed.data.decision, parsed.data.comment ?? "", userId,
    );
    return c.json(result, 200);
  } catch (e) {
    if (e instanceof ValidationTierError) {
      return c.json({ error: e.message }, 400);
    }
    throw e;
  }
});

// GET /validation/division/items — 본부 검증 대기 목록
validationTierRoute.get("/validation/division/items", async (c) => {
  const orgId = c.get("orgId");
  const query = c.req.query();
  const parsed = ValidationFilterSchema.safeParse(query);
  if (!parsed.success) {
    return c.json({ error: "Invalid filters", details: parsed.error.flatten() }, 400);
  }

  const svc = new ValidationService(c.env.DB);
  const result = await svc.getDivisionItems(orgId, parsed.data);
  return c.json(result);
});

// GET /validation/company/items — 전사 검증 대기 목록
validationTierRoute.get("/validation/company/items", async (c) => {
  const orgId = c.get("orgId");
  const query = c.req.query();
  const parsed = ValidationFilterSchema.safeParse(query);
  if (!parsed.success) {
    return c.json({ error: "Invalid filters", details: parsed.error.flatten() }, 400);
  }

  const svc = new ValidationService(c.env.DB);
  const result = await svc.getCompanyItems(orgId, parsed.data);
  return c.json(result);
});

// GET /validation/status/:bizItemId — 아이템별 검증 상태
validationTierRoute.get("/validation/status/:bizItemId", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const svc = new ValidationService(c.env.DB);
  const status = await svc.getValidationStatus(bizItemId, orgId);

  if (!status) {
    return c.json({ error: "Item not found" }, 404);
  }

  return c.json(status);
});
