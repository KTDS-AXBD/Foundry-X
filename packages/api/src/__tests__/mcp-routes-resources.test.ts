import { describe, it, expect, vi, beforeEach } from "vitest";
import mcpApp from "../core/harness/routes/mcp.js";
import { createTestEnv } from "./helpers/test-app.js";

// Mock transport + runner for resource operations
const mockListResources = vi.fn().mockResolvedValue([]);
const mockListResourceTemplates = vi.fn().mockResolvedValue([]);
const mockReadResource = vi.fn().mockResolvedValue([]);
const mockSubscribeResource = vi.fn().mockResolvedValue(undefined);
const mockOnNotification = vi.fn();

vi.mock("../agent/services/mcp-transport.js", () => ({
  createTransport: vi.fn(() => ({
    type: "http",
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: () => true,
    send: vi.fn().mockResolvedValue({ jsonrpc: "2.0", result: {}, id: 1 }),
    setNotificationHandler: vi.fn(),
  })),
}));

vi.mock("../agent/services/mcp-runner.js", () => ({
  McpRunner: vi.fn().mockImplementation(() => ({
    listTools: vi.fn().mockResolvedValue([]),
    listResources: mockListResources,
    listResourceTemplates: mockListResourceTemplates,
    readResource: mockReadResource,
    subscribeResource: mockSubscribeResource,
    unsubscribeResource: vi.fn().mockResolvedValue(undefined),
    onNotification: mockOnNotification,
    listPrompts: vi.fn().mockResolvedValue([]),
    getPrompt: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("../services/sse-manager.js", () => ({
  SSEManager: vi.fn().mockImplementation(() => ({
    pushEvent: vi.fn(),
    subscribers: new Set(),
    dispose: vi.fn(),
    createStream: vi.fn(),
  })),
}));

describe("MCP Resource Routes (F67)", () => {
  let env: ReturnType<typeof createTestEnv>;
  let serverId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    env = createTestEnv();

    // Create a server first
    const createRes = await mcpApp.request(
      "/mcp/servers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Resource Test Server",
          serverUrl: "http://localhost:3001/mcp",
          transportType: "http",
        }),
      },
      env,
    );
    const created = (await createRes.json()) as { id: string };
    serverId = created.id;
  });

  it("GET /mcp/servers/:id/resources returns resource list", async () => {
    mockListResources.mockResolvedValueOnce([
      { uri: "file:///spec.md", name: "Spec", mimeType: "text/markdown" },
    ]);

    const res = await mcpApp.request(
      `/mcp/servers/${serverId}/resources`,
      {},
      env,
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { resources: unknown[] };
    expect(json.resources).toHaveLength(1);
  });

  it("GET /mcp/servers/:id/resources returns 404 for unknown server", async () => {
    const res = await mcpApp.request(
      "/mcp/servers/nonexistent/resources",
      {},
      env,
    );

    expect(res.status).toBe(404);
  });

  it("POST /mcp/servers/:id/resources/read returns contents", async () => {
    mockReadResource.mockResolvedValueOnce([
      { uri: "file:///config.json", text: '{"k":"v"}', mimeType: "application/json" },
    ]);

    const res = await mcpApp.request(
      `/mcp/servers/${serverId}/resources/read`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uri: "file:///config.json" }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { contents: unknown[] };
    expect(json.contents).toHaveLength(1);
  });

  it("POST /mcp/servers/:id/resources/subscribe returns subscribed", async () => {
    const res = await mcpApp.request(
      `/mcp/servers/${serverId}/resources/subscribe`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uri: "file:///spec.md" }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { subscribed: boolean; uri: string };
    expect(json.subscribed).toBe(true);
    expect(json.uri).toBe("file:///spec.md");
  });
});
