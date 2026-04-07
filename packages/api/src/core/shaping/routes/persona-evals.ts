/**
 * Sprint 154: F342 PersonaEvals Route — 페르소나 평가 결과 관리
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { PersonaEvalService } from "../services/persona-eval-service.js";
import { SavePersonaEvalSchema } from "../schemas/persona-eval-schema.js";

export const personaEvalsRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// GET /ax-bd/persona-evals/:itemId — 아이템별 평가 결과 조회
personaEvalsRoute.get("/ax-bd/persona-evals/:itemId", async (c) => {
  const svc = new PersonaEvalService(c.env.DB);
  const evals = await svc.getByItem(c.req.param("itemId"));
  return c.json({ data: evals });
});

// POST /ax-bd/persona-evals/:itemId — 평가 결과 저장 (단건)
personaEvalsRoute.post("/ax-bd/persona-evals/:itemId", async (c) => {
  const body = await c.req.json();
  const parsed = SavePersonaEvalSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new PersonaEvalService(c.env.DB);
  const orgId = c.get("orgId");
  const result = await svc.save(c.req.param("itemId"), orgId, parsed.data);
  return c.json({ data: result }, 201);
});

// GET /ax-bd/persona-evals/:itemId/verdict — 종합 판정 조회
personaEvalsRoute.get("/ax-bd/persona-evals/:itemId/verdict", async (c) => {
  const svc = new PersonaEvalService(c.env.DB);
  const verdict = await svc.getOverallVerdict(c.req.param("itemId"));
  return c.json({ data: verdict });
});
