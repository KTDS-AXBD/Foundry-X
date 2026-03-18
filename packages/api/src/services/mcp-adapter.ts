import type { AgentRunner } from "./agent-runner.js";

/**
 * MCP Transport 추상화 — 통신 방식 교체 가능
 * Sprint 11+에서 구현
 */
export interface McpTransport {
  type: "stdio" | "sse" | "http";
  connect(config: McpConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export interface McpConnectionConfig {
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpResource {
  uri: string;
  name: string;
  mimeType?: string;
}

/**
 * MCP AgentRunner 인터페이스 — AgentRunner + MCP 전용 메서드
 * Sprint 11+에서 구현
 */
export interface McpAgentRunner extends AgentRunner {
  readonly type: "mcp";
  listTools(): Promise<McpTool[]>;
  listResources(): Promise<McpResource[]>;
}
