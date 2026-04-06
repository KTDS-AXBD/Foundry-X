import { z } from "zod";

export const QualityDashboardSummarySchema = z.object({
  totalPrototypes: z.number(),
  averageScore: z.number(),
  above80Count: z.number(),
  above80Pct: z.number(),
  totalCostSaved: z.number(),
  generationModes: z.record(z.string(), z.number()),
});

export type QualityDashboardSummary = z.infer<typeof QualityDashboardSummarySchema>;

export const DimensionAverageSchema = z.object({
  build: z.number(),
  ui: z.number(),
  functional: z.number(),
  prd: z.number(),
  code: z.number(),
});

export type DimensionAverage = z.infer<typeof DimensionAverageSchema>;

export const TrendPointSchema = z.object({
  date: z.string(),
  avgScore: z.number(),
  count: z.number(),
});

export const QualityTrendSchema = z.object({
  points: z.array(TrendPointSchema),
  period: z.string(),
});

export type QualityTrend = z.infer<typeof QualityTrendSchema>;
