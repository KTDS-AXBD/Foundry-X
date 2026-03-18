import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpRunner } from "../services/mcp-runner.js";
import type { McpTransport, McpResponse } from "../services/mcp-adapter.js";
import type { AgentExecutionRequest } from "../services/execution-types.js";

// ─── Mock Transport ───

function createMockTransport(
  sendImpl?: (msg: unknown) => Promise<McpResponse>,
): McpTransport {
  return {
    type: "http",
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
    send: vi.fn().mockImplementation(
      sendImpl ??
        (() =>
          Promise.resolve({
            jsonrpc: "2.0" as const,
            result: {
              content: [{ type: "text", text: "Analysis result" }],
            },
            id: 1,
          })),
    ),
  };
}

const makeRequest = (
  overrides?: Partial<AgentExecutionRequest>,
): AgentExecutionRequest => ({
  taskId: "task-mcp-1",
  agentId: "agent-mcp",
  taskType: "code-review",
  context: {
    repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
    branch: "feat/mcp",
    targetFiles: ["src/index.ts"],
    spec: {
      title: "MCP Integration",
      description: "Implement MCP transport",
      acceptanceCriteria: ["Transport works"],
    },
  },
  constraints: [],
  ...overrides,
});

// ─── Tests ───

describe("McpRunner", () => {
  let transport: McpTransport;
  let runner: McpRunner;

  beforeEach(() => {
    transport = createMockTransport();
    runner = new McpRunner(transport, "foundry-x-server");
  });

  it("type is mcp", () => {
    expect(runner.type).toBe("mcp");
  });

  it("execute() sends tools/call and returns success", async () => {
    const result = await runner.execute(makeRequest());

    expect(result.status).toBe("success");
    expect(result.output.analysis).toBe("Analysis result");
    expect(result.model).toBe("mcp:foundry-x-server");
    expect(result.duration).toBeGreaterThanOrEqual(0);

    const sendCall = (transport.send as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(sendCall.method).toBe("tools/call");
    expect(sendCall.params.name).toBe("foundry_code_review");
    expect(sendCall.params.arguments.files).toEqual(["src/index.ts"]);
  });

  it("execute() returns failed for unknown taskType", async () => {
    const result = await runner.execute(
      makeRequest({ taskType: "unknown-type" as never }),
    );

    expect(result.status).toBe("failed");
    expect(result.output.analysis).toContain("Unknown taskType");
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("execute() returns failed on MCP error response", async () => {
    transport = createMockTransport(() =>
      Promise.resolve({
        jsonrpc: "2.0" as const,
        error: { code: -32601, message: "Method not found" },
        id: 1,
      }),
    );
    runner = new McpRunner(transport, "test-server");

    const result = await runner.execute(makeRequest());

    expect(result.status).toBe("failed");
    expect(result.output.analysis).toContain("MCP error [-32601]");
    expect(result.output.analysis).toContain("Method not found");
  });

  it("execute() returns failed on transport error", async () => {
    transport = createMockTransport(() =>
      Promise.reject(new Error("Connection refused")),
    );
    runner = new McpRunner(transport, "test-server");

    const result = await runner.execute(makeRequest());

    expect(result.status).toBe("failed");
    expect(result.output.analysis).toContain("MCP transport error");
    expect(result.output.analysis).toContain("Connection refused");
  });

  it("execute() builds correct args for spec-analysis", async () => {
    await runner.execute(
      makeRequest({
        taskType: "spec-analysis",
        context: {
          repoUrl: "https://github.com/test/repo",
          branch: "main",
          targetFiles: ["existing-spec.md"],
          spec: {
            title: "New Feature",
            description: "Something new",
            acceptanceCriteria: [],
          },
        },
      }),
    );

    const sendCall = (transport.send as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(sendCall.params.name).toBe("foundry_spec_analyze");
    expect(sendCall.params.arguments.newSpec.title).toBe("New Feature");
    expect(sendCall.params.arguments.existing).toEqual(["existing-spec.md"]);
  });

  it("listTools() returns tools from MCP server", async () => {
    transport = createMockTransport(() =>
      Promise.resolve({
        jsonrpc: "2.0" as const,
        result: {
          tools: [
            { name: "foundry_code_review", description: "Review code", inputSchema: {} },
          ],
        },
        id: 1,
      }),
    );
    runner = new McpRunner(transport, "test-server");

    const tools = await runner.listTools();

    expect(tools).toHaveLength(1);
    expect(tools[0]!.name).toBe("foundry_code_review");
  });

  it("listResources() returns resources from MCP server", async () => {
    transport = createMockTransport(() =>
      Promise.resolve({
        jsonrpc: "2.0" as const,
        result: {
          resources: [
            { uri: "file:///spec.md", name: "Spec", mimeType: "text/markdown" },
          ],
        },
        id: 1,
      }),
    );
    runner = new McpRunner(transport, "test-server");

    const resources = await runner.listResources();

    expect(resources).toHaveLength(1);
    expect(resources[0]!.uri).toBe("file:///spec.md");
  });

  it("isAvailable() returns true when tools exist", async () => {
    transport = createMockTransport(() =>
      Promise.resolve({
        jsonrpc: "2.0" as const,
        result: {
          tools: [{ name: "tool1", description: "A tool", inputSchema: {} }],
        },
        id: 1,
      }),
    );
    runner = new McpRunner(transport, "test-server");

    expect(await runner.isAvailable()).toBe(true);
  });

  it("isAvailable() returns false when no tools", async () => {
    transport = createMockTransport(() =>
      Promise.resolve({
        jsonrpc: "2.0" as const,
        result: { tools: [] },
        id: 1,
      }),
    );
    runner = new McpRunner(transport, "test-server");

    expect(await runner.isAvailable()).toBe(false);
  });

  it("supportsTaskType() checks TASK_TYPE_TO_MCP_TOOL", () => {
    expect(runner.supportsTaskType("code-review")).toBe(true);
    expect(runner.supportsTaskType("code-generation")).toBe(true);
    expect(runner.supportsTaskType("spec-analysis")).toBe(true);
    expect(runner.supportsTaskType("test-generation")).toBe(true);
    expect(runner.supportsTaskType("unknown")).toBe(false);
  });
});
