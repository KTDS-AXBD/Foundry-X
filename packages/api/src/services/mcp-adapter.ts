import type { AgentRunner } from "./agent-runner.js";
import type { AgentTaskType } from "./execution-types.js";

/**
 * MCP Transport 추상화 — 통신 방식 교체 가능
 * Sprint 12 구현 예정: SseTransport (1순위), HttpTransport (2순위)
 */
export interface McpTransport {
  type: "stdio" | "sse" | "http";
  connect(config: McpConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  send(message: McpMessage): Promise<McpResponse>;
}

export interface McpConnectionConfig {
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
}

// ─── MCP Protocol Messages (1.0) ───

export interface McpMessage {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
  id?: string | number;
}

export interface McpResponse {
  jsonrpc: "2.0";
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  id?: string | number;
}

// ─── MCP Tool/Resource ───

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpResource {
  uri: string;
  name: string;
  mimeType?: string;
  description?: string;
}

/**
 * MCP AgentRunner 인터페이스 — AgentRunner + MCP 전용 메서드
 * Sprint 12 구현 예정
 */
export interface McpAgentRunner extends AgentRunner {
  readonly type: "mcp";
  listTools(): Promise<McpTool[]>;
  listResources(): Promise<McpResource[]>;
}

// ─── F58: taskType → MCP tool 매핑 ───

/**
 * AgentTaskType → MCP tool name 매핑 규칙
 *
 * | AgentTaskType     | MCP Tool Name        | MCP Input               |
 * |-------------------|----------------------|-------------------------|
 * | code-review       | foundry_code_review  | { files, spec }         |
 * | code-generation   | foundry_code_gen     | { spec, instructions }  |
 * | spec-analysis     | foundry_spec_analyze | { newSpec, existing }   |
 * | test-generation   | foundry_test_gen     | { files, spec }         |
 */
export const TASK_TYPE_TO_MCP_TOOL: Record<AgentTaskType, string> = {
  "code-review": "foundry_code_review",
  "code-generation": "foundry_code_gen",
  "spec-analysis": "foundry_spec_analyze",
  "test-generation": "foundry_test_gen",
};
