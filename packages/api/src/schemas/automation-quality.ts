import { z } from "@hono/zod-openapi";

export const QualityReportQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(7),
  taskType: z.string().optional(),
});

export const FailurePatternsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(30),
});

export const SuggestionsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(30),
});
