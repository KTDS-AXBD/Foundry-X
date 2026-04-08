import { z } from "zod";

export const GENERATION_MODES = ["max-cli", "cli", "api", "fallback", "ogd"] as const;  // F467: ogd 추가

export const InsertQualitySchema = z.object({
  jobId: z.string().min(1),
  round: z.number().int().min(0),
  totalScore: z.number().min(0).max(100),
  buildScore: z.number().min(0).max(1),
  uiScore: z.number().min(0).max(1),
  functionalScore: z.number().min(0).max(1),
  prdScore: z.number().min(0).max(1),
  codeScore: z.number().min(0).max(1),
  generationMode: z.enum(GENERATION_MODES).default("api"),
  costUsd: z.number().min(0).default(0),
  feedback: z.string().nullable().optional(),
  details: z.string().nullable().optional(),
});

export type InsertQualityInput = z.infer<typeof InsertQualitySchema>;

export const QualityStatsSchema = z.object({
  totalPrototypes: z.number(),
  averageScore: z.number(),
  above80Count: z.number(),
  totalCostSaved: z.number(),
  generationModes: z.record(z.string(), z.number()),
});
