/**
 * Sprint 154: F342 PersonaConfigs Route — 페르소나 설정 CRUD
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { PersonaConfigService } from "../services/persona-config-service.js";
import { UpsertPersonaConfigSchema, UpdateWeightsSchema } from "../schemas/persona-config-schema.js";

export const personaConfigsRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// GET /ax-bd/persona-configs/:itemId — 아이템별 페르소나 설정 조회
personaConfigsRoute.get("/ax-bd/persona-configs/:itemId", async (c) => {
  const svc = new PersonaConfigService(c.env.DB);
  const configs = await svc.getByItem(c.req.param("itemId"));
  return c.json({ data: configs });
});

// POST /ax-bd/persona-configs/:itemId/init — 기본 8인 시딩
personaConfigsRoute.post("/ax-bd/persona-configs/:itemId/init", async (c) => {
  const svc = new PersonaConfigService(c.env.DB);
  const orgId = c.get("orgId");
  const count = await svc.initDefaults(c.req.param("itemId"), orgId);
  return c.json({ message: `${count} personas initialized`, count }, 201);
});

// PUT /ax-bd/persona-configs/:itemId/:personaId — 개별 설정 수정
personaConfigsRoute.put("/ax-bd/persona-configs/:itemId/:personaId", async (c) => {
  const body = await c.req.json();
  const parsed = UpsertPersonaConfigSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new PersonaConfigService(c.env.DB);
  const orgId = c.get("orgId");
  const config = await svc.upsert(c.req.param("itemId"), orgId, {
    ...parsed.data,
    personaId: c.req.param("personaId"),
  });
  return c.json({ data: config });
});

// PATCH /ax-bd/persona-configs/:itemId/:personaId/weights — 가중치만 수정
personaConfigsRoute.patch("/ax-bd/persona-configs/:itemId/:personaId/weights", async (c) => {
  const body = await c.req.json();
  const parsed = UpdateWeightsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new PersonaConfigService(c.env.DB);
  await svc.updateWeights(c.req.param("itemId"), c.req.param("personaId"), parsed.data.weights);
  return c.json({ message: "Weights updated" });
});
