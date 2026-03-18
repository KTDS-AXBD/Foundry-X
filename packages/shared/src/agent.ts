// ─── Agent Types (Sprint 5 Part A) ───

/** F30: Agent 통합 프로필 = Capability + Constraint + Activity */
export interface AgentProfile {
  id: string;
  name: string;
  capabilities: AgentCapability[];
  constraints: AgentConstraint[];
  activity?: AgentActivity;
}

/** AGENTS.md에서 파싱된 Agent 능력 (F34 Builder 생산) */
export interface AgentCapability {
  action: string;
  scope: string;
  tools: string[];
}

/** CONSTITUTION.md에서 파싱된 경계 규칙 (F33 Builder 생산) */
export interface AgentConstraint {
  tier: 'always' | 'ask' | 'never';
  rule: string;
  reason: string;
}

export type AgentStatus = 'idle' | 'running' | 'waiting' | 'completed' | 'error';

/** F30: Agent 실시간 활동 (런타임 데이터) */
export interface AgentActivity {
  status: AgentStatus;
  currentTask?: string;
  startedAt?: string;
  progress?: number;
  tokenUsed?: number;
}

// ─── Sprint 9: Orchestration Types (F50) ───

/** F50: 에이전트 Capability 상세 정의 (D1 저장용) */
export interface AgentCapabilityDefinition {
  id: string;
  agentId: string;
  name: string;
  description: string;
  tools: string[];
  allowedPaths: string[];
  maxConcurrency: number;
}

/** F50: Constraint 강제 규칙 */
export interface AgentConstraintRule {
  id: string;
  tier: 'always' | 'ask' | 'never';
  action: string;
  description: string;
  enforcementMode: 'block' | 'warn' | 'log';
}

/** F50: Constraint 검증 요청 */
export interface ConstraintCheckRequest {
  agentId: string;
  action: string;
  context?: Record<string, unknown>;
}

/** F50: Constraint 검증 결과 */
export interface ConstraintCheckResult {
  allowed: boolean;
  tier: 'always' | 'ask' | 'never';
  rule: AgentConstraintRule;
  reason: string;
}

/** F50: 에이전트 브랜치 기반 작업 */
export interface AgentTask {
  id: string;
  agentSessionId: string;
  branch: string;
  prNumber?: number;
  prStatus: 'draft' | 'open' | 'merged' | 'closed';
  sddVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/** F50: 에이전트 등록 정보 */
export interface AgentRegistration {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

// ─── Sprint 12: Generative UI Types (F60) ───

export type SectionType = 'text' | 'code' | 'diff' | 'chart' | 'diagram' | 'table' | 'timeline';

export interface UISection {
  type: SectionType;
  title: string;
  data: unknown;
  interactive?: boolean;
}

export interface UIAction {
  type: 'approve' | 'reject' | 'edit' | 'expand';
  label: string;
  targetSection?: number;
}

export interface UIHint {
  layout: 'card' | 'tabs' | 'accordion' | 'flow' | 'iframe';
  sections: UISection[];
  html?: string;
  actions?: UIAction[];
}

// ─── Sprint 10: Agent Execution Types (F53) ───

/** F53: 에이전트 실행 작업 유형 */
export type AgentTaskType =
  | 'code-review'
  | 'code-generation'
  | 'spec-analysis'
  | 'test-generation';

/** F53: 에이전트 실행 요청 */
export interface AgentExecutionRequest {
  taskId: string;
  agentId: string;
  taskType: AgentTaskType;
  context: {
    repoUrl: string;
    branch: string;
    targetFiles?: string[];
    spec?: {
      title: string;
      description: string;
      acceptanceCriteria: string[];
    };
    instructions?: string;
  };
  constraints: AgentConstraintRule[];
}

/** F53: 에이전트 실행 결과 */
export interface AgentExecutionResult {
  status: 'success' | 'partial' | 'failed';
  output: {
    analysis?: string;
    generatedCode?: Array<{
      path: string;
      content: string;
      action: 'create' | 'modify';
    }>;
    reviewComments?: Array<{
      file: string;
      line: number;
      comment: string;
      severity: 'error' | 'warning' | 'info';
    }>;
    uiHint?: UIHint;  // F60: Generative UI rendering hint
  };
  tokensUsed: number;
  model: string;
  duration: number;
}

/** F53: AgentRunner 타입 식별 */
export type AgentRunnerType = 'claude-api' | 'mcp' | 'mock';

/** F53: 사용 가능한 Runner 정보 */
export interface AgentRunnerInfo {
  type: AgentRunnerType;
  available: boolean;
  model?: string;
  description: string;
}

// ─── Token Management Types (F31) ───

/** F31: 개별 Token 사용 레코드 */
export interface TokenUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: string;
  agentId?: string;
}

/** F31: Token 사용량 집계 */
export interface TokenSummary {
  period: string;
  totalCost: number;
  byModel: Record<string, { tokens: number; cost: number }>;
  byAgent: Record<string, { tokens: number; cost: number }>;
}

/** F31: LLM Fallback 설정 */
export interface LLMFallbackConfig {
  providers: LLMProvider[];
  healthCheckInterval: number;
  maxRetries: number;
}

export interface LLMProvider {
  name: string;
  model: string;
  apiKeyEnv: string;
  priority: number;
  healthy: boolean;
}

// ─── Sprint 11: SSE Task Event Types (F55) ───

export interface TaskStartedData {
  taskId: string;
  agentId: string;
  taskType: AgentTaskType;
  runnerType: AgentRunnerType;
  startedAt: string;
}

export interface TaskCompletedData {
  taskId: string;
  agentId: string;
  status: 'success' | 'partial' | 'failed';
  tokensUsed: number;
  durationMs: number;
  resultSummary?: string;
  completedAt: string;
}

export type AgentTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

// ─── Sprint 12: MCP Server Types (F61) ───

/** F61: MCP 서버 정보 (Web 대시보드 표시용) */
export interface McpServerInfo {
  id: string;
  name: string;
  serverUrl: string;
  transportType: 'sse' | 'http';
  status: 'active' | 'inactive' | 'error';
  lastConnectedAt: string | null;
  errorMessage: string | null;
  toolCount: number;
  createdAt: string;
}

/** F61: MCP 서버 연결 테스트 결과 */
export interface McpTestResult {
  status: 'connected' | 'error';
  tools?: Array<{ name: string; description?: string }>;
  toolCount?: number;
  error?: string;
}

// ─── Sprint 13: MCP Sampling/Prompts Types (F64) ───

/** F64: MCP 프롬프트 정의 */
export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: McpPromptArgument[];
}

