/**
 * Sprint 53: 분석 컨텍스트 Zod 스키마 (F184)
 */

import { z } from "@hono/zod-openapi";

export const SaveAnalysisContextSchema = z.object({
  stepOrder: z.number().int().min(1).max(10),
  pmSkill: z.string().min(1).max(50),
  inputSummary: z.string().max(3000).optional(),
  outputText: z.string().min(1).max(30000),
}).openapi("SaveAnalysisContext");

export const AnalysisContextSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  stepOrder: z.number().int(),
  pmSkill: z.string(),
  inputSummary: z.string().nullable(),
  outputText: z.string(),
  createdAt: z.string(),
}).openapi("AnalysisContextResponse");
