/**
 * F201+F202: BMC Block Insights + Market Keyword Summary routes
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { GenerateInsightSchema } from "../schemas/bmc-insight.schema.js";
import { CreateMarketSummarySchema } from "../schemas/insight-job.schema.js";
import { BmcInsightService } from "../services/bmc-insight-service.js";
import { InsightAgentService } from "../services/insight-agent-service.js";
import { BMC_BLOCK_TYPES } from "../services/bmc-service.js";

export const axBdInsightsRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /ax-bd/bmcs/:bmcId/blocks/:blockType/insights — BMC 블록 인사이트 생성
axBdInsightsRoute.post("/ax-bd/bmcs/:bmcId/blocks/:blockType/insights", async (c) => {
  const { blockType } = c.req.param();

  // 1. Validate blockType
  if (!(BMC_BLOCK_TYPES as readonly string[]).includes(blockType)) {
    return c.json(
      { error: `Invalid blockType. Must be one of: ${BMC_BLOCK_TYPES.join(", ")}` },
      400,
    );
  }

  // 2. Zod validation
  const body = await c.req.json();
  const parsed = GenerateInsightSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  // 3. Rate limit: KV "bmc-insight:{userId}" max 5/min
  const userId = c.get("userId");
  const kvKey = `bmc-insight:${userId}`;

  if (c.env.CACHE) {
    const existing = await c.env.CACHE.get(kvKey);
    const count = existing ? parseInt(existing, 10) : 0;
    if (count >= 5) {
      return c.json({ error: "Rate limit exceeded. Max 5 requests per minute." }, 429);
    }
    await c.env.CACHE.put(kvKey, String(count + 1), { expirationTtl: 60 });
  }

  // 4. Generate insights
  const apiKey = c.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: "ANTHROPIC_API_KEY not configured" }, 500);
  }

  try {
    const service = new BmcInsightService(c.env.DB, apiKey);
    const result = await service.generateInsights(
      blockType,
      parsed.data.currentContent,
      parsed.data.bmcContext,
      c.get("orgId"),
    );
    return c.json(result, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "LLM_TIMEOUT") {
      return c.json({ error: "LLM request timed out" }, 504);
    }
    if (message === "LLM_PARSE_ERROR") {
      return c.json({ error: "Failed to parse LLM response" }, 502);
    }
    if (message === "GATEWAY_NOT_PROCESSED") {
      return c.json({ error: "Prompt gateway processing failed" }, 502);
    }
    return c.json({ error: message }, 500);
  }
});

// POST /ax-bd/insights/market-summary — Market keyword summary job 생성
axBdInsightsRoute.post("/ax-bd/insights/market-summary", async (c) => {
  // 1. Zod validation
  const body = await c.req.json();
  const parsed = CreateMarketSummarySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  // 2. Rate limit: KV "market-insight:{userId}" max 3/min
  const userId = c.get("userId");
  const kvKey = `market-insight:${userId}`;

  if (c.env.CACHE) {
    const existing = await c.env.CACHE.get(kvKey);
    const count = existing ? parseInt(existing, 10) : 0;
    if (count >= 3) {
      return c.json({ error: "Rate limit exceeded. Max 3 requests per minute." }, 429);
    }
    await c.env.CACHE.put(kvKey, String(count + 1), { expirationTtl: 60 });
  }

  // 3. Check API key
  const apiKey = c.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: "ANTHROPIC_API_KEY not configured" }, 500);
  }

  // 4. Create job and start background execution
  const service = new InsightAgentService(c.env.DB, apiKey);
  const job = await service.createJob(c.get("orgId"), userId, parsed.data.keywords);

  // Execute in background via waitUntil
  c.executionCtx.waitUntil(service.executeJob(job.id));

  return c.json({ jobId: job.id, status: "pending" }, 202);
});

// GET /ax-bd/insights/jobs/:jobId — Job 상태 조회
axBdInsightsRoute.get("/ax-bd/insights/jobs/:jobId", async (c) => {
  const { jobId } = c.req.param();
  const orgId = c.get("orgId");

  const apiKey = c.env.ANTHROPIC_API_KEY ?? "";
  const service = new InsightAgentService(c.env.DB, apiKey);
  const job = await service.getJob(jobId, orgId);

  if (!job) {
    return c.json({ error: "Job not found" }, 404);
  }

  return c.json(job, 200);
});
