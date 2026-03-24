import { z } from "@hono/zod-openapi";

export const PrdPersonaEvaluationResponseSchema = z.object({
  verdictId: z.string(),
  prdId: z.string(),
  bizItemId: z.string(),
  verdict: z.enum(["green", "keep", "red"]),
  avgScore: z.number(),
  totalConcerns: z.number().int(),
  scores: z.array(z.object({
    personaId: z.string(),
    personaName: z.string(),
    businessViability: z.number().int().min(1).max(10),
    strategicFit: z.number().int().min(1).max(10),
    customerValue: z.number().int().min(1).max(10),
    techMarket: z.number().int().min(1).max(10),
    execution: z.number().int().min(1).max(10),
    financialFeasibility: z.number().int().min(1).max(10),
    competitiveDiff: z.number().int().min(1).max(10),
    scalability: z.number().int().min(1).max(10),
    summary: z.string(),
    concerns: z.array(z.string()),
  })),
  warnings: z.array(z.string()),
}).openapi("PrdPersonaEvaluationResponse");