export interface McpPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

/** F64: MCP 프롬프트 실행 결과 메시지 */
export interface McpPromptMessage {
  role: 'user' | 'assistant';
  content:
    | { type: 'text'; text: string }
    | { type: 'resource'; resource: { uri: string; text: string; mimeType?: string } };
}

/** F64: MCP Sampling 요청 메시지 */
export interface McpSamplingMessage {
  role: 'user' | 'assistant';
  content: { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string };
}

/** F64: MCP Sampling 이력 레코드 */
export interface McpSamplingLog {
  id: string;
  serverId: string;
  model: string;
  maxTokens: number;
  tokensUsed: number | null;
  durationMs: number | null;
  status: string;
  createdAt: string;
}

// ─── Sprint 13: Agent PR Pipeline Types (F65) ───

/** F65: 에이전트 PR 상태 */
export type AgentPrStatus =
  | 'creating'
  | 'open'
  | 'reviewing'
  | 'approved'
  | 'merged'
  | 'closed'
  | 'needs_human';

/** F65: 에이전트 PR 레코드 */
export interface AgentPr {
  id: string;
  agentId: string;
  taskId: string;
  repo: string;
  branch: string;
  prNumber: number | null;
  prUrl: string | null;
  status: AgentPrStatus;
  reviewAgentId: string | null;
  reviewDecision: string | null;
  sddScore: number | null;
  qualityScore: number | null;
  securityIssues: string[];
  mergeStrategy: string;
  mergedAt: string | null;
  commitSha: string | null;
  createdAt: string;
  updatedAt: string;
}

/** F65: PR 리뷰 결과 */
export interface PrReviewResult {
  decision: 'approve' | 'request_changes' | 'comment';
  summary: string;
  comments: PrReviewComment[];
  sddScore: number;
  qualityScore: number;
  securityIssues: string[];
}

/** F65: PR 리뷰 코멘트 */
export interface PrReviewComment {
  file: string;
  line: number;
  comment: string;
  severity: 'error' | 'warning' | 'info';
}

/** F65: PR 파이프라인 설정 */
export interface PrPipelineConfig {
  autoMerge: boolean;
  requireHumanApproval: boolean;
  maxAutoMergePerDay: number;
  branchPrefix: string;
  mergeStrategy: 'squash' | 'merge' | 'rebase';
  sddScoreThreshold: number;
  qualityScoreThreshold: number;
}

// ─── Sprint 13: SSE PR Event Types (F65) ───

export interface PrCreatedData {
  prNumber: number;
  branch: string;
  agentId: string;
  taskId: string;
}

export interface PrReviewedData {
  prNumber: number;
  decision: 'approve' | 'request_changes' | 'comment';
  sddScore: number;
  reviewerAgentId: string;
}

export interface PrMergedData {
  prNumber: number;
  mergedAt: string;
  commitSha: string;
}

export interface PrReviewNeededData {
  prNumber: number;
  reason: string;
  blockers: string[];
}
