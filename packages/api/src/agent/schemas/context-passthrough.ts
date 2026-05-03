import { z } from "@hono/zod-openapi";

// ─── F224: Context Passthrough Schemas ───

export const ContextPayloadSchema = z
  .object({
    storyId: z.string().min(1).max(200),
    title: z.string().min(1).max(500),
    requirements: z.array(z.string().max(2000)).max(50),
    acceptanceCriteria: z.array(z.string().max(2000)).max(50),
    technicalNotes: z.string().max(10000).optional(),
    relatedFiles: z.array(z.string().max(500)).max(100).optional(),
    priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  })
  .openapi("ContextPayload");

export const ContextPassthroughCreateSchema = z
  .object({
    sourceRole: z.string().min(1).max(100),
    targetRole: z.string().min(1).max(100),
    payload: ContextPayloadSchema,
    workflowExecutionId: z.string().max(200).optional(),
  })
  .openapi("ContextPassthroughCreate");

export const ContextPassthroughResponseSchema = z
  .object({
    id: z.string(),
    sourceRole: z.string(),
    targetRole: z.string(),
    payload: ContextPayloadSchema,
    workflowExecutionId: z.string().nullable(),
    status: z.enum(["pending", "delivered", "acknowledged"]),
    orgId: z.string(),
    createdAt: z.string(),
    deliveredAt: z.string().nullable(),
    acknowledgedAt: z.string().nullable(),
  })
  .openapi("ContextPassthroughResponse");
