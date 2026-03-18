import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpRunner } from "../services/mcp-runner.js";
import type { McpTransport, McpResponse } from "../services/mcp-adapter.js";

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
            result: {},
            id: 1,
          })),
    ),
  };
}

describe("McpRunner — Prompts (F64)", () => {
  let transport: McpTransport;
  let runner: McpRunner;

  beforeEach(() => {
    transport = createMockTransport();
    runner = new McpRunner(transport, "test-server");
  });

  it("listPrompts() returns prompts from MCP server", async () => {
    transport = createMockTransport(() =>
      Promise.resolve({
        jsonrpc: "2.0" as const,
        result: {
          prompts: [
            {
              name: "code-review",
              description: "Review code for issues",
              arguments: [{ name: "language", required: true }],
            },
            { name: "summarize", description: "Summarize text" },
          ],
        },
        id: 1,
      }),
    );
    runner = new McpRunner(transport, "test-server");

    const prompts = await runner.listPrompts();

    expect(prompts).toHaveLength(2);
    expect(prompts[0]!.name).toBe("code-review");
    expect(prompts[0]!.arguments).toHaveLength(1);
    expect(prompts[1]!.name).toBe("summarize");
  });

  it("listPrompts() returns empty array on MCP error", async () => {
    transport = createMockTransport(() =>
      Promise.resolve({
        jsonrpc: "2.0" as const,
        error: { code: -32601, message: "Method not found" },
        id: 1,
      }),
    );
    runner = new McpRunner(transport, "test-server");

    const prompts = await runner.listPrompts();

    expect(prompts).toEqual([]);
  });

  it("getPrompt() returns messages for a prompt", async () => {
    transport = createMockTransport(() =>
      Promise.resolve({
        jsonrpc: "2.0" as const,
        result: {
          messages: [
            { role: "user", content: { type: "text", text: "Review this code" } },
            { role: "assistant", content: { type: "text", text: "I'll review it." } },
          ],
        },
        id: 1,
      }),
    );
    runner = new McpRunner(transport, "test-server");

    const messages = await runner.getPrompt("code-review");

    expect(messages).toHaveLength(2);
    expect(messages[0]!.role).toBe("user");
    expect(messages[1]!.role).toBe("assistant");

    const sendCall = (transport.send as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(sendCall.method).toBe("prompts/get");
    expect(sendCall.params.name).toBe("code-review");
  });

  it("getPrompt() passes arguments correctly", async () => {
    transport = createMockTransport(() =>
      Promise.resolve({
        jsonrpc: "2.0" as const,
        result: {
          messages: [
            { role: "user", content: { type: "text", text: "Review TypeScript code" } },
          ],
        },
        id: 1,
      }),
    );
    runner = new McpRunner(transport, "test-server");

    await runner.getPrompt("code-review", { language: "typescript" });

    const sendCall = (transport.send as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(sendCall.params.arguments).toEqual({ language: "typescript" });
  });

  it("getPrompt() throws on MCP error", async () => {
    transport = createMockTransport(() =>
      Promise.resolve({
        jsonrpc: "2.0" as const,
        error: { code: -32602, message: "Prompt not found" },
        id: 1,
      }),
    );
    runner = new McpRunner(transport, "test-server");

    await expect(runner.getPrompt("non-existent")).rejects.toThrow(
      "MCP prompts/get error [-32602]",
    );
  });
});
