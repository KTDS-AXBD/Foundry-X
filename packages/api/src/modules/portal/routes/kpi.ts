import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { verify } from "hono/jwt";
import {
  KpiTrackRequestSchema,
  KpiTrackResponseSchema,
  KpiSummaryResponseSchema,
  KpiTrendsResponseSchema,
  KpiEventsResponseSchema,
} from "../schemas/kpi.js";
import { ErrorSchema } from "../../../schemas/common.js";
import type { Env } from "../../../env.js";
import { KpiLogger } from "../services/kpi-logger.js";
import type { JwtPayload } from "../../../middleware/auth.js";

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

// ─── GET /api/kpi/phase4 ───

const Phase4KpiResponseSchema = z.object({
  wauTrend: z.array(z.object({ week: z.string(), wau: z.number() })),
  agentCompletionRate: z.number(),
  serviceIntegrationRate: z.number(),
  period: z.object({ from: z.string(), to: z.string() }),
}).openapi("Phase4KpiResponse");

const getPhase4Kpi = createRoute({
  method: "get",
  path: "/kpi/phase4",
  tags: ["KPI"],
  summary: "Phase 4 Go 판정 KPI (K7/K8/K9)",
  request: {
    query: z.object({
      days: z.coerce.number().default(28),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: Phase4KpiResponseSchema } },
      description: "Phase 4 KPI 데이터 (WAU 트렌드, 에이전트 완료율, 서비스 통합률)",
    },
  },
});

kpiRoute.openapi(getPhase4Kpi, async (c) => {
  const { days } = c.req.valid("query");
  const logger = new KpiLogger(c.env.DB);
  const tenantId = getTenantId(c);

  const result = await logger.getPhase4Kpi(tenantId, days);
  return c.json(result);
});

// ─── GET /api/kpi/weekly-summary ───

const WeeklySummaryResponseSchema = z.object({
  period: z.object({ start: z.string(), end: z.string() }),
  activeUsers: z.number(),
  totalPageViews: z.number(),
  onboardingCompletion: z.object({
    completed: z.number(),
    total: z.number(),
    rate: z.number(),
  }),
  averageNps: z.number(),
  feedbackCount: z.number(),
  topPages: z.array(z.object({ path: z.string(), views: z.number() })),
}).openapi("WeeklySummaryResponse");

const getWeeklySummary = createRoute({
  method: "get",
  path: "/kpi/weekly-summary",
  tags: ["KPI"],
  summary: "주간 사용 요약 (최근 7일, 인증 필수)",
  responses: {
    200: {
      content: { "application/json": { schema: WeeklySummaryResponseSchema } },
      description: "주간 KPI 요약",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Unauthorized",
    },
  },
});

kpiRoute.openapi(getWeeklySummary, async (c) => {
  // Manual auth — KPI route is mounted before global auth middleware
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Authorization required" }, 401);
  }
  const secret = c.env.JWT_SECRET ?? "dev-secret";
  let payload: JwtPayload;
  try {
    payload = (await verify(authHeader.slice(7), secret, "HS256")) as unknown as JwtPayload;
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }

  const tenantId = payload.orgId || "default";
  const DB = c.env.DB;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const start = weekAgo.toISOString().slice(0, 10);
  const end = now.toISOString().slice(0, 10);
  const weekAgoISO = weekAgo.toISOString();

  // Active users
  const activeResult = await DB.prepare(
    "SELECT COUNT(DISTINCT user_id) as cnt FROM kpi_events WHERE tenant_id = ? AND created_at >= ? AND user_id IS NOT NULL"
  ).bind(tenantId, weekAgoISO).first<{ cnt: number }>();

  // Total page views
  const pvResult = await DB.prepare(
    "SELECT COUNT(*) as cnt FROM kpi_events WHERE tenant_id = ? AND event_type = 'page_view' AND created_at >= ?"
  ).bind(tenantId, weekAgoISO).first<{ cnt: number }>();

  // Onboarding completion
  const completedResult = await DB.prepare(
    "SELECT COUNT(DISTINCT user_id) as cnt FROM onboarding_progress WHERE tenant_id = ? AND completed = 1"
  ).bind(tenantId).first<{ cnt: number }>();
  const totalUsersResult = await DB.prepare(
    "SELECT COUNT(DISTINCT user_id) as cnt FROM onboarding_progress WHERE tenant_id = ?"
  ).bind(tenantId).first<{ cnt: number }>();

  const completed = completedResult?.cnt ?? 0;
  const totalUsers = totalUsersResult?.cnt ?? 0;

  // Average NPS
  const npsResult = await DB.prepare(
    "SELECT AVG(nps_score) as avg_nps, COUNT(*) as cnt FROM onboarding_feedback WHERE tenant_id = ? AND created_at >= ?"
  ).bind(tenantId, weekAgoISO).first<{ avg_nps: number | null; cnt: number }>();

  // Top pages
  const topPagesResult = await DB.prepare(
    `SELECT json_extract(metadata, '$.page') as path, COUNT(*) as views
     FROM kpi_events
     WHERE tenant_id = ? AND event_type = 'page_view' AND created_at >= ?
     GROUP BY path
     ORDER BY views DESC
     LIMIT 5`
  ).bind(tenantId, weekAgoISO).all<{ path: string | null; views: number }>();

  return c.json({
    period: { start, end },
    activeUsers: activeResult?.cnt ?? 0,
    totalPageViews: pvResult?.cnt ?? 0,
    onboardingCompletion: {
      completed,
      total: totalUsers,
      rate: totalUsers > 0 ? Math.round((completed / totalUsers) * 100) / 100 : 0,
    },
    averageNps: npsResult?.avg_nps ? Math.round(npsResult.avg_nps * 10) / 10 : 0,
    feedbackCount: npsResult?.cnt ?? 0,
    topPages: (topPagesResult.results ?? [])
      .filter((r) => r.path)
      .map((r) => ({ path: r.path!, views: r.views })),
  });
});
