import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { desc } from "drizzle-orm";
import {
  TokenSummarySchema,
  TokenUsageRecordSchema,
  ModelQualityResponseSchema,
  AgentModelMatrixResponseSchema,
} from "../schemas/token.js";
import { ModelMetricsService } from "../../../core/agent/services/model-metrics.js";
import type { TokenUsage, TokenSummary } from "@foundry-x/shared";
import { getDb } from "../../../db/index.js";
import { tokenUsage } from "../../../db/schema.js";
import type { Env } from "../../../env.js";

export const tokenRoute = new OpenAPIHono<{ Bindings: Env }>();

// ─── Mock Data (fallback when DB is empty) ───

const MOCK_USAGE: TokenUsage[] = [
  { model: "claude-opus-4", inputTokens: 8200, outputTokens: 3100, cost: 4.80, timestamp: "2026-03-17T10:00:00Z", agentId: "agent-code-review" },
  { model: "claude-opus-4", inputTokens: 6500, outputTokens: 2800, cost: 3.70, timestamp: "2026-03-17T09:30:00Z", agentId: "agent-test-writer" },
  { model: "claude-sonnet-4", inputTokens: 4000, outputTokens: 1500, cost: 2.10, timestamp: "2026-03-17T09:00:00Z", agentId: "agent-code-review" },
  { model: "claude-sonnet-4", inputTokens: 3200, outputTokens: 1200, cost: 1.90, timestamp: "2026-03-17T08:30:00Z", agentId: "agent-test-writer" },
];

const MOCK_SUMMARY: TokenSummary = {
  period: "2026-03",
  totalCost: 12.50,
  byModel: {
    "claude-opus-4": { tokens: 20600, cost: 8.50 },
    "claude-sonnet-4": { tokens: 9900, cost: 4.00 },
  },
  byAgent: {
    "agent-code-review": { tokens: 16800, cost: 6.90 },
    "agent-test-writer": { tokens: 13700, cost: 5.60 },
  },
};

// ─── Helpers ───

function summarizeRecords(
  records: { model: string; inputTokens: number; outputTokens: number; costUsd: number; agentName: string }[],
  period: string,
): TokenSummary {
  const byModel: Record<string, { tokens: number; cost: number }> = {};
  const byAgent: Record<string, { tokens: number; cost: number }> = {};
  let totalCost = 0;

  for (const r of records) {
    totalCost += r.costUsd;
    const tokens = r.inputTokens + r.outputTokens;

    const m = byModel[r.model] ?? { tokens: 0, cost: 0 };
    m.tokens += tokens;
    m.cost += r.costUsd;
    byModel[r.model] = m;

    const a = byAgent[r.agentName] ?? { tokens: 0, cost: 0 };
    a.tokens += tokens;
    a.cost += r.costUsd;
    byAgent[r.agentName] = a;
  }

  return { period, totalCost: Math.round(totalCost * 100) / 100, byModel, byAgent };
}

// ─── Routes ───

const getTokenSummary = createRoute({
  method: "get",
  path: "/tokens/summary",
  tags: ["Tokens"],
  summary: "Token usage summary",
  responses: {
    200: {
      content: { "application/json": { schema: TokenSummarySchema } },
      description: "Aggregated token usage by model and agent",
    },
  },
});

tokenRoute.openapi(getTokenSummary, async (c) => {
  let records: (typeof tokenUsage.$inferSelect)[] = [];
  try {
    if (c.env?.DB) {
      const db = getDb(c.env.DB);
      records = await db.select().from(tokenUsage);
    }
  } catch {
    // D1 not available — fall through to mock
  }

  if (records.length === 0) {
    return c.json(MOCK_SUMMARY);
  }

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return c.json(summarizeRecords(records, period));
});

const getTokenUsage = createRoute({
  method: "get",
  path: "/tokens/usage",
  tags: ["Tokens"],
  summary: "Recent token usage records",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TokenUsageRecordSchema) } },
      description: "Last 20 token usage records",
    },
  },
});

tokenRoute.openapi(getTokenUsage, async (c) => {
  let records: (typeof tokenUsage.$inferSelect)[] = [];
  try {
    if (c.env?.DB) {
      const db = getDb(c.env.DB);
      records = await db
        .select()
        .from(tokenUsage)
        .orderBy(desc(tokenUsage.recordedAt))
        .limit(20);
    }
  } catch {
    // D1 not available — fall through to mock
  }

  if (records.length === 0) {
    return c.json(MOCK_USAGE);
  }

  return c.json(
    records.map((r) => ({
      model: r.model,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      cost: r.costUsd,
      timestamp: r.recordedAt,
      agentId: r.agentName,
    })),
  );
});

// ─── Model Metrics (F143) ───

const getModelQuality = createRoute({
  method: "get",
  path: "/tokens/model-quality",
  tags: ["Tokens"],
  summary: "Model quality metrics",
  request: {
    query: z.object({
      projectId: z.string().optional(),
      days: z.coerce.number().min(1).max(365).optional(),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ModelQualityResponseSchema } },
      description: "Quality metrics grouped by model",
    },
  },
});

tokenRoute.openapi(getModelQuality, async (c) => {
  const { projectId, days } = c.req.valid("query");
  const d = days ?? 30;
  const cutoff = new Date(Date.now() - d * 86400_000).toISOString();
  const now = new Date().toISOString();
  let metrics: Awaited<ReturnType<ModelMetricsService["getModelQuality"]>> = [];
  try {
    if (c.env?.DB) {
      const service = new ModelMetricsService(c.env.DB);
      metrics = await service.getModelQuality({ projectId, days: d });
    }
  } catch {
    // D1 not available — return empty
  }
  return c.json({ metrics, period: { from: cutoff, to: now } });
});

const getAgentModelMatrix = createRoute({
  method: "get",
  path: "/tokens/agent-model-matrix",
  tags: ["Tokens"],
  summary: "Agent-model cross matrix",
  request: {
    query: z.object({
      projectId: z.string().optional(),
      days: z.coerce.number().min(1).max(365).optional(),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: AgentModelMatrixResponseSchema } },
      description: "Execution matrix grouped by agent and model",
    },
  },
});

tokenRoute.openapi(getAgentModelMatrix, async (c) => {
  const { projectId, days } = c.req.valid("query");
  const d = days ?? 30;
  const cutoff = new Date(Date.now() - d * 86400_000).toISOString();
  const now = new Date().toISOString();
  let matrix: Awaited<ReturnType<ModelMetricsService["getAgentModelMatrix"]>> = [];
  try {
    if (c.env?.DB) {
      const service = new ModelMetricsService(c.env.DB);
      matrix = await service.getAgentModelMatrix({ projectId, days: d });
    }
  } catch {
    // D1 not available — return empty
  }
  return c.json({ matrix, period: { from: cutoff, to: now } });
});
