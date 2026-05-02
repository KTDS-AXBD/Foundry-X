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

// ─── Sprint 36: Model Routing Schemas (F136) ───

const allTaskTypes = z.enum([
  "code-review", "code-generation", "spec-analysis",
  "test-generation", "security-review", "qa-testing",
  "infra-analysis", "policy-evaluation", "skill-query", "ontology-lookup",
]);

export const RoutingRuleSchema = z
  .object({
    id: z.string(),
    taskType: allTaskTypes,
    modelId: z.string(),
    runnerType: z.enum(["openrouter", "claude-api", "mcp", "mock"]),
    priority: z.number().int().min(1),
    maxCostPerCall: z.number().nullable(),
    enabled: z.boolean(),
  })
  .openapi("RoutingRule");

export const UpdateRoutingRuleRequestSchema = z
  .object({
    modelId: z.string().describe("OpenRouter 모델 ID (e.g., anthropic/claude-sonnet-4)"),
    priority: z.number().int().min(1).default(1).optional(),
    maxCostPerCall: z.number().nullable().optional(),
    enabled: z.boolean().default(true).optional(),
  })
  .openapi("UpdateRoutingRuleRequest");

export const RoutingRulesResponseSchema = z
  .object({
    rules: z.array(RoutingRuleSchema),
    defaults: z.record(z.string()),
  })
  .openapi("RoutingRulesResponse");

// ─── Sprint 36: Evaluator-Optimizer Schemas (F137) ───

export const EvaluationScoreSchema = z
  .object({
    criteriaName: z.string(),
    score: z.number().min(0).max(100),
    passed: z.boolean(),
    feedback: z.array(z.string()),
    details: z.record(z.unknown()),
  })
  .openapi("EvaluationScore");

export const EvaluateOptimizeRequestSchema = z
  .object({
    taskType: allTaskTypes,
    context: z.object({
      repoUrl: z.string().default("https://github.com/KTDS-AXBD/Foundry-X"),
      branch: z.string().default("master"),
      targetFiles: z.array(z.string()).optional(),
      spec: z.object({
        title: z.string(),
        description: z.string(),
        acceptanceCriteria: z.array(z.string()),
      }).optional(),
      instructions: z.string().max(2000).optional(),
    }),
    config: z.object({
      maxIterations: z.number().int().min(1).max(5).default(3),
      qualityThreshold: z.number().min(0).max(100).default(80),
      criteria: z.array(z.enum(["code-review", "test-coverage", "spec-compliance"])),
    }),
  })
  .openapi("EvaluateOptimizeRequest");

// ─── Sprint 37: ArchitectAgent Schemas (F138) ───

export const ArchitectAnalyzeRequestSchema = z
  .object({
    taskType: z.literal("spec-analysis").describe("아키텍처 분석은 spec-analysis 태스크 사용"),
    context: z.object({
      repoUrl: z.string().default("https://github.com/KTDS-AXBD/Foundry-X"),
      branch: z.string().default("master"),
      targetFiles: z.array(z.string()).optional(),
      spec: z.object({
        title: z.string(),
        description: z.string(),
        acceptanceCriteria: z.array(z.string()),
      }).optional(),
      instructions: z.string().max(2000).optional(),
      fileContents: z.record(z.string()).optional(),
    }),
  })
  .openapi("ArchitectAnalyzeRequest");

export const DesignReviewRequestSchema = z
  .object({
    document: z.string().max(50000).describe("설계 문서 내용 (Markdown)"),
    title: z.string().max(200).optional().describe("문서 제목"),
  })
  .openapi("DesignReviewRequest");

export const EvaluationLoopResultSchema = z
  .object({
    finalResult: AgentExecutionResultSchema,
    finalScore: z.number(),
    iterations: z.number(),
    converged: z.boolean(),
    totalTokensUsed: z.number(),
    totalDuration: z.number(),
    history: z.array(z.object({
      iteration: z.number(),
      aggregateScore: z.number(),
      feedback: z.array(z.string()),
    })),
  })
  .openapi("EvaluationLoopResult");

// ─── Sprint 37: TestAgent Schemas (F139) ───

export const testGenerateSchema = z.object({
  taskId: z.string(),
  agentId: z.string().default("test-agent"),
  taskType: z.literal("test-generation"),
  context: z.object({
    repoUrl: z.string(),
    branch: z.string(),
    targetFiles: z.array(z.string()).optional(),
    spec: z.object({
      title: z.string(),
      description: z.string(),
      acceptanceCriteria: z.array(z.string()),
    }).optional(),
    instructions: z.string().optional(),
    fileContents: z.record(z.string()).optional(),
  }),
  constraints: z.array(z.any()).default([]),
});

export const coverageGapsSchema = z.object({
  sourceFiles: z.record(z.string()),
  testFiles: z.record(z.string()).default({}),
});

// ─── Sprint 38: SecurityAgent Schemas (F140) ───

