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
