/**
 * Sprint 10 Agent Execution Types
 * Mirrors @foundry-x/shared agent.ts F53 types.
 * Will be replaced with direct import once shared/index.ts re-exports are updated.
 */

export type AgentTaskType =
  | "code-review"
  | "code-generation"
  | "spec-analysis"
  | "test-generation";

export interface AgentConstraintRule {
  id: string;
  tier: "always" | "ask" | "never";
  action: string;
  description: string;
  enforcementMode: "block" | "warn" | "log";
}

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

export interface AgentExecutionResult {
  status: "success" | "partial" | "failed";
  output: {
    analysis?: string;
    generatedCode?: Array<{
      path: string;
      content: string;
      action: "create" | "modify";
    }>;
    reviewComments?: Array<{
      file: string;
      line: number;
      comment: string;
      severity: "error" | "warning" | "info";
    }>;
  };
  tokensUsed: number;
  model: string;
  duration: number;
}

export type AgentRunnerType = "claude-api" | "mcp" | "mock";

export interface AgentRunnerInfo {
  type: AgentRunnerType;
  available: boolean;
  model?: string;
  description: string;
}
