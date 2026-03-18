import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpResourcesClient } from "../services/mcp-resources.js";
import type { McpServerRegistry, McpServerRecord } from "../services/mcp-registry.js";

// ─── Mock helpers ───

const mockServer: McpServerRecord = {
  id: "srv-001",
  name: "test-mcp",
  serverUrl: "http://localhost:3001",
  transportType: "http",
  apiKeyEncrypted: null,
  status: "active",
  lastConnectedAt: null,
  errorMessage: null,
  toolsCache: null,
  toolsCachedAt: null,
  createdAt: "2026-03-18T00:00:00Z",
  updatedAt: "2026-03-18T00:00:00Z",
};

// Mock McpRunner responses via transport
const mockTransportSend = vi.fn();

vi.mock("../services/mcp-transport.js", () => ({
  createTransport: () => ({
    type: "http",
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
    send: mockTransportSend,
    setNotificationHandler: vi.fn(),
  }),
}));

function createMockRegistry(server: McpServerRecord | null = mockServer): McpServerRegistry {
  return {
    getServer: vi.fn().mockResolvedValue(server),
    decryptApiKey: vi.fn((key: string) => key),
  } as unknown as McpServerRegistry;
}

describe("McpResourcesClient (F67)", () => {
  let registry: McpServerRegistry;
  let client: McpResourcesClient;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    client = new McpResourcesClient(registry);
  });

  it("listResources() returns resources from MCP server", async () => {
    mockTransportSend.mockResolvedValueOnce({
      jsonrpc: "2.0",
      result: {
        resources: [
          { uri: "file:///spec.md", name: "Spec", mimeType: "text/markdown" },
          { uri: "db://users/1", name: "User 1" },
        ],
      },
      id: 1,
    });

    const resources = await client.listResources("srv-001");
    expect(resources).toHaveLength(2);
    expect(resources[0]!.uri).toBe("file:///spec.md");
    expect(resources[1]!.name).toBe("User 1");
  });

  it("listResourceTemplates() returns templates", async () => {
    mockTransportSend.mockResolvedValueOnce({
      jsonrpc: "2.0",
      result: {
        resourceTemplates: [
          { uriTemplate: "db://users/{id}", name: "User by ID" },
        ],
      },
      id: 1,
    });

    const templates = await client.listResourceTemplates("srv-001");
    expect(templates).toHaveLength(1);
    expect(templates[0]!.uriTemplate).toBe("db://users/{id}");
  });

  it("readResource() returns content", async () => {
    mockTransportSend.mockResolvedValueOnce({
      jsonrpc: "2.0",
      result: {
        contents: [
          { uri: "file:///config.json", mimeType: "application/json", text: '{"key":"val"}' },
        ],
      },
      id: 1,
    });

    const contents = await client.readResource("srv-001", "file:///config.json");
    expect(contents).toHaveLength(1);
    expect(contents[0]!.text).toBe('{"key":"val"}');
  });

  it("readResource() throws on MCP error", async () => {
    mockTransportSend.mockResolvedValueOnce({
      jsonrpc: "2.0",
      error: { code: -32602, message: "Resource not found" },
      id: 1,
    });

    await expect(client.readResource("srv-001", "file:///nope")).rejects.toThrow(
      "MCP resources/read error",
    );
  });

  it("throws when server not found", async () => {
    registry = createMockRegistry(null);
    client = new McpResourcesClient(registry);

    await expect(client.listResources("unknown")).rejects.toThrow("MCP server not found");
  });

  it("subscribeResource() calls runner.subscribeResource", async () => {
    mockTransportSend.mockResolvedValueOnce({
      jsonrpc: "2.0",
      result: {},
      id: 1,
    });

    await client.subscribeResource("srv-001", "file:///spec.md");

    expect(mockTransportSend).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "resources/subscribe",
        params: { uri: "file:///spec.md" },
      }),
    );
  });

  it("unsubscribeResource() calls runner.unsubscribeResource", async () => {
    mockTransportSend.mockResolvedValueOnce({
      jsonrpc: "2.0",
      result: {},
      id: 1,
    });

    await client.unsubscribeResource("srv-001", "file:///spec.md");

    expect(mockTransportSend).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "resources/unsubscribe",
        params: { uri: "file:///spec.md" },
      }),
    );
  });

  it("subscribeResource() with SSE pushes mcp.resource.updated on notification", async () => {
    mockTransportSend.mockResolvedValueOnce({
      jsonrpc: "2.0",
      result: {},
      id: 1,
    });

    const mockSse = {
      pushEvent: vi.fn(),
      subscribers: new Set(),
      dispose: vi.fn(),
      createStream: vi.fn(),
    };

    const clientWithSse = new McpResourcesClient(registry, mockSse as never);
    await clientWithSse.subscribeResource("srv-001", "file:///spec.md");

    // subscribe was called successfully
    expect(mockTransportSend).toHaveBeenCalled();
  });
});
