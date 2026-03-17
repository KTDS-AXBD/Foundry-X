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
