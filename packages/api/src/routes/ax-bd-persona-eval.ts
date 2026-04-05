/**
 * Sprint 155 F344+F345: 멀티 페르소나 평가 API 라우트
 * - POST /ax-bd/persona-eval — SSE 스트리밍 평가
 * - GET /ax-bd/persona-configs/:itemId — 설정 조회
 * - PUT /ax-bd/persona-configs/:itemId — 설정 저장
 * - GET /ax-bd/persona-evals/:itemId — 결과 조회
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { StartEvalSchema } from "../schemas/persona-eval.js";
import { UpsertPersonaConfigsSchema } from "../schemas/persona-config.js";
import { PersonaConfigService } from "../services/persona-config-service.js";
import { PersonaEvalService } from "../services/persona-eval-service.js";

export const axBdPersonaEvalRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /ax-bd/persona-eval — SSE 스트리밍 평가
axBdPersonaEvalRoute.post("/ax-bd/persona-eval", async (c) => {
  const body = await c.req.json();
  const parsed = StartEvalSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const orgId = c.get("orgId");
  const { itemId, configs, briefing, demoMode } = parsed.data;

  // 데모 모드가 아닌데 API 키가 없으면 에러
  if (!demoMode && !c.env.ANTHROPIC_API_KEY) {
    return c.json({ error: "ANTHROPIC_API_KEY not configured. Use demoMode: true for demo." }, 500);
  }

  const service = new PersonaEvalService(c.env.DB, c.env.ANTHROPIC_API_KEY);
  const stream = service.createEvalStream(itemId, orgId, configs, briefing, demoMode);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

// GET /ax-bd/persona-configs/:itemId — 설정 조회
axBdPersonaEvalRoute.get("/ax-bd/persona-configs/:itemId", async (c) => {
  const itemId = c.req.param("itemId");
  const orgId = c.get("orgId");
  const service = new PersonaConfigService(c.env.DB);
  const configs = await service.getByItemId(itemId, orgId);

  return c.json({
    items: configs.map((r) => ({
      id: r.id,
      itemId: r.item_id,
      personaId: r.persona_id,
      weights: JSON.parse(r.weights),
      context: JSON.parse(r.context_json),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  });
});

// PUT /ax-bd/persona-configs/:itemId — 설정 저장
axBdPersonaEvalRoute.put("/ax-bd/persona-configs/:itemId", async (c) => {
  const itemId = c.req.param("itemId");
  const orgId = c.get("orgId");
  const body = await c.req.json();
  const parsed = UpsertPersonaConfigsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const service = new PersonaConfigService(c.env.DB);
  await service.upsertConfigs(itemId, orgId, parsed.data.configs);
  return c.json({ success: true });
});

// GET /ax-bd/persona-evals/:itemId — 이전 평가 결과 조회
axBdPersonaEvalRoute.get("/ax-bd/persona-evals/:itemId", async (c) => {
  const itemId = c.req.param("itemId");
  const orgId = c.get("orgId");
  const service = new PersonaEvalService(c.env.DB, c.env.ANTHROPIC_API_KEY);
  const evals = await service.getByItemId(itemId, orgId);

  return c.json({
    items: evals.map((r) => ({
      id: r.id,
      itemId: r.item_id,
      personaId: r.persona_id,
      scores: JSON.parse(r.scores),
      verdict: r.verdict,
      summary: r.summary,
      concerns: r.concerns ? JSON.parse(r.concerns) : [],
      createdAt: r.created_at,
    })),
  });
});
