// ─── F333: TaskState Zod 스키마 (Sprint 148) ───

import { z } from "@hono/zod-openapi";
import { TASK_STATES } from "@foundry-x/shared";

const TaskStateEnum = z.enum(TASK_STATES as [string, ...string[]]);
const EventSourceEnum = z.enum(["hook", "ci", "review", "discriminator", "sync", "manual"]);

// ─── 응답 스키마 ───

export const TaskStateRecordSchema = z.object({
  id: z.string(),
  task_id: z.string(),
  tenant_id: z.string(),
  current_state: TaskStateEnum,
  agent_id: z.string().nullable(),
  metadata: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
}).openapi("TaskStateRecord");

export const TaskStateHistorySchema = z.object({
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

export const TaskStateDetailSchema = z.object({
  state: TaskStateRecordSchema,
  history: z.array(TaskStateHistorySchema),
  availableTransitions: z.array(TaskStateEnum),
}).openapi("TaskStateDetail");

export const TaskStateListSchema = z.object({
  items: z.array(TaskStateRecordSchema),
  total: z.number(),
}).openapi("TaskStateList");

// ─── 요청 스키마 ───

export const CreateTaskStateRequestSchema = z.object({
  taskId: z.string().min(1),
  agentId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
}).openapi("CreateTaskStateRequest");

export const TransitionRequestSchema = z.object({
  toState: TaskStateEnum,
  triggerSource: EventSourceEnum.optional(),
  triggerEvent: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
}).openapi("TransitionRequest");

export const TransitionResultSchema = z.object({
  success: z.boolean(),
  taskId: z.string(),
  fromState: TaskStateEnum,
  toState: TaskStateEnum,
  timestamp: z.string(),
  guardMessage: z.string().optional(),
}).openapi("TransitionResult");
