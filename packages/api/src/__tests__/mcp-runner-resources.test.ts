import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpRunner } from "../services/mcp-runner.js";
import type { McpTransport, McpResponse } from "../services/mcp-adapter.js";

function createMockTransport(
  sendImpl?: (msg: unknown) => Promise<McpResponse>,
): McpTransport {
  return {
    type: "http",
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
    send: vi.fn().mockImplementation(sendImpl ?? (() => Promise.resolve({ jsonrpc: "2.0" as const, result: {}, id: 1 }))),
    setNotificationHandler: vi.fn(),
  };
}

describe("McpRunner — Resources (F67)", () => {
  let transport: McpTransport;
  let runner: McpRunner;

  beforeEach(() => {
    transport = createMockTransport();
    runner = new McpRunner(transport, "test-server");
  });

  it("listResourceTemplates() returns templates from MCP server", async () => {
    transport = createMockTransport(() =>
      Promise.resolve({
        jsonrpc: "2.0" as const,
        result: {
          resourceTemplates: [
            { uriTemplate: "db://users/{id}", name: "User", description: "User by ID" },
          ],
        },
        id: 1,
      }),
    );
    runner = new McpRunner(transport, "test-server");

    const templates = await runner.listResourceTemplates();
    expect(templates).toHaveLength(1);
    expect(templates[0]!.uriTemplate).toBe("db://users/{id}");

    const sendCall = (transport.send as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(sendCall.method).toBe("resources/templates/list");
  });

  it("readResource() returns contents for a URI", async () => {
    transport = createMockTransport(() =>
      Promise.resolve({
        jsonrpc: "2.0" as const,
        result: {
          contents: [
            { uri: "file:///config.json", mimeType: "application/json", text: '{"key":"value"}' },
          ],
        },
        id: 1,
      }),
    );
    runner = new McpRunner(transport, "test-server");

    const contents = await runner.readResource("file:///config.json");
    expect(contents).toHaveLength(1);
    expect(contents[0]!.text).toBe('{"key":"value"}');

    const sendCall = (transport.send as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(sendCall.method).toBe("resources/read");
    expect(sendCall.params.uri).toBe("file:///config.json");
  });

  it("subscribeResource() sends subscribe and tracks subscription", async () => {
    await runner.subscribeResource("file:///spec.md");

    expect(runner.getSubscriptions().has("file:///spec.md")).toBe(true);

    const sendCall = (transport.send as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(sendCall.method).toBe("resources/subscribe");
    expect(sendCall.params.uri).toBe("file:///spec.md");
  });

  it("unsubscribeResource() sends unsubscribe and removes from tracking", async () => {
    await runner.subscribeResource("file:///spec.md");
    await runner.unsubscribeResource("file:///spec.md");

    expect(runner.getSubscriptions().has("file:///spec.md")).toBe(false);

    const calls = (transport.send as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[1]![0].method).toBe("resources/unsubscribe");
  });
});
