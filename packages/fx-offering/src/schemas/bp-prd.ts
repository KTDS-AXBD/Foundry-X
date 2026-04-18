/**
 * Sprint 220 F454: 사업기획서 기반 PRD 생성 Zod 스키마
 */

import { z } from "@hono/zod-openapi";

export const GeneratePrdFromBpSchema = z.object({
  bpDraftId: z.string().optional(),
  skipLlmRefine: z.boolean().optional().default(false),
}).openapi("GeneratePrdFromBp");

export const GeneratedPrdFromBpSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  version: z.number().int(),
  content: z.string(),
  sourceType: z.literal("business_plan"),
  bpDraftId: z.string(),
  generatedAt: z.string(),
}).openapi("GeneratedPrdFromBpResponse");
