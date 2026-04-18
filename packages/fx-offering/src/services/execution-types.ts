/**
 * Sprint 10 Agent Execution Types
 * Mirrors @foundry-x/shared agent.ts F53 types.
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
  | "market-summary"
  | "discovery-analysis";

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
    fileContents?: Record<string, string>;
    systemPromptOverride?: string;
  };
  constraints: AgentConstraintRule[];
}

export interface UIHint {
  layout: "card" | "tabs" | "accordion" | "flow" | "iframe";
  sections: Array<{
    type: "text" | "code" | "diff" | "chart" | "diagram" | "table" | "timeline";
    title: string;
    data: unknown;
    interactive?: boolean;
  }>;
  html?: string;
  actions?: Array<{
    type: "approve" | "reject" | "edit" | "expand";
    label: string;
    targetSection?: number;
  }>;
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
    uiHint?: UIHint;
  };
  tokensUsed: number;
  model: string;
  duration: number;
  reflection?: {
    score: number;
    confidence: number;
    reasoning: string;
    suggestions: string[];
    retryCount: number;
    history: Array<{
      iteration: number;
      score: number;
      confidence: number;
    }>;
  };
}

export type AgentRunnerType = "claude-api" | "openrouter" | "mcp" | "mock";

export interface AgentRunnerInfo {
  type: AgentRunnerType;
  available: boolean;
  model?: string;
  description: string;
}
