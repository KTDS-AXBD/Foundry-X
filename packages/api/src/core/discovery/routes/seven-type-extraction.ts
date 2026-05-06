// F630: POST /api/discovery/extract-seven-types — 인터뷰 트랜스크립트 → BeSir 7-타입 추출
import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { EntityRegistry } from "../../entity/types.js";
import { LLMService, AuditBus } from "../../infra/types.js";
import { SevenTypeExtractor } from "../services/seven-type-extractor.service.js";

const TranscriptInputSchema = z.object({
  orgId: z.string().min(1),
  transcript: z.string().min(1),
  contextRef: z.string().optional(),
});

export const sevenTypeExtractionRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

sevenTypeExtractionRoute.post("/discovery/extract-seven-types", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = TranscriptInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const entityRegistry = new EntityRegistry(c.env.DB);
  const llm = new LLMService(c.env.AI, c.env.ANTHROPIC_API_KEY);
  const auditBus = c.env.AUDIT_HMAC_KEY
    ? new AuditBus(c.env.DB, c.env.AUDIT_HMAC_KEY)
    : undefined;

  const extractor = new SevenTypeExtractor(entityRegistry, llm, auditBus);

  try {
    const result = await extractor.extractFromTranscript(parsed.data);
    return c.json(result, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    return c.json({ error: message }, 422);
  }
});
