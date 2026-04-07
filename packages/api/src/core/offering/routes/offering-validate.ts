/**
 * F373: Offering Validate Routes (Sprint 168)
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { OfferingValidateService, OfferingNotFoundError } from "../services/offering-validate-service.js";
import { ValidateOfferingSchema } from "../schemas/offering-validate.schema.js";
import { OgdDomainRegistry } from "../../harness/services/ogd-domain-registry.js";

export const offeringValidateRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// POST /offerings/:id/validate
offeringValidateRoute.post("/offerings/:id/validate", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json().catch(() => ({}));
  const parsed = ValidateOfferingSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new OfferingValidateService(c.env.DB);
  const registry = new OgdDomainRegistry();
  // O-G-D 어댑터는 AI 바인딩이 필요 — 없으면 간이 검증 모드
  // 실제 환경에서는 app.ts에서 어댑터 등록, 테스트에서는 미등록으로 간이 모드

  try {
    const result = await svc.startValidation(orgId, id, userId, parsed.data.mode, registry);
    return c.json(result, 201);
  } catch (e) {
    if (e instanceof OfferingNotFoundError) {
      return c.json({ error: "Offering not found" }, 404);
    }
    throw e;
  }
});

// GET /offerings/:id/validations
offeringValidateRoute.get("/offerings/:id/validations", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const svc = new OfferingValidateService(c.env.DB);
  const validations = await svc.listValidations(orgId, id);
  return c.json({ validations, total: validations.length });
});