export const SecurityScanRequestSchema = z
  .object({
    taskType: z.literal("security-review").describe("보안 분석은 security-review 태스크 사용"),
    context: z.object({
      repoUrl: z.string().default("https://github.com/KTDS-AXBD/Foundry-X"),
      branch: z.string().default("master"),
      targetFiles: z.array(z.string()).optional(),
      spec: z.object({
        title: z.string(),
        description: z.string(),
        acceptanceCriteria: z.array(z.string()),
      }).optional(),
      instructions: z.string().max(2000).optional(),
      fileContents: z.record(z.string()).optional(),
    }),
  })
  .openapi("SecurityScanRequest");

export const SecurityPRDiffRequestSchema = z
  .object({
    diff: z.string().max(100000).describe("PR diff 내용"),
    context: z.string().max(2000).optional().describe("추가 컨텍스트"),
  })
  .openapi("SecurityPRDiffRequest");

// ─── Sprint 38: QAAgent Schemas (F141) ───

export const QABrowserTestRequestSchema = z
  .object({
    taskId: z.string(),
    agentId: z.string().default("qa-agent"),
    taskType: z.literal("qa-testing"),
    context: z.object({
      repoUrl: z.string(),
      branch: z.string(),
      targetFiles: z.array(z.string()).optional(),
      spec: z.object({
        title: z.string(),
        description: z.string(),
        acceptanceCriteria: z.array(z.string()),
      }).optional(),
      instructions: z.string().optional(),
      fileContents: z.record(z.string()).optional(),
    }),
    constraints: z.array(z.any()).default([]),
  })
  .openapi("QABrowserTestRequest");

export const QAAcceptanceRequestSchema = z
  .object({
    spec: z.object({
      title: z.string(),
      description: z.string(),
      acceptanceCriteria: z.array(z.string()),
    }),
    files: z.record(z.string()),
  })
  .openapi("QAAcceptanceRequest");

// ─── Sprint 39: Fallback Chain Schemas (F144) ───

export const FallbackChainResponseSchema = z
  .object({
    chain: z.array(z.object({
      id: z.string(),
      taskType: allTaskTypes,
      modelId: z.string(),
      runnerType: z.enum(["openrouter", "claude-api", "mcp", "mock"]),
      priority: z.number(),
    })),
  })
  .openapi("FallbackChainResponse");

export const FallbackEventsResponseSchema = z
  .object({
    events: z.array(z.object({
      id: z.string(),
      taskType: z.string(),
      fromModel: z.string(),
      toModel: z.string(),
      reason: z.string(),
      latencyMs: z.number(),
      createdAt: z.string(),
    })),
  })
  .openapi("FallbackEventsResponse");

// ─── Sprint 39: Prompt Gateway Schemas (F149) ───

export const SanitizeRequestSchema = z
  .object({
    content: z.string().min(1).max(100_000),
  })
  .openapi("SanitizeRequest");

export const SanitizeResponseSchema = z
  .object({
    sanitizedContent: z.string(),
    appliedRules: z.array(z.object({
      ruleId: z.string(),
      category: z.string(),
      matchCount: z.number(),
    })),
    originalLength: z.number(),
    sanitizedLength: z.number(),
  })
  .openapi("SanitizeResponse");

export const SanitizationRulesResponseSchema = z
  .object({
    rules: z.array(z.object({
      id: z.string(),
      pattern: z.string(),
      replacement: z.string(),
      category: z.enum(["secret", "url", "pii", "custom"]),
      enabled: z.boolean(),
    })),
  })
  .openapi("SanitizationRulesResponse");

// ─── Sprint 40: InfraAgent Schemas (F145) ───

export const InfraAnalyzeRequestSchema = z
  .object({
    taskType: z.literal("infra-analysis").describe("인프라 분석은 infra-analysis 태스크 사용"),
    context: z.object({
      repoUrl: z.string().default("https://github.com/KTDS-AXBD/Foundry-X"),
      branch: z.string().default("master"),
      targetFiles: z.array(z.string()).optional(),
      spec: z.object({
        title: z.string(),
        description: z.string(),
        acceptanceCriteria: z.array(z.string()),
      }).optional(),
      instructions: z.string().max(2000).optional(),
      fileContents: z.record(z.string()).optional(),
    }),
  })
  .openapi("InfraAnalyzeRequest");

export const InfraSimulateRequestSchema = z
  .object({
    description: z.string().max(5000).describe("변경 설명"),
    currentConfig: z.string().max(50000).optional().describe("현재 wrangler.toml 등 설정"),
  })
  .openapi("InfraSimulateRequest");

export const InfraMigrationValidateRequestSchema = z
  .object({
    sql: z.string().min(1).max(100000).describe("마이그레이션 SQL"),
    existingSchema: z.string().max(100000).optional().describe("기존 스키마 SQL"),
  })
  .openapi("InfraMigrationValidateRequest");

// ─── Sprint 39: Agent Feedback Loop Schemas (F150) ───

