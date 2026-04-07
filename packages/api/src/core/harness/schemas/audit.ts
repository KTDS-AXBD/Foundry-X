import { z } from "@hono/zod-openapi";

export const AuditEventTypeEnum = z.enum([
  "ai_generation",
  "ai_review",
  "code_commit",
  "model_switch",
  "prompt_injection",
  "data_export",
  "policy_violation",
  "agent_execution",
]);

export const InputClassificationEnum = z.enum([
  "public",
  "internal",
  "confidential",
  "restricted",
]);

export const AuditEventSchema = z
  .object({
    tenantId: z.string().min(1),
    eventType: AuditEventTypeEnum,
    agentId: z.string().optional(),
    modelId: z.string().optional(),
    promptHash: z.string().optional(),
    inputClassification: InputClassificationEnum.default("internal"),
    outputType: z.string().optional(),
    approvedBy: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .openapi("AuditEvent");

export const AuditLogSchema = z
  .object({
    id: z.string(),
    tenantId: z.string(),
    eventType: z.string(),
    agentId: z.string().nullable(),
    modelId: z.string().nullable(),
    promptHash: z.string().nullable(),
    inputClassification: z.string(),
    outputType: z.string().nullable(),
    approvedBy: z.string().nullable(),
    approvedAt: z.string().nullable(),
    metadata: z.record(z.unknown()),
    createdAt: z.string(),
  })
  .openapi("AuditLog");

export const AuditQuerySchema = z.object({
  eventType: AuditEventTypeEnum.optional(),
  agentId: z.string().optional(),
  modelId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

export const AuditLogResponseSchema = z
  .object({
    logs: z.array(AuditLogSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  })
  .openapi("AuditLogResponse");

export const AuditStatsSchema = z
  .object({
    stats: z.array(
      z.object({
        eventType: z.string(),
        count: z.number(),
      }),
    ),
    total: z.number(),
    period: z.object({ from: z.string(), to: z.string() }),
  })
  .openapi("AuditStats");

export const AuditLogCreateResponseSchema = z
  .object({
    id: z.string(),
    recorded: z.boolean(),
  })
  .openapi("AuditLogCreateResponse");
