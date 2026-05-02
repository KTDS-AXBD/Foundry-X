// ─── F336: Agent Adapter Zod Schemas (Sprint 151) ───

import { z } from "@hono/zod-openapi";

export const AgentAdapterResponseSchema = z.object({
  name: z.string(),
  role: z.enum(["generator", "discriminator", "orchestrator"]),
  metadata: z
    .object({
      source: z.enum(["yaml", "service", "mcp"]),
      originalService: z.string().optional(),
      capabilities: z.array(z.string()).optional(),
      modelTier: z.string().optional(),
    })
    .optional(),
});

export const AgentAdapterListResponseSchema = z.object({
  items: z.array(AgentAdapterResponseSchema),
  total: z.number(),
});

export const AgentAdapterExecuteRequestSchema = z.object({
  taskId: z.string().min(1),
  tenantId: z.string().min(1),
  loopMode: z.enum(["retry", "adversarial", "fix"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const AgentAdapterExecuteResponseSchema = z.object({
  success: z.boolean(),
  qualityScore: z.number().nullable(),
  feedback: z.array(z.string()),
  artifacts: z.record(z.unknown()).optional(),
});