export const FeedbackSubmitSchema = z
  .object({
    failureId: z.string(),
    feedback: z.string().min(1).max(2000),
    expectedOutcome: z.string().max(1000).optional(),
  })
  .openapi("FeedbackSubmitRequest");

export const FeedbackResponseSchema = z
  .object({
    feedback: z.array(z.object({
      id: z.string(),
      executionId: z.string(),
      taskType: z.string(),
      failureReason: z.string().nullable(),
      humanFeedback: z.string().nullable(),
      promptHint: z.string().nullable(),
      status: z.enum(["pending", "reviewed", "applied"]),
      createdAt: z.string(),
    })),
  })
  .openapi("FeedbackResponse");

// ─── Sprint 40: Self-Reflection Schemas (F148) ───

export const ReflectRequestSchema = z
  .object({
    originalRequest: z.object({
      taskId: z.string(),
      taskType: z.string(),
      instructions: z.string().max(10000),
    }),
    result: z.object({
      status: z.string(),
      output: z.string().max(50000),
    }),
  })
  .openapi("ReflectRequest");

export const ReflectionConfigSchema = z
  .object({
    threshold: z.number(),
    maxRetries: z.number(),
    hardMaxRetries: z.number(),
  })
  .openapi("ReflectionConfig");

// ─── Sprint 41: Custom Agent Role Schemas (F146) ───

export const CreateCustomRoleSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    systemPrompt: z.string().min(1).max(10000),
    allowedTools: z.array(z.string()).optional(),
    preferredModel: z.string().optional(),
    preferredRunnerType: z.enum(["openrouter", "claude-api", "mcp", "mock"]).optional(),
    taskType: z.string().optional(),
    orgId: z.string().optional(),
  })
  .openapi("CreateCustomRole");

export const UpdateCustomRoleSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    systemPrompt: z.string().min(1).max(10000).optional(),
    allowedTools: z.array(z.string()).optional(),
    preferredModel: z.string().nullable().optional(),
    preferredRunnerType: z.enum(["openrouter", "claude-api", "mcp", "mock"]).optional(),
    taskType: z.string().optional(),
    enabled: z.boolean().optional(),
  })
  .openapi("UpdateCustomRole");

export const CustomRoleSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    systemPrompt: z.string(),
    allowedTools: z.array(z.string()),
    preferredModel: z.string().nullable(),
    preferredRunnerType: z.string(),
    taskType: z.string(),
    orgId: z.string(),
    isBuiltin: z.boolean(),
    enabled: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("CustomRole");

// ─── Sprint 41: Ensemble Voting Schemas (F147) ───

export const EnsembleRequestSchema = z
  .object({
    taskType: allTaskTypes.describe("실행할 작업 유형"),
    context: z.object({
      repoUrl: z.string().default("https://github.com/KTDS-AXBD/Foundry-X"),
      branch: z.string().default("master"),
      targetFiles: z.array(z.string()).optional(),
      spec: z.object({
        title: z.string(),
        description: z.string(),
        acceptanceCriteria: z.array(z.string()),
      }).optional(),
      instructions: z.string().max(2000).optional(),
    }),
    config: z.object({
      models: z.array(z.string()).min(2).max(5).describe("앙상블에 사용할 모델 ID 배열 (2~5개)"),
      strategy: z.enum(["majority", "quality-score", "weighted"]).describe("투표 전략"),
      weights: z.record(z.number()).optional().describe("모델별 가중치 (weighted 전략 시)"),
      evaluationModel: z.string().optional().describe("품질 평가 모델 (quality-score 전략 시)"),
      timeoutMs: z.number().optional().describe("타임아웃 (ms)"),
    }),
  })
  .openapi("EnsembleRequest");

export const EnsembleResultSchema = z
  .object({
    winner: AgentExecutionResultSchema,
    winnerModel: z.string(),
    winnerScore: z.number(),
    allResults: z.array(z.object({
      model: z.string(),
      result: AgentExecutionResultSchema.nullable(),
      score: z.number(),
      latencyMs: z.number(),
      error: z.string().optional(),
    })),
    votingDetails: z.object({
      strategy: z.enum(["majority", "quality-score", "weighted"]),
      totalModels: z.number(),
      successfulModels: z.number(),
      averageLatencyMs: z.number(),
    }),
  })
  .openapi("EnsembleResult");

export const StrategyInfoSchema = z
  .object({
    name: z.enum(["majority", "quality-score", "weighted"]),
    description: z.string(),
    costMultiplier: z.number(),
    bestFor: z.string(),
  })
  .openapi("StrategyInfo");

// ─── Sprint 42: Agent Marketplace Schemas (F152) ───

export const PublishMarketplaceItemSchema = z.object({
  roleId: z.string().min(1),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
  category: z.string().optional(),
});

export const SearchMarketplaceSchema = z.object({
  q: z.string().max(100).optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
  sortBy: z.enum(["rating", "installs", "recent"]).optional().default("rating"),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const RateMarketplaceItemSchema = z.object({
  score: z.number().int().min(1).max(5),
  reviewText: z.string().max(500).optional().default(""),
});
