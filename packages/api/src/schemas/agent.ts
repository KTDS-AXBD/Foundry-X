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

// ─── Sprint 9: Orchestration Schemas (F50) ───

export const ConstraintCheckRequestSchema = z
  .object({
    agentId: z.string(),
    action: z.string(),
    context: z.record(z.unknown()).optional(),
  })
  .openapi("ConstraintCheckRequest");

export const AgentConstraintRuleSchema = z.object({
  id: z.string(),
  tier: z.enum(["always", "ask", "never"]),
  action: z.string(),
  description: z.string(),
  enforcementMode: z.enum(["block", "warn", "log"]),
});

export const ConstraintCheckResultSchema = z
  .object({
    allowed: z.boolean(),
    tier: z.enum(["always", "ask", "never"]),
    rule: AgentConstraintRuleSchema,
    reason: z.string(),
  })
  .openapi("ConstraintCheckResult");

export const AgentTaskSchema = z
  .object({
    id: z.string(),
    agentSessionId: z.string(),
    branch: z.string(),
    prNumber: z.number().optional(),
    prStatus: z.enum(["draft", "open", "merged", "closed"]),
    sddVerified: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("AgentTask");

export const CreateTaskRequestSchema = z
  .object({
    branch: z.string(),
  })
  .openapi("CreateTaskRequest");

export const AgentCapabilityDefinitionSchema = z
  .object({
    id: z.string(),
    agentId: z.string(),
    name: z.string(),
    description: z.string(),
    tools: z.array(z.string()),
    allowedPaths: z.array(z.string()),
    maxConcurrency: z.number(),
  })
  .openapi("AgentCapabilityDefinition");

export const AgentRegistrationSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    status: z.enum(["active", "inactive"]),
    createdAt: z.string(),
  })
  .openapi("AgentRegistration");
