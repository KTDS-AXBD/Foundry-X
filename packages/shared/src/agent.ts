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

// ─── Sprint 14: MCP Resources Types (F67) ───

/** F67: MCP 리소스 메타데이터 */
export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/** F67: MCP 리소스 템플릿 (동적 URI) */
export interface McpResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/** F67: MCP 리소스 내용 */
export interface McpResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

/** F67: MCP 리소스 구독 정보 */
export interface McpResourceSubscription {
  serverId: string;
  uri: string;
  subscribedAt: string;
  lastUpdated?: string;
}

// ─── Sprint 14: SSE MCP Resource Event (F67) ───

export interface McpResourceUpdatedData {
  serverId: string;
  uri: string;
  timestamp: string;
}

// ─── Sprint 14: Merge Queue Types (F68) ───

/** F68: Merge Queue 상태 */
export type MergeQueueStatus = 'queued' | 'merging' | 'merged' | 'conflict' | 'failed';

/** F68: Merge Queue 엔트리 */
export interface MergeQueueEntry {
  id: string;
  prRecordId: string;
  prNumber: number;
  agentId: string;
  priority: number;
  position: number;
  modifiedFiles: string[];
  status: MergeQueueStatus;
  conflictsWith: string[];
  rebaseAttempted: boolean;
  rebaseSucceeded: boolean;
  createdAt: string;
  mergedAt: string | null;
}

/** F68: 충돌 PR 쌍 */
export interface ConflictPair {
  entryA: string;
  entryB: string;
  files: string[];
}

/** F68: 충돌 분석 리포트 */
export interface ConflictReport {
  conflicting: ConflictPair[];
  suggestedOrder: string[];
  autoResolvable: boolean;
}

// ─── Sprint 14: Parallel Execution Types (F68) ───

/** F68: 병렬 실행 상태 */
export type ParallelExecutionStatus = 'running' | 'completed' | 'partially_failed';

/** F68: 병렬 실행 레코드 */
export interface ParallelExecution {
  id: string;
  taskIds: string[];
  agentIds: string[];
  status: ParallelExecutionStatus;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  durationMs: number | null;
  createdAt: string;
  completedAt: string | null;
}

/** F68: 병렬 실행 결과 */
export interface ParallelExecutionResult {
  executionId: string;
  results: Array<{
    agentId: string;
    taskId: string;
    status: 'success' | 'failed';
    result?: AgentExecutionResult;
    error?: string;
  }>;
  durationMs: number;
}

/** F68: 병렬 실행 + PR 결과 */
export interface ParallelPrResult extends ParallelExecutionResult {
  prs: Array<{
    agentId: string;
    prNumber: number | null;
    prUrl: string | null;
    queuePosition: number;
  }>;
  conflicts: ConflictReport;
}

// ─── Sprint 14: SSE Queue Event Types (F68) ───

export interface QueueUpdatedData {
  queue: Array<{
    id: string;
    prNumber: number;
    agentId: string;
    position: number;
    status: string;
  }>;
  totalPrs: number;
}

export interface QueueConflictData {
  conflicts: ConflictReport;
}

export interface QueueMergedData {
  entryId: string;
  prNumber: number;
  position: number;
  commitSha: string;
}

export interface QueueRebaseData {
  prNumber: number;
  success: boolean;
  files: string[];
}

// ─── Sprint 15: PlannerAgent Types (F70) ───

export type AgentPlanStatus =
  | 'analyzing'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'modified'
  | 'executing'
  | 'completed'
  | 'failed';

export interface ProposedStep {
  description: string;
  type: 'create' | 'modify' | 'delete' | 'test' | 'external_tool';
  targetFile?: string;
  estimatedLines?: number;
  externalTool?: {
    serverId: string;
    toolName: string;
    arguments?: Record<string, unknown>;
  };
}

export interface AgentPlan {
  id: string;
  taskId: string;
  agentId: string;
  codebaseAnalysis: string;
  proposedSteps: ProposedStep[];
  estimatedFiles: number;
  risks: string[];
  estimatedTokens: number;
  status: AgentPlanStatus;
  humanFeedback?: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  executionStatus?: 'executing' | 'completed' | 'failed';
  executionStartedAt?: string;
  executionCompletedAt?: string;
  executionResult?: AgentExecutionResult;
  executionError?: string;
}

// Sprint 17 F82: Plan Execution SSE Events
export interface PlanWaitingData {
  planId: string; taskId: string; agentId: string;
  stepsCount: number; timeoutMs: number;
}
export interface PlanExecutingData { planId: string; startedAt: string; }
export interface PlanCompletedSSEData {
  planId: string; completedAt: string;
  tokensUsed: number; duration: number; status: 'success' | 'partial' | 'failed';
}
export interface PlanFailedData { planId: string; failedAt: string; error: string; }

// ─── Sprint 15: Agent Inbox Types (F71) ───

export type MessageType =
  | 'task_assign'
  | 'task_result'
  | 'task_question'
  | 'task_feedback'
  | 'status_update';

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: MessageType;
  subject: string;
  payload: Record<string, unknown>;
  acknowledged: boolean;
  parentMessageId?: string;
  createdAt: string;
  acknowledgedAt?: string;
}

// ─── Sprint 15: Worktree Types (F72) ───

export interface WorktreeInfo {
  id: string;
  agentId: string;
  branchName: string;
  worktreePath: string;
  baseBranch: string;
  status: 'active' | 'completed' | 'failed' | 'cleaned';
  createdAt: string;
  cleanedAt?: string;
}

// ─── Sprint 15: SSE Event Types (F70+F71) ───

export interface PlanCreatedData {
  planId: string;
  taskId: string;
  agentId: string;
  stepsCount: number;
  estimatedTokens: number;
}

export interface PlanApprovedData {
  planId: string;
  approvedBy: string;
}

export interface PlanRejectedData {
  planId: string;
  reason?: string;
}

export interface MessageReceivedData {
  messageId: string;
  fromAgentId: string;
  toAgentId: string;
  type: MessageType;
  subject: string;
}

// ─── AI Foundry Integration Types (AIF-REQ-026 Phase 1) ───

/** AI Foundry MCP Adapter 응답 — Skill → MCP 도구 변환 결과 */
export interface AifMcpAdapterResponse {
  protocolVersion: string;
  capabilities: { tools: { listChanged: boolean } };
  serverInfo: { name: string; version: string };
  instructions: string;
  name: string;
  version: string;
  description: string;
  tools: AifMcpTool[];
  metadata: {
    skillId: string;
    domain: string;
    trustLevel: string;
    trustScore: number;
    generatedAt: string;
  };
}

/** AI Foundry MCP 도구 정의 */
export interface AifMcpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  annotations?: {
    title: string;
    readOnlyHint: boolean;
    openWorldHint: boolean;
  };
}

/** AI Foundry 정책 평가 결과 (tools/call 응답) */
export interface AifPolicyEvalResult {
  result: string;
  confidence: number;
  reasoning: string;
  policyCode: string;
  provider: string;
  model: string;
  latencyMs: number;
}
