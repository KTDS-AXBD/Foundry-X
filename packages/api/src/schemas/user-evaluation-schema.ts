import { z } from "zod";

export const EVALUATOR_ROLES = ["bd_team", "customer", "executive"] as const;

export const CreateUserEvaluationSchema = z.object({
  jobId: z.string().min(1),
  evaluatorRole: z.enum(EVALUATOR_ROLES).default("bd_team"),
  buildScore: z.number().int().min(1).max(5),
  uiScore: z.number().int().min(1).max(5),
  functionalScore: z.number().int().min(1).max(5),
  prdScore: z.number().int().min(1).max(5),
  codeScore: z.number().int().min(1).max(5),
  overallScore: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export type CreateUserEvaluationInput = z.infer<typeof CreateUserEvaluationSchema>;

export const CorrelationResultSchema = z.object({
  dimension: z.string(),
  pearson: z.number(),
  sampleSize: z.number(),
  autoMean: z.number(),
  manualMean: z.number(),
});

export type CorrelationResult = z.infer<typeof CorrelationResultSchema>;

export const CorrelationSummarySchema = z.object({
  correlations: z.array(CorrelationResultSchema),
  overallPearson: z.number(),
  totalEvaluations: z.number(),
  calibrationStatus: z.enum(["good", "needs_attention", "insufficient_data"]),
});

export type CorrelationSummary = z.infer<typeof CorrelationSummarySchema>;
