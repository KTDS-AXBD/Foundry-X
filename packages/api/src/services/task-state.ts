// ─── F333: TaskState REST API (packages/api scope) ───

import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { TaskStateService } from "./task-state-service.js";
import { createDefaultGuard } from "../core/harness/services/transition-guard.js";
import { TaskState, TASK_STATES, type EventSource } from "@foundry-x/shared";
import type { Env } from "../env.js";

// ─── Schemas ───

const TaskStateEnum = z.enum(TASK_STATES as [string, ...string[]]);
const EventSourceEnum = z.enum(["hook", "ci", "review", "discriminator", "sync", "manual"]);

const TaskStateRecordSchema = z.object({
  id: z.string(),
  task_id: z.string(),
  tenant_id: z.string(),
  current_state: TaskStateEnum,
  agent_id: z.string().nullable(),
  metadata: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
}).openapi("TaskStateRecord");

const TaskStateHistorySchema = z.object({
  id: z.string(),
  task_id: z.string(),
  tenant_id: z.string(),
  from_state: TaskStateEnum,
  to_state: TaskStateEnum,
  trigger_source: z.string().nullable(),
  trigger_event: z.string().nullable(),
  guard_result: z.string().nullable(),
  transitioned_by: z.string().nullable(),
  created_at: z.string(),
}).openapi("TaskStateHistory");

const TaskStateDetailSchema = z.object({
  state: TaskStateRecordSchema,
  history: z.array(TaskStateHistorySchema),
  availableTransitions: z.array(TaskStateEnum),
}).openapi("TaskStateDetail");

const TaskStateListSchema = z.object({
  items: z.array(TaskStateRecordSchema),
  total: z.number(),
}).openapi("TaskStateList");

const CreateTaskStateRequestSchema = z.object({
  taskId: z.string().min(1),
  agentId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
}).openapi("CreateTaskStateRequest");

const TransitionRequestSchema = z.object({
  toState: TaskStateEnum,
  triggerSource: EventSourceEnum.optional(),
  triggerEvent: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
}).openapi("TransitionRequest");

const TransitionResultSchema = z.object({
  success: z.boolean(),
  taskId: z.string(),
  fromState: TaskStateEnum,
  toState: TaskStateEnum,
  timestamp: z.string(),
  guardMessage: z.string().optional(),
}).openapi("TransitionResult");

const TaskStateSummarySchema = z.object({
  counts: z.record(z.number()),
  total: z.number(),
}).openapi("TaskStateSummary");

// ─── Route ───

type Variables = { orgId: string; jwtPayload?: { sub?: string } };

export const taskStateRoute = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

function getService(db: D1Database) {
  return new TaskStateService(db, createDefaultGuard());
}

// ─── GET /task-states/summary ───

const summaryRoute = createRoute({
  method: "get",
  path: "/task-states/summary",
  tags: ["TaskState"],
  summary: "상태별 태스크 수 집계",
  responses: { 200: { content: { "application/json": { schema: TaskStateSummarySchema } }, description: "집계" } },
});

taskStateRoute.openapi(summaryRoute, async (c) => {
  const orgId = c.get("orgId");
  const svc = getService(c.env.DB);
  const summary = await svc.getSummary(orgId);
  return c.json(summary);
});

// ─── GET /task-states ───

const listRoute = createRoute({
  method: "get",
  path: "/task-states",
  tags: ["TaskState"],
  summary: "태스크 상태 목록",
  request: { query: z.object({ state: z.string().optional(), limit: z.coerce.number().min(1).max(100).default(20), offset: z.coerce.number().min(0).default(0) }) },
  responses: { 200: { content: { "application/json": { schema: TaskStateListSchema } }, description: "목록" } },
});

taskStateRoute.openapi(listRoute, async (c) => {
  const orgId = c.get("orgId");
  const { state, limit, offset } = c.req.valid("query");
  const svc = getService(c.env.DB);
  const stateFilter = state && Object.values(TaskState).includes(state as TaskState) ? state as TaskState : undefined;
  const result = await svc.listByState(orgId, stateFilter, limit, offset);
  const items = result.items.map((item) => ({ id: item.id, task_id: item.taskId, tenant_id: item.tenantId, current_state: item.currentState, agent_id: item.agentId, metadata: item.metadata ? JSON.stringify(item.metadata) : null, created_at: item.createdAt, updated_at: item.updatedAt }));
  return c.json({ items, total: result.total } as z.infer<typeof TaskStateListSchema>);
});

