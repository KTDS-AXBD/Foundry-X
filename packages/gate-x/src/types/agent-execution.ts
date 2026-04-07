/**
 * Gate-X 로컬 agent execution 타입 (core 의존 제거용 복사본)
 * 원본: packages/api/src/core/agent/services/execution-types.ts
 */

export type AgentTaskType =
  | "code-review"
  | "code-generation"
  | "spec-analysis"
  | "test-generation"
  | "security-review"
  | "qa-testing"
  | "infra-analysis"
  | "policy-evaluation"
  | "skill-query"
  | "ontology-lookup"
  | "bmc-generation"
  | "bmc-insight"
  | "market-summary";

export interface AgentExecutionRequest {
  taskType: AgentTaskType;
  input: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface AgentExecutionResult {
  taskType: AgentTaskType;
  success: boolean;
  output: Record<string, unknown>;
  error?: string;
  durationMs: number;
}
