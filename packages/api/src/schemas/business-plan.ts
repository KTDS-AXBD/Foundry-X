/**
 * Sprint 58: 사업계획서 Zod 스키마 (F180)
 */

import { z } from "@hono/zod-openapi";

export const GenerateBusinessPlanSchema = z.object({
  skipLlmRefine: z.boolean().optional().default(false),
}).openapi("GenerateBusinessPlan");

export const BusinessPlanDraftSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  version: z.number().int(),
  content: z.string(),
  sectionsSnapshot: z.string(),
  modelUsed: z.string().nullable(),
  tokensUsed: z.number(),
  generatedAt: z.string(),
}).openapi("BusinessPlanDraft");

export const BusinessPlanVersionsSchema = z.object({
  versions: z.array(z.object({
    version: z.number().int(),
    generatedAt: z.string(),
  })),
}).openapi("BusinessPlanVersions");
