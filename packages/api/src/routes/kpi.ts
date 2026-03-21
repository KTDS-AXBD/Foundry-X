import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  KpiTrackRequestSchema,
  KpiTrackResponseSchema,
  KpiSummaryResponseSchema,
  KpiTrendsResponseSchema,
  KpiEventsResponseSchema,
} from "../schemas/kpi.js";
import type { Env } from "../env.js";
import { KpiLogger } from "../services/kpi-logger.js";
import type { JwtPayload } from "../middleware/auth.js";

export const kpiRoute = new OpenAPIHono<{ Bindings: Env }>();

function getTenantId(c: { get: (key: string) => unknown }): string {
  try {
    const payload = c.get("jwtPayload") as JwtPayload | undefined;
    return payload?.orgId || "default";
  } catch {
    return "default";
  }
}

function getUserId(c: { get: (key: string) => unknown }): string | undefined {
  try {
    const payload = c.get("jwtPayload") as JwtPayload | undefined;
    return payload?.sub;
  } catch {
    return undefined;
  }
}

// ─── POST /api/kpi/track ───

const trackEvent = createRoute({
  method: "post",
  path: "/kpi/track",
  tags: ["KPI"],
  summary: "KPI 이벤트 기록 (인증 선택적)",
  request: {
    body: {
      content: { "application/json": { schema: KpiTrackRequestSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: KpiTrackResponseSchema } },
      description: "이벤트 기록 결과",
    },
  },
});

kpiRoute.openapi(trackEvent, async (c) => {
  const { eventType, metadata } = c.req.valid("json");
  const logger = new KpiLogger(c.env.DB);
  const tenantId = getTenantId(c);
  const userId = getUserId(c);

  const result = await logger.logEvent(tenantId, eventType, {
    userId,
    metadata: metadata as Record<string, unknown> | undefined,
  });

  return c.json(result);
});

// ─── GET /api/kpi/summary ───

const getSummary = createRoute({
  method: "get",
  path: "/kpi/summary",
  tags: ["KPI"],
  summary: "KPI 요약 (인증 필수)",
  request: {
    query: z.object({
      days: z.coerce.number().default(7),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: KpiSummaryResponseSchema } },
      description: "KPI 요약 데이터",
    },
  },
});

kpiRoute.openapi(getSummary, async (c) => {
  const { days } = c.req.valid("query");
  const logger = new KpiLogger(c.env.DB);
  const tenantId = getTenantId(c);

  const summary = await logger.getSummary(tenantId, days);
  return c.json(summary);
});

// ─── GET /api/kpi/trends ───

const getTrends = createRoute({
  method: "get",
  path: "/kpi/trends",
  tags: ["KPI"],
  summary: "KPI 트렌드 (인증 필수)",
  request: {
    query: z.object({
      days: z.coerce.number().default(30),
      groupBy: z.enum(["day", "week"]).default("day"),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: KpiTrendsResponseSchema } },
      description: "일별/주별 KPI 트렌드",
    },
  },
});

kpiRoute.openapi(getTrends, async (c) => {
  const { days, groupBy } = c.req.valid("query");
  const logger = new KpiLogger(c.env.DB);
  const tenantId = getTenantId(c);

  const trends = await logger.getTrends(tenantId, days, groupBy);
  return c.json({ trends });
});

// ─── GET /api/kpi/events ───

const getEvents = createRoute({
  method: "get",
  path: "/kpi/events",
  tags: ["KPI"],
  summary: "KPI 이벤트 목록 (인증 필수)",
  request: {
    query: z.object({
      type: z.string().optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
      offset: z.coerce.number().default(0),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: KpiEventsResponseSchema } },
      description: "이벤트 목록 + 총 개수",
    },
  },
});

kpiRoute.openapi(getEvents, async (c) => {
  const { type, limit, offset } = c.req.valid("query");
  const logger = new KpiLogger(c.env.DB);
  const tenantId = getTenantId(c);

  const result = await logger.getEvents(tenantId, { type, limit, offset });
  return c.json(result);
});
