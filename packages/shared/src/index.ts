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
