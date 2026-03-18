export type {
  RepoMode,
  MarkerFile,
  ModuleInfo,
  RepoProfile,
  GenerateResult,
  HarnessIntegrity,
  IntegrityCheck,
  IntegrityLevel,
  SyncResult,
  SyncStatus,
  GapItem,
  Decision,
  PlumbResult,
  PlumbError,
  CommandLog,
  HealthScore,
  FoundryXConfig,
  AmbiguityDimension,
  AmbiguityScore,
} from './types.js';

export {
  calculateAmbiguity,
  GREENFIELD_WEIGHTS,
  BROWNFIELD_WEIGHTS,
} from './types.js';

// Web Dashboard types (Sprint 5 Part A)
export type {
  WikiPage,
  RequirementItem,
  TodoItem,
  Message,
  FreshnessReport,
  FreshnessItem,
} from './web.js';

// Agent types (Sprint 5 Part A)
export type {
  AgentProfile,
  AgentCapability,
  AgentConstraint,
  AgentStatus,
  AgentActivity,
  TokenUsage,
  TokenSummary,
  LLMFallbackConfig,
  LLMProvider,
  SectionType,
  UISection,
  UIAction,
  UIHint,
} from './agent.js';

// Sprint 13: MCP Sampling/Prompts types (F64)
export type {
  McpPrompt,
  McpPromptArgument,
  McpPromptMessage,
  McpSamplingMessage,
  McpSamplingLog,
} from './agent.js';

// Sprint 13: Agent PR Pipeline types (F65)
export type {
  AgentPrStatus,
  AgentPr,
  PrReviewResult,
  PrReviewComment,
  PrPipelineConfig,
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentRunnerType,
  AgentRunnerInfo,
  AgentTaskType,
} from './agent.js';

// Sprint 14: MCP Resources types (F67)
export type {
  McpResource,
  McpResourceTemplate,
  McpResourceContent,
  McpResourceSubscription,
  McpResourceUpdatedData,
} from './agent.js';

// Sprint 14: Merge Queue types (F68)
export type {
  MergeQueueStatus,
  MergeQueueEntry,
  ConflictPair,
  ConflictReport,
  ParallelExecutionStatus,
  ParallelExecution,
  ParallelExecutionResult,
  ParallelPrResult,
} from './agent.js';

// Sprint 15: PlannerAgent types (F70)
export type {
  AgentPlanStatus,
  ProposedStep,
  AgentPlan,
  PlanCreatedData,
  PlanApprovedData,
  PlanRejectedData,
} from './agent.js';

// Sprint 15: Agent Inbox types (F71)
export type {
  MessageType,
  AgentMessage,
  MessageReceivedData,
} from './agent.js';

// Sprint 15: Worktree types (F72)
export type {
  WorktreeInfo,
} from './agent.js';

// AI Foundry Integration types (AIF-REQ-026)
export type {
  AifMcpAdapterResponse,
  AifMcpTool,
  AifPolicyEvalResult,
} from './agent.js';
