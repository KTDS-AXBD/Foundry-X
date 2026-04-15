/**
 * Sprint 155 F345: 페르소나 평가 Zod 스키마
 */
import { z } from "@hono/zod-openapi";
import { PersonaConfigSchema } from "./persona-config.js";

export const ScoresSchema = z.object({
  businessViability: z.number().min(0).max(10),
  strategicFit: z.number().min(0).max(10),
  customerValue: z.number().min(0).max(10),
  techMarket: z.number().min(0).max(10),
  execution: z.number().min(0).max(10),
  financialFeasibility: z.number().min(0).max(10),
  competitiveDiff: z.number().min(0).max(10),
  scalability: z.number().min(0).max(10),
});

export const VerdictEnum = z.enum(["green", "keep", "red", "pending"]);

export const StartEvalSchema = z.object({
  itemId: z.string().min(1),
  configs: z.array(PersonaConfigSchema).min(1).max(8),
  briefing: z.string().default(""),
  demoMode: z.boolean().default(false),
});

export const PersonaEvalResultSchema = z.object({
  personaId: z.string(),
  scores: ScoresSchema,
  verdict: VerdictEnum,
  summary: z.string().nullable(),
  concerns: z.array(z.string()),
  index: z.number(),
});

export const FinalResultSchema = z.object({
  verdict: VerdictEnum,
  avgScore: z.number(),
  totalConcerns: z.number(),
  scores: z.array(PersonaEvalResultSchema),
  warnings: z.array(z.string()),
});

export type Scores = z.infer<typeof ScoresSchema>;
export type Verdict = z.infer<typeof VerdictEnum>;
export type StartEvalInput = z.infer<typeof StartEvalSchema>;
export type PersonaEvalResult = z.infer<typeof PersonaEvalResultSchema>;
export type FinalResult = z.infer<typeof FinalResultSchema>;
