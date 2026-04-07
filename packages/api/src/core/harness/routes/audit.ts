import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  AuditEventSchema,
  AuditLogResponseSchema,
  AuditLogCreateResponseSchema,
  AuditStatsSchema,
  AuditEventTypeEnum,
} from "../schemas/audit.js";
import type { Env } from "../../../env.js";
import { AuditLogService } from "../services/audit-logger.js";
import type { JwtPayload } from "../../../middleware/auth.js";

export const auditRoute = new OpenAPIHono<{ Bindings: Env }>();

function getTenantId(c: { get: (key: string) => unknown }): string {
  try {
    const payload = c.get("jwtPayload") as JwtPayload | undefined;
    return payload?.orgId || "default";
  } catch {
    return "default";
  }
}

// ─── POST /api/audit/log ───

const logEvent = createRoute({
  method: "post",
  path: "/audit/log",
  tags: ["Audit"],
  summary: "감사 이벤트 기록",
  request: {
    body: {
      content: { "application/json": { schema: AuditEventSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: AuditLogCreateResponseSchema } },
      description: "감사 이벤트 기록 성공",
    },
  },
});

auditRoute.openapi(logEvent, async (c) => {
  const body = c.req.valid("json");
  const service = new AuditLogService(c.env.DB);
  const tenantId = getTenantId(c);

  const result = await service.logEvent({
    ...body,
    tenantId,
  });

  return c.json(result, 201);
});

// ─── GET /api/audit/logs ───

const getLogs = createRoute({
  method: "get",
  path: "/audit/logs",
  tags: ["Audit"],
  summary: "감사 로그 조회",
  request: {
    query: z.object({
      eventType: AuditEventTypeEnum.optional(),
      agentId: z.string().optional(),
      modelId: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(100).default(20),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: AuditLogResponseSchema } },
      description: "감사 로그 목록",
    },
  },
});

auditRoute.openapi(getLogs, async (c) => {
  const query = c.req.valid("query");
  const service = new AuditLogService(c.env.DB);
  const tenantId = getTenantId(c);

  const result = await service.getEvents(tenantId, query);
  return c.json(result);
});

// ─── GET /api/audit/stats ───

const getStats = createRoute({
  method: "get",
  path: "/audit/stats",
  tags: ["Audit"],
  summary: "감사 로그 통계",
  request: {
    query: z.object({
      period: z.coerce.number().default(7),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: AuditStatsSchema } },
      description: "이벤트 유형별 통계",
    },
  },
});

auditRoute.openapi(getStats, async (c) => {
  const { period } = c.req.valid("query");
  const service = new AuditLogService(c.env.DB);
  const tenantId = getTenantId(c);

  const result = await service.getStats(tenantId, period);
  return c.json(result);
});
