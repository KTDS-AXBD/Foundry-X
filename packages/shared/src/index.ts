export type {
  RepoMode,
  MarkerFile,
  ModuleInfo,
  RepoProfile,
  DocFile,
  DirNode,
  ProjectContext,
  ChangeStatus,
  ChangeEntry,
  SpecDelta,
  ChangesIndex,
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

// F274: Skill Metrics types (Sprint 103)
export type {
  SkillMetricSummary,
  SkillDetailMetrics,
  SkillVersionRecord,
  SkillExecutionRecord,
  SkillLineageNode,
  SkillAuditEntry,
} from './types.js';

// F275: Skill Registry types (Sprint 104)
export type {
  SkillSafetyGrade,
  SkillCategory,
  SkillSourceType,
  SkillStatus,
  SkillRegistryEntry,
  SkillSearchResult,
  SafetyCheckResult,
  SafetyViolation,
  SkillEnrichedView,
} from './types.js';

// F276: DERIVED 엔진 타입 (Sprint 105)
export type {
  DerivedPatternType,
  DerivedPatternStatus,
  DerivedReviewStatus,
  PipelineStage,
  DerivedPattern,
  DerivedPatternDetail,
  DerivedCandidate,
  DerivedCandidateDetail,
  DerivedReview,
  DerivedStats,
} from './types.js';

// F277: CAPTURED 엔진 타입 (Sprint 106)
export type {
  CapturedPatternStatus,
  CapturedWorkflowPattern,
  CapturedWorkflowPatternDetail,
  CapturedCandidate,
  CapturedCandidateDetail,
  CapturedReview,
  CapturedStats,
} from './types.js';

// F278: BD ROI 벤치마크 타입 (Sprint 107)
export type {
  RoiBenchmark,
  RoiBenchmarkDetail,
  SkillExecutionSummary,
  RoiByStage,
  SignalValuation,
  BdRoiSummary,
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

// Sprint 26: SSO types (F108)
export type {
  ServiceAccess,
  HubTokenPayload,
} from './sso.js';

// Sprint 30: postMessage protocol types (F124)
export type {
  FoundryToSubAppMessage,
  SubAppToFoundryMessage,
} from './sso.js';

// Sprint 43: Model Quality types (F143 UI)
export type {
  ModelQualityMetric,
  AgentModelCell,
  ModelQualityResponse,
  AgentModelMatrixResponse,
} from './web.js';

// Sprint 47: Plugin System types (F164)
export type {
  DataClassification,
  MaskingStrategy,
  AuditEventType,
  AuditOutputType,
  PluginManifest,
  PluginPermission,
  PluginHookDeclaration,
  PluginHookEvent,
  PluginSlotDeclaration,
  PluginSlotId,
  PluginStatus,
  PluginInstance,
} from './plugin.js';

// Sprint 59: Methodology Module types (F191)
export type {
  MethodologyModuleSummary,
  MethodologyRecommendationResult,
  MethodologySelectionRecord,
} from './methodology.js';

// Sprint 66: Discovery-X API types (F208)
export type {
  DiscoveryIngestPayload,
  CollectionSource,
  DiscoveryDataItem,
  DiscoveryStatus,
  DiscoveryConfig,
} from './discovery-x.js';

// Sprint 92: KG Ontology types (F255)
export type {
  KgNodeType,
  KgRelationType,
  ImpactLevel,
  KgNodeSummary,
  KgEdgeSummary,
} from './kg.js';

export {
  KG_NODE_TYPE_LABELS,
  KG_RELATION_TYPE_LABELS,
  KG_NODE_TYPES,
  KG_RELATION_TYPES,
} from './kg.js';

// F333: TaskState Machine (Sprint 148, Phase 14)
export {
  TaskState,
  TASK_STATES,
  TRANSITIONS,
  FEEDBACK_LOOP_TRIGGERS,
  isValidTransition,
  getAvailableTransitions,
} from './task-state.js';

export type {
  EventSource,
  TransitionRequest,
  TransitionResult,
  TaskStateRecord,
  TaskStateHistoryRecord,
} from './task-state.js';

// F334: TaskEvent + Event Bus types (Sprint 149, Phase 14)
export { createTaskEvent } from './task-event.js';

export type {
  EventSeverity,
  TaskEventSource,
  TaskEvent,
  TaskEventPayload,
  HookEventPayload,
  CIEventPayload,
  ReviewEventPayload,
  DiscriminatorEventPayload,
  SyncEventPayload,
  ManualEventPayload,
  PipelineEventPayload,
} from './task-event.js';

// F335: Orchestration Loop types (Sprint 150, Phase 14)
export { DEFAULT_CONVERGENCE } from './orchestration.js';

export type {
  LoopMode,
  ConvergenceCriteria,
  LoopRoundResult,
  LoopContextStatus,
  FeedbackLoopContext,
  LoopOutcome,
  AgentRole,
  AgentExecutionContext,
  AgentResult,
  AgentAdapter,
  AgentMetadata,
  LoopStartParams,
  ExecutionEventRecord,
} from './orchestration.js';

// F346+F347: Discovery Report types (Sprint 156, Phase 15)

// F342: Discovery UI/UX v2 types (Sprint 154, Phase 15)
export {
  INTENSITY_MATRIX,
  INTENSITY_LABELS,
  DISCOVERY_TYPE_NAMES_V2,
  DEFAULT_WEIGHTS,
  DEFAULT_PERSONAS,
  WEIGHT_AXES,
} from './discovery-v2.js';

export type {
  PersonaWeights,
  PersonaConfig,
  PersonaEval,
  DiscoveryReport,
  TeamReview,
  Intensity,
  DiscoveryTypeV2,
} from './discovery-v2.js';

// F351: Prototype Auto-Gen types (Sprint 158, Phase 16)
export {
  PROTOTYPE_TRANSITIONS,
  PROTOTYPE_TIMEOUTS,
  isValidPrototypeTransition,
  getAvailablePrototypeTransitions,
} from './prototype.js';

export type {
  PrototypeStatus,
  Prototype,
  PrototypeCreateRequest,
  PrototypeUpdateRequest,
  PrototypeFeedbackRequest,
} from './prototype.js';

// F346+F347+F348+F349: Discovery Report types (Sprint 156~157, Phase 15)
export type {
  ReferenceAnalysisData,
  MarketValidationData,
  CompetitiveLandscapeData,
  OpportunityIdeationData,
  OpportunityScoringData,
  CustomerPersonaData,
  BusinessModelData,
  PackagingData,
  PersonaEvalResultData,
  TeamReviewVote,
  ExecutiveSummaryData,
  HandoffCheckItem,
  DiscoveryReportResponse,
} from './discovery-report.js';

// F355: O-G-D Quality Loop types (Sprint 160, Phase 16)
export {
  OGD_THRESHOLD,
  OGD_MAX_ROUNDS,
} from './ogd.js';

export type {
  OgdStatus,
  OgdRound,
  OgdSummary,
  StructuredInstruction,
} from './ogd.js';

// F356: Prototype Feedback types (Sprint 160, Phase 16)
export type {
  FeedbackCategory,
  FeedbackStatus,
  PrototypeFeedback,
} from './prototype-feedback.js';

// F361+F362: Operational Metrics types (Sprint 164, Phase 17)
export type {
  RuleEffectiveness,
  RuleEffectivenessResponse,
  SkillReuseData,
  SkillReuseResponse,
  AgentUsageData,
  AgentUsageResponse,
  MetricsOverview,
} from './metrics.js';

// F357+F358: Guard Rail types (Sprint 161, Phase 17)
export type {
  DiagnosticResult,
  FailurePattern,
  GuardRailProposal,
  DetectPatternsRequest,
  DetectPatternsResult,
  GenerateRulesResult,
  DeployResult,
} from './guard-rail.js';

// F360: O-G-D Generic Interface (Sprint 163, Phase 17)
export { OGD_DEFAULT_MAX_ROUNDS, OGD_DEFAULT_MIN_SCORE } from './ogd-generic.js';

export type {
  OGDRequest,
  OGDResult,
  OGDRunRound,
  DomainAdapterConfig,
  DomainAdapterInterface,
  OGDRunStatus,
} from './ogd-generic.js';

// F398: 이벤트 카탈로그 8종 + D1EventBus (Sprint 185, Phase 20-B)
export type {
  EventServiceId,
  DomainEventType,
  DomainEventEnvelope,
  BizItemCreatedPayload,
  BizItemCreatedEvent,
  BizItemUpdatedPayload,
  BizItemUpdatedEvent,
  BizItemStageChangedPayload,
  BizItemStageChangedEvent,
  ValidationCompletedPayload,
  ValidationCompletedEvent,
  ValidationRejectedPayload,
  ValidationRejectedEvent,
  OfferingGeneratedPayload,
  OfferingGeneratedEvent,
  PrototypeCreatedPayload,
  PrototypeCreatedEvent,
  PipelineStepCompletedPayload,
  PipelineStepCompletedEvent,
  AnyDomainEvent,
} from './events/index.js';
export { D1EventBus } from './events/index.js';
// F406: 이벤트 유실 복구 타입 (Sprint 191)
export type { D1LikeDatabase, EventHandler, EventStatusSummary } from './events/index.js';
// F527: Agent Runtime (L2) 타입 (Sprint 280)
export type {
  ToolCategory,
  AgentSpec,
  AgentHooks,
  RuntimeContext,
  StopReason,
  RuntimeResult,
  LLMTokenUsage,
  LLMTokenSummary,
  InvocationContext,
  ModelCallContext,
  ModelCallResult,
  ToolCallContext,
  ToolCallResult,
  AnthropicMessage,
  AnthropicContent,
  AnthropicToolDef,
  // F528: L3 Orchestration 타입
  GraphNodeHandler,
  GraphNode,
  GraphEdge,
  GraphDefinition,
  GraphNodeInput,
  GraphNodeOutput,
  GraphExecutionContext,
  GraphRunResult,
  SteeringAction,
  SteeringResult,
  ConversationStrategy,
  ConversationManagerOptions,
} from './agent-runtime.js';

// F529: Agent Streaming (L1) 타입
export type {
  AgentStreamEventType,
  AgentStreamEvent,
  AgentStreamEventPayload,
  RunStartedPayload,
  RoundStartPayload,
  TextDeltaPayload,
  ToolCallPayload,
  ToolResultPayload,
  RoundEndPayload,
  RunCompletedPayload,
  RunFailedPayload,
  AgentRunMetricSummary,
  AgentStreamRequest,
} from './agent-streaming.js';

// F530: Meta Layer (L4) 타입 (Sprint 283)
export type {
  DiagnosticAxis,
  AxisScore,
  DiagnosticReport,
  ProposalType,
  ProposalStatus,
  ImprovementProposal,
  ModelComparison,
} from './agent-meta.js';

// F555: Central model ID constants
export {
  MODEL_OPUS,
  MODEL_SONNET,
  MODEL_HAIKU,
  OR_MODEL_OPUS,
  OR_MODEL_SONNET,
  OR_MODEL_HAIKU,
} from './model-defaults.js';

// F538: Discovery 도메인 공용 계약 타입 (cross-domain contract)
export type {
  ExecuteSkillInput,
  ArtifactListQuery,
  BdArtifact,
  SkillExecutionResult,
  TriggerShapingInput,
} from './discovery-contract.js';
