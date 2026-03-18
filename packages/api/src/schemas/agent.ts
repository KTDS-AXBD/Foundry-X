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

// ─── Sprint 10: Agent Execution Schemas (F53) ───

export const AgentExecuteRequestSchema = z
  .object({
    taskType: z
      .enum(["code-review", "code-generation", "spec-analysis", "test-generation"])
      .describe("실행할 작업 유형"),
    context: z
      .object({
        repoUrl: z.string().default("https://github.com/KTDS-AXBD/Foundry-X"),
        branch: z.string().default("master"),
        targetFiles: z.array(z.string()).optional(),
        spec: z
          .object({
            title: z.string(),
            description: z.string(),
            acceptanceCriteria: z.array(z.string()),
          })
          .optional(),
        instructions: z.string().max(2000).optional(),
      })
      .describe("실행 컨텍스트"),
  })
  .openapi("AgentExecuteRequest");

export const AgentExecutionResultSchema = z
  .object({
    status: z.enum(["success", "partial", "failed"]),
    output: z.object({
      analysis: z.string().optional(),
      generatedCode: z
        .array(
          z.object({
            path: z.string(),
            content: z.string(),
            action: z.enum(["create", "modify"]),
          }),
        )
        .optional(),
      reviewComments: z
        .array(
          z.object({
            file: z.string(),
            line: z.number(),
            comment: z.string(),
            severity: z.enum(["error", "warning", "info"]),
          }),
        )
        .optional(),
    }),
    tokensUsed: z.number(),
    model: z.string(),
    duration: z.number(),
  })
  .openapi("AgentExecutionResult");

export const AgentRunnerInfoSchema = z
  .object({
    type: z.enum(["claude-api", "mcp", "mock"]),
    available: z.boolean(),
    model: z.string().optional(),
    description: z.string(),
  })
  .openapi("AgentRunnerInfo");
