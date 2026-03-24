/**
 * Sprint 53: PRD Zod 스키마 (F185)
 */

import { z } from "@hono/zod-openapi";

export const GeneratePrdSchema = z.object({
  skipLlmRefine: z.boolean().optional().default(false),
}).openapi("GeneratePrd");

export const GeneratedPrdSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  version: z.number().int(),
  content: z.string(),
  criteriaSnapshot: z.string(),
  generatedAt: z.string(),
}).openapi("GeneratedPrdResponse");
