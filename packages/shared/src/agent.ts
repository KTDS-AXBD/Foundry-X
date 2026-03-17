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
