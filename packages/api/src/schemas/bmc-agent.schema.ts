import { z } from "@hono/zod-openapi";

export const GenerateBmcDraftSchema = z.object({
  idea: z.string().min(1).max(500),
  context: z.string().max(1000).optional(),
}).openapi("GenerateBmcDraft");

export const BmcDraftResultSchema = z.object({
  draft: z.record(z.string(), z.string()),
  processingTimeMs: z.number(),
  model: z.string(),
  masked: z.boolean(),
}).openapi("BmcDraftResult");