// ─── POST /task-states ───

const createRouteHandler = createRoute({
  method: "post",
  path: "/task-states",
  tags: ["TaskState"],
  summary: "태스크 상태 생성 (INTAKE)",
  request: { body: { content: { "application/json": { schema: CreateTaskStateRequestSchema } } } },
  responses: { 201: { content: { "application/json": { schema: TaskStateRecordSchema } }, description: "생성됨" }, 409: { description: "중복 taskId" } },
});

taskStateRoute.openapi(createRouteHandler, async (c) => {
  const orgId = c.get("orgId");
  const body = c.req.valid("json");
  const svc = getService(c.env.DB);
  const existing = await svc.getState(body.taskId, orgId);
  if (existing) return c.json({ error: "Task already exists", taskId: body.taskId }, 409);
  const record = await svc.createTask(body.taskId, orgId, body.agentId, body.metadata);
  return c.json({ id: record.id, task_id: record.taskId, tenant_id: record.tenantId, current_state: record.currentState, agent_id: record.agentId, metadata: record.metadata ? JSON.stringify(record.metadata) : null, created_at: record.createdAt, updated_at: record.updatedAt } as z.infer<typeof TaskStateRecordSchema>, 201);
});

// ─── GET /task-states/:taskId ───

const getDetailRoute = createRoute({
  method: "get",
  path: "/task-states/{taskId}",
  tags: ["TaskState"],
  summary: "태스크 상태 상세",
  request: { params: z.object({ taskId: z.string() }) },
  responses: { 200: { content: { "application/json": { schema: TaskStateDetailSchema } }, description: "상세" }, 404: { description: "태스크 없음" } },
});

taskStateRoute.openapi(getDetailRoute, async (c) => {
  const orgId = c.get("orgId");
  const { taskId } = c.req.valid("param");
  const svc = getService(c.env.DB);
  const detail = await svc.getDetail(taskId, orgId);
  if (!detail) return c.json({ error: "Task not found" }, 404);
  const state = { id: detail.state.id, task_id: detail.state.taskId, tenant_id: detail.state.tenantId, current_state: detail.state.currentState, agent_id: detail.state.agentId, metadata: detail.state.metadata ? JSON.stringify(detail.state.metadata) : null, created_at: detail.state.createdAt, updated_at: detail.state.updatedAt };
  const history = detail.history.map((h) => ({ id: h.id, task_id: h.taskId, tenant_id: h.tenantId, from_state: h.fromState, to_state: h.toState, trigger_source: h.triggerSource, trigger_event: h.triggerEvent, guard_result: h.guardResult, transitioned_by: h.transitionedBy, created_at: h.createdAt }));
  return c.json({ state, history, availableTransitions: detail.availableTransitions } as z.infer<typeof TaskStateDetailSchema>);
});

// ─── POST /task-states/:taskId/transition ───

const transitionRoute = createRoute({
  method: "post",
  path: "/task-states/{taskId}/transition",
  tags: ["TaskState"],
  summary: "상태 전이 요청",
  request: { params: z.object({ taskId: z.string() }), body: { content: { "application/json": { schema: TransitionRequestSchema } } } },
  responses: { 200: { content: { "application/json": { schema: TransitionResultSchema } }, description: "전이 결과" }, 400: { description: "전이 불가" }, 404: { description: "태스크 없음" } },
});

taskStateRoute.openapi(transitionRoute, async (c) => {
  const orgId = c.get("orgId");
  const { taskId } = c.req.valid("param");
  const body = c.req.valid("json");
  const jwt = c.get("jwtPayload" as never) as { sub?: string } | undefined;
  const svc = getService(c.env.DB);
  const result = await svc.transition({ taskId, toState: body.toState as TaskState, triggerSource: body.triggerSource as EventSource | undefined, triggerEvent: body.triggerEvent, metadata: body.metadata as Record<string, unknown> | undefined }, orgId, jwt?.sub);
  if (!result.success && result.guardMessage?.includes("not found")) return c.json(result as z.infer<typeof TransitionResultSchema>, 404);
  if (!result.success) return c.json(result as z.infer<typeof TransitionResultSchema>, 400);
  return c.json(result as z.infer<typeof TransitionResultSchema>);
});
