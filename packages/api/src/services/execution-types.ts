/**
 * Sprint 10 Agent Execution Types
 * Mirrors @foundry-x/shared agent.ts F53 types.
 * Will be replaced with direct import once shared/index.ts re-exports are updated.
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
  | "ontology-lookup";

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
  };
  constraints: AgentConstraintRule[];
}

/** F60: Generative UI rendering hint (mirrors shared/agent.ts UIHint) */
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
    uiHint?: UIHint;  // F60: Generative UI
  };
  tokensUsed: number;
  model: string;
  duration: number;
  reflection?: {             // F148: opt-in self-reflection metadata
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
