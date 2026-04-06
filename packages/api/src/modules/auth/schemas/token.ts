import { z } from "@hono/zod-openapi";

export const TokenUsageRecordSchema = z
  .object({
    model: z.string(),
    inputTokens: z.number(),
    outputTokens: z.number(),
    cost: z.number(),
    timestamp: z.string(),
    agentId: z.string().optional(),
  })
  .openapi("TokenUsage");

const ModelStatsSchema = z.object({
  tokens: z.number(),
  cost: z.number(),
});

export const TokenSummarySchema = z
  .object({
    period: z.string(),
    totalCost: z.number(),
    byModel: z.record(ModelStatsSchema),
    byAgent: z.record(ModelStatsSchema),
  })
  .openapi("TokenSummary");

// ─── Model Metrics (F143) ───

export const ModelQualityMetricSchema = z
  .object({
    model: z.string(),
    totalExecutions: z.number(),
    successCount: z.number(),
    failedCount: z.number(),
    successRate: z.number(),
    avgDurationMs: z.number(),
    totalCostUsd: z.number(),
    avgCostPerExecution: z.number(),
    tokenEfficiency: z.number(),
  })
  .openapi("ModelQualityMetric");

export const ModelQualityResponseSchema = z
  .object({
    metrics: z.array(ModelQualityMetricSchema),
    period: z.object({ from: z.string(), to: z.string() }),
  })
  .openapi("ModelQualityResponse");

export const AgentModelCellSchema = z
  .object({
    agentName: z.string(),
    model: z.string(),
    executions: z.number(),
    totalCostUsd: z.number(),
    avgDurationMs: z.number(),
    successRate: z.number(),
  })
  .openapi("AgentModelCell");

export const AgentModelMatrixResponseSchema = z
  .object({
    matrix: z.array(AgentModelCellSchema),
    period: z.object({ from: z.string(), to: z.string() }),
  })
  .openapi("AgentModelMatrixResponse");
