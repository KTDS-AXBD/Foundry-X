// ─── F354: Prototype Usage & Cost Zod 스키마 (Sprint 159) ───

import { z } from "@hono/zod-openapi";

export const ModelCostBreakdownSchema = z.object({
  model: z.string(),
  jobs: z.number(),
  costUsd: z.number(),
}).openapi("ModelCostBreakdown");

export const BuilderCostBreakdownSchema = z.object({
  builderType: z.string(),
  jobs: z.number(),
  costUsd: z.number(),
}).openapi("BuilderCostBreakdown");

export const UsageSummarySchema = z.object({
  totalJobs: z.number(),
  totalCostUsd: z.number(),
  totalInputTokens: z.number(),
  totalOutputTokens: z.number(),
  byModel: z.array(ModelCostBreakdownSchema),
  byBuilderType: z.array(BuilderCostBreakdownSchema),
}).openapi("UsageSummary");

export const BudgetStatusSchema = z.object({
  currentUsd: z.number(),
  limitUsd: z.number(),
  remainingUsd: z.number(),
  usagePercent: z.number(),
  withinBudget: z.boolean(),
}).openapi("BudgetStatus");

export const DailyUsageSchema = z.object({
  date: z.string(),
  jobs: z.number(),
  costUsd: z.number(),
}).openapi("DailyUsage");

export const DailyUsageListSchema = z.object({
  items: z.array(DailyUsageSchema),
}).openapi("DailyUsageList");
