import { z } from "@hono/zod-openapi";

const AgentCapabilitySchema = z.object({
  action: z.string(),
  scope: z.string(),
  tools: z.array(z.string()),
});

const AgentConstraintSchema = z.object({
  tier: z.enum(["always", "ask", "never"]),
  rule: z.string(),
  reason: z.string(),
});

const AgentActivitySchema = z.object({
  status: z.enum(["idle", "running", "waiting", "completed", "error"]),
  currentTask: z.string().optional(),
  startedAt: z.string().optional(),
  progress: z.number().optional(),
  tokenUsed: z.number().optional(),
});

export const AgentProfileSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    capabilities: z.array(AgentCapabilitySchema),
    constraints: z.array(AgentConstraintSchema),
    activity: AgentActivitySchema.optional(),
  })
  .openapi("AgentProfile");
