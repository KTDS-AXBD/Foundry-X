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

// ─── Sprint 12: Generative UI Schemas (F60) ───

const uiSectionSchema = z.object({
  type: z.enum(["text", "code", "diff", "chart", "diagram", "table", "timeline"]),
  title: z.string(),
  data: z.unknown(),
  interactive: z.boolean().optional(),
});

const uiActionSchema = z.object({
  type: z.enum(["approve", "reject", "edit", "expand"]),
  label: z.string(),
  targetSection: z.number().optional(),
});

export const uiHintSchema = z
  .object({
    layout: z.enum(["card", "tabs", "accordion", "flow", "iframe"]),
    sections: z.array(uiSectionSchema),
    html: z.string().optional(),
    actions: z.array(uiActionSchema).optional(),
  })
  .openapi("UIHint");

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
      uiHint: uiHintSchema.optional(),
    }),
    tokensUsed: z.number(),
    model: z.string(),
    duration: z.number(),
  })
  .openapi("AgentExecutionResult");

export const AgentRunnerInfoSchema = z
  .object({
    type: z.enum(["claude-api", "openrouter", "mcp", "mock"]),
    available: z.boolean(),
    model: z.string().optional(),
    description: z.string(),
  })
  .openapi("AgentRunnerInfo");

// ─── Sprint 13: PR Pipeline Schemas (F65) ───

export const PrReviewCommentSchema = z
  .object({
    file: z.string(),
    line: z.number(),
    comment: z.string(),
    severity: z.enum(["error", "warning", "info"]),
  })
  .openapi("PrReviewComment");

export const PrReviewResultSchema = z
  .object({
    decision: z.enum(["approve", "request_changes", "comment"]),
    summary: z.string(),
    comments: z.array(PrReviewCommentSchema),
    sddScore: z.number().min(0).max(100),
    qualityScore: z.number().min(0).max(100),
    securityIssues: z.array(z.string()),
  })
  .openapi("PrReviewResult");

export const PrPipelineConfigSchema = z
  .object({
    autoMerge: z.boolean().default(true),
    requireHumanApproval: z.boolean().default(false),
    maxAutoMergePerDay: z.number().default(10),
    branchPrefix: z.string().default("agent/"),
    mergeStrategy: z.enum(["squash", "merge", "rebase"]).default("squash"),
    sddScoreThreshold: z.number().default(80),
    qualityScoreThreshold: z.number().default(70),
  })
  .openapi("PrPipelineConfig");

export const AgentPrResultSchema = z
  .object({
    id: z.string(),
    prNumber: z.number().nullable(),
    prUrl: z.string().nullable(),
    branch: z.string(),
    status: z.enum(["creating", "open", "reviewing", "approved", "merged", "closed", "needs_human"]),
    reviewResult: PrReviewResultSchema.optional(),
    merged: z.boolean(),
  })
  .openapi("AgentPrResult");

export const AgentPrRecordSchema = z
  .object({
    id: z.string(),
    agentId: z.string(),
    taskId: z.string(),
    repo: z.string(),
    branch: z.string(),
    prNumber: z.number().nullable(),
    prUrl: z.string().nullable(),
    status: z.enum(["creating", "open", "reviewing", "approved", "merged", "closed", "needs_human"]),
    reviewAgentId: z.string().nullable(),
    reviewDecision: z.string().nullable(),
    sddScore: z.number().nullable(),
    qualityScore: z.number().nullable(),
    securityIssues: z.string().nullable(),
    mergeStrategy: z.string(),
    mergedAt: z.string().nullable(),
    commitSha: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("AgentPrRecord");

export const CreateAgentPrRequestSchema = z
  .object({
    agentId: z.string(),
    taskId: z.string(),
    config: PrPipelineConfigSchema.optional(),
  })
  .openapi("CreateAgentPrRequest");

// ─── Sprint 14: Merge Queue + Parallel Execution Schemas (F68) ───

export const MergeQueueEntrySchema = z
  .object({
    id: z.string(),
    prRecordId: z.string(),
    prNumber: z.number(),
    agentId: z.string(),
    priority: z.number(),
    position: z.number(),
    modifiedFiles: z.array(z.string()),
    status: z.enum(["queued", "merging", "merged", "conflict", "failed"]),
    conflictsWith: z.array(z.string()),
    rebaseAttempted: z.boolean(),
    rebaseSucceeded: z.boolean(),
    createdAt: z.string(),
    mergedAt: z.string().nullable(),
  })
  .openapi("MergeQueueEntry");

export const ConflictPairSchema = z.object({
  entryA: z.string(),
  entryB: z.string(),
  files: z.array(z.string()),
});

export const ConflictReportSchema = z
  .object({
    conflicting: z.array(ConflictPairSchema),
    suggestedOrder: z.array(z.string()),
    autoResolvable: z.boolean(),
  })
  .openapi("ConflictReport");

export const ParallelTaskSchema = z.object({
  agentId: z.string(),
  taskType: z.enum(["code-review", "code-generation", "spec-analysis", "test-generation"]),
  context: z.object({
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
  }),
});

export const ParallelExecuteRequestSchema = z
  .object({
    tasks: z.array(ParallelTaskSchema).min(2).max(5),
    createPrs: z.boolean().default(false),
  })
  .openapi("ParallelExecuteRequest");

export const UpdatePriorityRequestSchema = z
  .object({
    priority: z.number().int().min(0).max(10),
  })
  .openapi("UpdatePriorityRequest");

// Sprint 17 F82
export const rejectPlanBodySchema = z.object({
  reason: z.string().max(1000).optional(),
});
