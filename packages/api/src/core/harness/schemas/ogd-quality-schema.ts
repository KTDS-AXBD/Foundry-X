// ─── F355: O-G-D Quality Zod 스키마 (Sprint 160) ───

import { z } from "@hono/zod-openapi";

export const OgdEvaluateRequestSchema = z
  .object({
    jobId: z.string().min(1),
    prdContent: z.string().min(10),
  })
  .openapi("OgdEvaluateRequest");

export const OgdRoundSchema = z
  .object({
    id: z.string(),
    jobId: z.string(),
    roundNumber: z.number().int(),
    qualityScore: z.number().min(0).max(1).nullable(),
    feedback: z.string().nullable(),
    inputTokens: z.number().int(),
    outputTokens: z.number().int(),
    costUsd: z.number(),
    modelUsed: z.string(),
    passed: z.boolean(),
    createdAt: z.number(),
  })
  .openapi("OgdRound");

export const OgdSummarySchema = z
  .object({
    jobId: z.string(),
    totalRounds: z.number(),
    bestScore: z.number(),
    bestRound: z.number(),
    passed: z.boolean(),
    totalCostUsd: z.number(),
    rounds: z.array(OgdRoundSchema),
  })
  .openapi("OgdSummary");
