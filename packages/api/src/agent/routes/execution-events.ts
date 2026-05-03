// ─── F334: Execution Events REST API (Sprint 149) ───

import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  ExecutionEventListSchema,
} from "../schemas/execution-event.js";
import { ExecutionEventService } from "../services/execution-event-service.js";
import type { Env } from "../../env.js";
import type { TenantVariables } from "../../middleware/tenant.js";

export const executionEventsRoute = new OpenAPIHono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

function getService(db: D1Database) {
  return new ExecutionEventService(db);
}

// ─── GET /execution-events — 이벤트 이력 조회 ───

const listRoute = createRoute({
  method: "get",
  path: "/execution-events",
  tags: ["ExecutionEvent"],
  summary: "실행 이벤트 이력 조회",
  request: {
    query: z.object({
      taskId: z.string().optional(),
      source: z.string().optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
      offset: z.coerce.number().min(0).default(0),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ExecutionEventListSchema } },
      description: "이벤트 목록",
    },
    400: { description: "taskId 또는 source 필수" },
  },
});

executionEventsRoute.openapi(listRoute, async (c) => {
  const orgId = c.get("orgId");
  const { taskId, source, limit, offset } = c.req.valid("query");
  const svc = getService(c.env.DB);

  if (taskId) {
    const result = await svc.listByTask(taskId, orgId, limit, offset);
    const items = result.items.map((item) => ({
      id: item.id,
      task_id: item.taskId,
      tenant_id: item.tenantId,
      source: item.source,
      severity: item.severity,
      payload: item.payload,
      created_at: item.createdAt,
    }));
    return c.json({ items, total: result.total });
  }

  if (source) {
    const result = await svc.listBySource(orgId, source, limit, offset);
    const items = result.items.map((item) => ({
      id: item.id,
      task_id: item.taskId,
      tenant_id: item.tenantId,
      source: item.source,
      severity: item.severity,
      payload: item.payload,
      created_at: item.createdAt,
    }));
    return c.json({ items, total: result.total });
  }

  return c.json({ error: "taskId or source query parameter is required" }, 400);
});
