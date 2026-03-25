/**
 * F199: BMCAgent 라우트 — BMC 초안 자동 생성 엔드포인트
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { GenerateBmcDraftSchema } from "../schemas/bmc-agent.schema.js";
import { BmcAgentService } from "../services/bmc-agent.js";

export const axBdAgentRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /ax-bd/bmc/generate — BMC 초안 자동 생성
axBdAgentRoute.post("/ax-bd/bmc/generate", async (c) => {
  // 1. Zod validation
  const body = await c.req.json();
  const parsed = GenerateBmcDraftSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  // 2. Rate Limit: KV 기반 사용자당 분당 5회
  const userId = c.get("userId");
  const kvKey = `bmc-gen:${userId}`;

  if (c.env.CACHE) {
    const existing = await c.env.CACHE.get(kvKey);
    const count = existing ? parseInt(existing, 10) : 0;
    if (count >= 5) {
      return c.json({ error: "Rate limit exceeded. Max 5 requests per minute." }, 429);
    }
    await c.env.CACHE.put(kvKey, String(count + 1), { expirationTtl: 60 });
  }

  // 3. Generate BMC draft
  const apiKey = c.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: "ANTHROPIC_API_KEY not configured" }, 500);
  }

  try {
    const service = new BmcAgentService(c.env.DB, apiKey);
    const result = await service.generateDraft(
      parsed.data.idea,
      parsed.data.context,
      c.get("orgId"),
    );
    return c.json(result, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "LLM_TIMEOUT") {
      return c.json({ error: "LLM request timed out" }, 504);
    }
    if (message === "LLM_PARSE_ERROR") {
      return c.json({ error: "Failed to parse LLM response" }, 502);
    }
    if (message === "GATEWAY_NOT_PROCESSED") {
      return c.json({ error: "Prompt gateway processing failed" }, 502);
    }
    return c.json({ error: message }, 500);
  }
});
