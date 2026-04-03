/**
 * F278: BD ROI 벤치마크 Zod 스키마 (Sprint 107)
 */

import { z } from "zod";

const pipelineStageEnum = z.enum([
  "collection", "discovery", "shaping", "validation", "productization", "gtm",
]);

export const runBenchmarkSchema = z.object({
  coldThreshold: z.number().int().min(1).max(20).optional().default(3),
  pipelineStage: pipelineStageEnum.optional(),
  skillId: z.string().optional(),
  minExecutions: z.number().int().min(2).optional().default(4),
});
export type RunBenchmarkInput = z.infer<typeof runBenchmarkSchema>;

export const latestBenchmarkQuerySchema = z.object({
  pipelineStage: pipelineStageEnum.optional(),
  minSavings: z.coerce.number().min(-100).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
export type LatestBenchmarkQuery = z.infer<typeof latestBenchmarkQuerySchema>;

export const benchmarkHistoryQuerySchema = z.object({
  skillId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type BenchmarkHistoryQuery = z.infer<typeof benchmarkHistoryQuerySchema>;

export const byStageQuerySchema = z.object({
  metric: z.enum(["cost", "duration", "tokens", "success_rate"]).optional().default("cost"),
});
export type ByStageQuery = z.infer<typeof byStageQuerySchema>;

export const roiSummaryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
  pipelineStage: pipelineStageEnum.optional(),
});
export type RoiSummaryQuery = z.infer<typeof roiSummaryQuerySchema>;

export const updateSignalValuationsSchema = z.object({
  valuations: z.array(z.object({
    signalType: z.enum(["go", "pivot", "drop"]),
    valueUsd: z.number().min(0).max(10_000_000),
    description: z.string().max(500).optional(),
  })).min(1).max(3),
});
export type UpdateSignalValuationsInput = z.infer<typeof updateSignalValuationsSchema>;
