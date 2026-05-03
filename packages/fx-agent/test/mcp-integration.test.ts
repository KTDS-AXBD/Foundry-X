import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentOrchestrator } from "../src/services/agent-orchestrator.js";
import { McpServerRegistry } from "../src/services/mcp-registry.js";
import { McpRunner } from "../src/services/mcp-runner.js";
import { SSEManager } from "../src/services/sse-manager.js";
import { createMockD1 } from "./helpers/mock-d1.js";
import type { AgentRunner } from "../src/services/agent-runner.js";
import type { McpTransport, McpResponse } from "../src/services/mcp-adapter.js";

// ─── Mock Transport ───

function createMockTransport(toolsResponse?: unknown[]): McpTransport {
  const tools = toolsResponse ?? [
    { name: "foundry_code_review", description: "Code review tool" },
    { name: "foundry_code_gen", description: "Code generation tool" },
  ];

  return {
    type: "http",
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
    send: vi.fn().mockImplementation(async (msg) => {
      if (msg.method === "tools/list") {
        return { jsonrpc: "2.0", id: msg.id, result: { tools } } as McpResponse;
      }
      if (msg.method === "tools/call") {
        return {
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            content: [{ type: "text", text: "[MCP] Task completed successfully" }],
          },
        } as McpResponse;
      }
      return { jsonrpc: "2.0", id: msg.id, result: {} } as McpResponse;
    }),
  };
}

function createMockRunner(): AgentRunner {
  return {
    type: "mock",
    execute: vi.fn().mockResolvedValue({
      status: "success",
      output: { analysis: "[Fallback] Mock runner used" },
      tokensUsed: 50,
      model: "mock",
      duration: 10,
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
    supportsTaskType: vi.fn().mockReturnValue(true),
  };
}

describe("MCP Integration (F61)", () => {
  let db: D1Database;
  let registry: McpServerRegistry;

  beforeEach(() => {
    db = createMockD1() as unknown as D1Database;
    registry = new McpServerRegistry(db);
  });

  it("selectRunner returns McpRunner when MCP server has matching tool", async () => {
    // 1. 서버 등록 + 도구 캐시
    const server = await registry.createServer({
      name: "test-mcp",
      serverUrl: "https://mcp.test/sse",
      transportType: "http",
    });
    await registry.updateStatus(server.id, "active");
    await registry.cacheTools(server.id, [
      { name: "foundry_code_review", description: "Review" },
    ]);

    // 2. Orchestrator with registry
    const orchestrator = new AgentOrchestrator(db, undefined, registry);
    const fallback = createMockRunner();

    // 3. selectRunner should return McpRunner
    const selected = await orchestrator.selectRunner("code-review", fallback);
    expect(selected.type).toBe("mcp");
  });

  it("selectRunner returns fallback when no MCP server matches", async () => {
    const orchestrator = new AgentOrchestrator(db, undefined, registry);
    const fallback = createMockRunner();

    const selected = await orchestrator.selectRunner("code-review", fallback);
    expect(selected.type).toBe("mock");
  });

  it("selectRunner returns fallback when registry is not provided", async () => {
    const orchestrator = new AgentOrchestrator(db);
    const fallback = createMockRunner();

    const selected = await orchestrator.selectRunner("code-review", fallback);
    expect(selected.type).toBe("mock");
  });

  it("McpRunner.execute returns failed on MCP error response", async () => {
    const errorTransport: McpTransport = {
      type: "http",
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockReturnValue(true),
      send: vi.fn().mockResolvedValue({
        jsonrpc: "2.0",
        id: "err-1",
        error: { code: -32600, message: "Invalid tool name" },
      } as McpResponse),
    };
    const runner = new McpRunner(errorTransport, "error-server");

    const result = await runner.execute({
      taskId: "task-err",
      agentId: "agent-1",
      taskType: "code-review",
      context: { repoUrl: "https://github.com/test/repo", branch: "main" },
      constraints: [],
    });

    expect(result.status).toBe("failed");
    expect(result.output.analysis).toContain("MCP error");
    expect(result.model).toBe("mcp:error-server");
  });

  it("McpRunner.listTools returns tool list from server", async () => {
    const transport = createMockTransport([
      { name: "foundry_code_review", description: "Review" },
      { name: "foundry_test_gen", description: "Test gen" },
    ]);
    const runner = new McpRunner(transport, "tools-server");

    const tools = await runner.listTools();
    expect(tools).toHaveLength(2);
    expect(tools[0]!.name).toBe("foundry_code_review");
    expect(tools[1]!.name).toBe("foundry_test_gen");
  });

  it("McpRunner.execute calls tools/call and returns result", async () => {
    const transport = createMockTransport();
    const runner = new McpRunner(transport, "test-server");

    const result = await runner.execute({
      taskId: "task-1",
      agentId: "agent-1",
      taskType: "code-review",
      context: {
        repoUrl: "https://github.com/test/repo",
        branch: "main",
      },
      constraints: [],
    });

    expect(result.status).toBe("success");
    expect(result.output.analysis).toContain("[MCP] Task completed");
    expect(result.model).toBe("mcp:test-server");
    expect(transport.send).toHaveBeenCalledWith(
      expect.objectContaining({ method: "tools/call" }),
    );
  });

  it("executeTask uses MCP runner when server is active + SSE events fire", async () => {
    // 서버 등록 + 캐시
    const server = await registry.createServer({
      name: "integrated-mcp",
      serverUrl: "https://mcp.test/sse",
      transportType: "http",
    });
    await registry.updateStatus(server.id, "active");
    await registry.cacheTools(server.id, [
      { name: "foundry_code_review", description: "Review" },
    ]);

    const sse = new SSEManager(db);
    const pushSpy = vi.spyOn(sse, "pushEvent");
    const orchestrator = new AgentOrchestrator(db, sse, registry);
    const fallback = createMockRunner();

    const result = await orchestrator.executeTask(
      "agent-mcp",
      "code-review",
      { repoUrl: "https://github.com/test/repo", branch: "main" },
      fallback,
    );

    // MCP runner가 선택되었으므로 model이 "mcp:" 접두사
    expect(result.model).toContain("mcp:");

    // SSE 이벤트 확인
    const startedCalls = pushSpy.mock.calls.filter(
      ([e]) => e.event === "agent.task.started",
    );
    expect(startedCalls.length).toBeGreaterThanOrEqual(1);
    expect(startedCalls[0]![0].data).toMatchObject({
      runnerType: "mcp",
    });

    sse.dispose();
  });
});
