// ─── F333: TaskState REST API (Sprint 148) ───

import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  TaskStateDetailSchema,
  TaskStateListSchema,
  TaskStateRecordSchema,
  TaskStateSummarySchema,
  CreateTaskStateRequestSchema,
  TransitionRequestSchema,
  TransitionResultSchema,
} from "../schemas/task-state.js";
import { TaskStateService } from "../services/task-state-service.js";
import { createDefaultGuard } from "../services/transition-guard.js";
import { TaskState, type EventSource } from "@foundry-x/shared";
import type { AgentEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";

export const taskStateRoute = new OpenAPIHono<{ Bindings: AgentEnv; Variables: TenantVariables }>();

function getService(db: D1Database) {
  return new TaskStateService(db, createDefaultGuard());
}

// ─── F337: GET /task-states/summary — 상태별 집계 (Sprint 152) ───

const summaryRoute = createRoute({
  method: "get",
  path: "/task-states/summary",
  tags: ["TaskState"],
  summary: "상태별 태스크 수 집계",
  responses: {
    200: {
      content: { "application/json": { schema: TaskStateSummarySchema } },
      description: "집계",
    },
  },
});

taskStateRoute.openapi(summaryRoute, async (c) => {
  const orgId = c.get("orgId");
  const svc = getService(c.env.DB);
  const summary = await svc.getSummary(orgId);
  return c.json(summary);
});

// ─── GET /task-states — 목록 조회 ───

const listRoute = createRoute({
  method: "get",
  path: "/task-states",
  tags: ["TaskState"],
  summary: "태스크 상태 목록",
  request: {
    query: z.object({
      state: z.string().optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
      offset: z.coerce.number().min(0).default(0),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: TaskStateListSchema } },
      description: "목록",
    },
  },
});

taskStateRoute.openapi(listRoute, async (c) => {
  const orgId = c.get("orgId");
  const { state, limit, offset } = c.req.valid("query");
  const svc = getService(c.env.DB);
  const stateFilter = state && Object.values(TaskState).includes(state as TaskState)
    ? state as TaskState
    : undefined;
  const result = await svc.listByState(orgId, stateFilter, limit, offset);

  // Map to DB column format for response
  const items = result.items.map((item) => ({
    id: item.id,
    task_id: item.taskId,
    tenant_id: item.tenantId,
    current_state: item.currentState,
    agent_id: item.agentId,
    metadata: item.metadata ? JSON.stringify(item.metadata) : null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }));

  return c.json({ items, total: result.total } as z.infer<typeof TaskStateListSchema>);
});

// ─── POST /task-states — 태스크 생성 ───

const createRoute_ = createRoute({
  method: "post",
  path: "/task-states",
  tags: ["TaskState"],
  summary: "태스크 상태 생성 (INTAKE)",
  request: {
    body: {
      content: { "application/json": { schema: CreateTaskStateRequestSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: TaskStateRecordSchema } },
      description: "생성됨",
    },
    409: { description: "중복 taskId" },
  },
});

taskStateRoute.openapi(createRoute_, async (c) => {
  const orgId = c.get("orgId");
  const body = c.req.valid("json");
  const svc = getService(c.env.DB);

  // 중복 체크
  const existing = await svc.getState(body.taskId, orgId);
  if (existing) {
    return c.json({ error: "Task already exists", taskId: body.taskId }, 409);
  }

  const record = await svc.createTask(body.taskId, orgId, body.agentId, body.metadata);
  return c.json({
    id: record.id,
    task_id: record.taskId,
    tenant_id: record.tenantId,
    current_state: record.currentState,
    agent_id: record.agentId,
    metadata: record.metadata ? JSON.stringify(record.metadata) : null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  } as z.infer<typeof TaskStateRecordSchema>, 201);
});

// ─── GET /task-states/:taskId — 상세 조회 ───

const getDetailRoute = createRoute({
  method: "get",
  path: "/task-states/{taskId}",
  tags: ["TaskState"],
  summary: "태스크 상태 상세 (상태 + 이력 + 가용 전이)",
  request: {
    params: z.object({ taskId: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: TaskStateDetailSchema } },
      description: "상세",
    },
    404: { description: "태스크 없음" },
  },
});

taskStateRoute.openapi(getDetailRoute, async (c) => {
  const orgId = c.get("orgId");
  const { taskId } = c.req.valid("param");
  const svc = getService(c.env.DB);
  const detail = await svc.getDetail(taskId, orgId);

  if (!detail) {
    return c.json({ error: "Task not found" }, 404);
  }

  // Map to DB column format
  const state = {
    id: detail.state.id,
    task_id: detail.state.taskId,
    tenant_id: detail.state.tenantId,
    current_state: detail.state.currentState,
    agent_id: detail.state.agentId,
    metadata: detail.state.metadata ? JSON.stringify(detail.state.metadata) : null,
    created_at: detail.state.createdAt,
    updated_at: detail.state.updatedAt,
  };

  const history = detail.history.map((h) => ({
    id: h.id,
    task_id: h.taskId,
    tenant_id: h.tenantId,
    from_state: h.fromState,
    to_state: h.toState,
    trigger_source: h.triggerSource,
    trigger_event: h.triggerEvent,
    guard_result: h.guardResult,
    transitioned_by: h.transitionedBy,
    created_at: h.createdAt,
  }));

  return c.json({
    state,
    history,
    availableTransitions: detail.availableTransitions,
  } as z.infer<typeof TaskStateDetailSchema>);
});

// ─── POST /task-states/:taskId/transition — 상태 전이 ───

const transitionRoute = createRoute({
  method: "post",
  path: "/task-states/{taskId}/transition",
  tags: ["TaskState"],
  summary: "상태 전이 요청",
  request: {
    params: z.object({ taskId: z.string() }),
    body: {
      content: { "application/json": { schema: TransitionRequestSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: TransitionResultSchema } },
      description: "전이 결과",
    },
    400: { description: "전이 불가" },
    404: { description: "태스크 없음" },
  },
});

taskStateRoute.openapi(transitionRoute, async (c) => {
  const orgId = c.get("orgId");
  const { taskId } = c.req.valid("param");
  const body = c.req.valid("json");
  const jwt = c.get("jwtPayload" as never) as { sub?: string } | undefined;
  const svc = getService(c.env.DB);

  const result = await svc.transition(
    {
      taskId,
      toState: body.toState as TaskState,
      triggerSource: body.triggerSource as EventSource | undefined,
      triggerEvent: body.triggerEvent,
      metadata: body.metadata as Record<string, unknown> | undefined,
    },
    orgId,
    jwt?.sub,
  );

  if (!result.success && result.guardMessage?.includes("not found")) {
    return c.json(result as z.infer<typeof TransitionResultSchema>, 404);
  }

  if (!result.success) {
    return c.json(result as z.infer<typeof TransitionResultSchema>, 400);
  }

  return c.json(result as z.infer<typeof TransitionResultSchema>);
});
