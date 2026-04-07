/**
 * Sprint 58: 사업계획서 Zod 스키마 (F180)
 * Sprint 215: F444 편집기 + F445 템플릿 스키마 추가
 */

import { z } from "@hono/zod-openapi";

export const TemplateTypeEnum = z.enum(['internal', 'proposal', 'ir-pitch']);
export const ToneEnum = z.enum(['formal', 'casual']);
export const LengthEnum = z.enum(['short', 'medium', 'long']);

export const GenerateBusinessPlanSchema = z.object({
  skipLlmRefine: z.boolean().optional().default(false),
  templateType: TemplateTypeEnum.optional().default('internal'),
  tone: ToneEnum.optional().default('formal'),
  length: LengthEnum.optional().default('medium'),
}).openapi("GenerateBusinessPlan");

export const UpdateSectionSchema = z.object({
  content: z.string().min(1).max(10000),
}).openapi("UpdateSection");

export const RegenerateSectionSchema = z.object({
  customPrompt: z.string().max(500).optional(),
}).openapi("RegenerateSection");

export const SaveDraftSchema = z.object({
  note: z.string().max(200).optional(),
}).openapi("SaveDraft");

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
