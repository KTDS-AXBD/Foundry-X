// ─── F527: Agent Runtime (L2) 공유 타입 (Sprint 280) ───
// 주의: Zod 의존 없음 — 순수 TS 타입만. ToolDefinition은 API 패키지에 있음.

export type ToolCategory = "builtin" | "mcp" | "agent" | "custom";

// F-L2-2: AgentSpec YAML 스키마
export interface AgentSpec {
  name: string;
  version?: string;
  model: string;
  systemPrompt: string;
  tools: string[];
  steering?: {
    rules: string[];
  };
  evaluation?: {
    criteria: string[];
    minScore?: number;
  };
  constraints?: {
    maxTokens?: number;
    maxRounds?: number;
    timeoutMs?: number;
  };
  metadata?: Record<string, unknown>;
}

// F-L2-5: LLM 호출별 토큰 사용량 (Anthropic API 응답 포맷)
export interface LLMTokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface LLMTokenSummary extends LLMTokenUsage {
  totalTokens: number;
  estimatedCostUsd?: number;
}

// F-L2-4: 훅 타입
export interface AgentHooks {
  beforeInvocation?: (ctx: InvocationContext) => Promise<void>;
  afterInvocation?: (ctx: InvocationContext, result: RuntimeResult) => Promise<void>;
  beforeModel?: (ctx: ModelCallContext) => Promise<ModelCallContext | void>;
  afterModel?: (ctx: ModelCallContext, result: ModelCallResult) => Promise<void>;
  beforeTool?: (ctx: ToolCallContext) => Promise<ToolCallContext | "cancel" | void>;
  afterTool?: (ctx: ToolCallContext, result: ToolCallResult) => Promise<ToolCallResult | void>;
}

// F-L2-3: 런타임 컨텍스트
export interface RuntimeContext {
  agentId: string;
  sessionId: string;
  apiKey: string;
  db?: unknown;
  hooks?: AgentHooks;
}

export type StopReason = "end_turn" | "tool_use" | "max_tokens" | "cancelled" | "max_rounds";

export interface RuntimeResult {
  output: string;
  stopReason: StopReason;
  rounds: number;
  tokenUsage: LLMTokenSummary;
}

// 훅 컨텍스트 타입
export interface InvocationContext {
  agentId: string;
  sessionId: string;
  spec: AgentSpec;
  input: string;
}

export interface ModelCallContext {
  messages: AnthropicMessage[];
  systemPrompt: string;
  model: string;
  tools?: AnthropicToolDef[];
}

export interface ModelCallResult {
  content: AnthropicContent[];
  stopReason: string;
  usage: LLMTokenUsage;
}

export interface ToolCallContext {
  toolName: string;
  toolInput: unknown;
  toolUseId: string;
}

export interface ToolCallResult {
  content: string;
  isError?: boolean;
}

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContent[];
}

export interface AnthropicContent {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

export interface AnthropicToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

// ─── F528: L3 Orchestration 타입 ───

export type GraphNodeHandler = (
  input: GraphNodeInput,
  ctx: GraphExecutionContext,
) => Promise<GraphNodeOutput>;

export interface GraphNode {
  id: string;
  handler: GraphNodeHandler;
  agentId?: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  from: string;
  to: string;
  condition?: (output: GraphNodeOutput, ctx: GraphExecutionContext) => boolean;
}

export interface GraphDefinition {
  nodes: GraphNode[];
  edges: GraphEdge[];
  entryPoint: string;
  maxExecutions?: number;
}

export interface GraphNodeInput {
  nodeId: string;
  data: unknown;
  executionId: string;
}

export interface GraphNodeOutput {
  nodeId: string;
  data: unknown;
  metadata?: Record<string, unknown>;
}

export interface GraphExecutionContext {
  executionId: string;
  sessionId: string;
  apiKey: string;
  db?: unknown;
  nodeOutputs: Map<string, GraphNodeOutput>;
  executionCount: Map<string, number>;
}

export interface GraphRunResult {
  executionId: string;
  finalOutput: GraphNodeOutput;
  nodeOutputs: Record<string, GraphNodeOutput>;
  totalExecutions: number;
  durationMs: number;
}

export type SteeringAction = "proceed" | "guide" | "interrupt";

export interface SteeringResult {
  action: SteeringAction;
  message?: string;
}

export type ConversationStrategy = "sliding-window" | "summarizing";

export interface ConversationManagerOptions {
  strategy: ConversationStrategy;
  maxMessages?: number;
  summaryModel?: string;
}
