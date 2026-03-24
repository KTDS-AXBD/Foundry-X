/**
 * Sprint 52: 5시작점 Zod 스키마 (F182)
 */

import { z } from "@hono/zod-openapi";

export const startingPointEnum = z.enum(["idea", "market", "problem", "tech", "service"]);

// --- 요청 스키마 ---
export const ClassifyStartingPointSchema = z
  .object({
    context: z.string().max(3000).optional(),
  })
  .openapi("ClassifyStartingPoint");

export const ConfirmStartingPointSchema = z
  .object({
    startingPoint: startingPointEnum.optional(),
  })
  .openapi("ConfirmStartingPoint");

// --- 응답 스키마 ---
export const StartingPointResultSchema = z
  .object({
    startingPoint: startingPointEnum,
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
    needsConfirmation: z.boolean(),
    confirmedBy: z.string().nullable(),
    confirmedAt: z.string().nullable(),
    classifiedAt: z.string(),
  })
  .openapi("StartingPointResult");

export const AnalysisStepSchema = z
  .object({
    order: z.number().int().min(1),
    activity: z.string(),
    pmSkills: z.array(z.string()),
    discoveryMapping: z.array(z.number().int().min(1).max(9)),
  })
  .openapi("AnalysisStep");

export const AnalysisPathSchema = z
  .object({
    startingPoint: startingPointEnum,
    label: z.string(),
    description: z.string(),
    steps: z.array(AnalysisStepSchema),
  })
  .openapi("AnalysisPath");
