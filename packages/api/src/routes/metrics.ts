// ─── F362: 운영 지표 라우트 (Sprint 164, Phase 17) ───

import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  MetricsOverviewSchema,
  SkillReuseResponseSchema,
  AgentUsageResponseSchema,
} from "../schemas/metrics-schema.js";
import { MetricsService } from "../services/metrics-service.js";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";

export const metricsRoute = new OpenAPIHono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// ── GET /metrics/overview — FR-08: 통합 운영 지표 ──

const overviewRoute = createRoute({
  method: "get",
  path: "/metrics/overview",
  tags: ["Metrics"],
  responses: {
    200: {
      description: "Operational metrics overview",
      content: { "application/json": { schema: MetricsOverviewSchema } },
    },
  },
});

metricsRoute.openapi(overviewRoute, async (c) => {
  const tenantId = c.get("orgId");
  const svc = new MetricsService(c.env.DB);
  const result = await svc.getOverview(tenantId);
  return c.json(result, 200);
});

// ── GET /metrics/skill-reuse — FR-05: Skill 재사용률 ──

const skillReuseRoute = createRoute({
  method: "get",
  path: "/metrics/skill-reuse",
  tags: ["Metrics"],
  responses: {
    200: {
      description: "Skill reuse rates by derivation type",
      content: { "application/json": { schema: SkillReuseResponseSchema } },
    },
  },
});

metricsRoute.openapi(skillReuseRoute, async (c) => {
  const tenantId = c.get("orgId");
  const svc = new MetricsService(c.env.DB);
  const result = await svc.getSkillReuse(tenantId);
  return c.json(result, 200);
});

// ── GET /metrics/agent-usage — FR-06: 에이전트/스킬 활용률 ──

const agentUsageRoute = createRoute({
  method: "get",
  path: "/metrics/agent-usage",
  tags: ["Metrics"],
  request: {
    query: z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    }),
  },
  responses: {
    200: {
      description: "Agent/skill usage by source",
      content: { "application/json": { schema: AgentUsageResponseSchema } },
    },
  },
});

metricsRoute.openapi(agentUsageRoute, async (c) => {
  const tenantId = c.get("orgId");
  const { month } = c.req.valid("query");
  const svc = new MetricsService(c.env.DB);
  const result = await svc.getAgentUsage(tenantId, month);
  return c.json(result, 200);
});
