import { describe, it, expect, vi } from "vitest";
import mcpApp from "../routes/mcp.js";
import { createTestEnv } from "./helpers/test-app.js";

// Mock mcp-transport and mcp-runner (Worker 1 creates these)
vi.mock("../services/mcp-transport.js", () => ({
  createTransport: vi.fn(() => ({
    type: "sse",
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: () => true,
  })),
}));

vi.mock("../services/mcp-runner.js", () => ({
  McpRunner: vi.fn().mockImplementation(() => ({
    listTools: vi.fn().mockResolvedValue([
      { name: "foundry_code_review", description: "Review code" },
      { name: "foundry_code_gen", description: "Generate code" },
    ]),
  })),
}));

describe("MCP Routes", () => {
  it("GET /mcp/servers returns empty list initially", async () => {
    const env = createTestEnv();
    const res = await mcpApp.request("/mcp/servers", {}, env);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any[];
    expect(data).toEqual([]);
  });

  it("POST /mcp/servers creates a server", async () => {
    const env = createTestEnv();
    const res = await mcpApp.request(
      "/mcp/servers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Server",
          serverUrl: "http://localhost:3001/mcp",
          transportType: "sse",
        }),
      },
      env,
    );

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.name).toBe("Test Server");
    expect(data.serverUrl).toBe("http://localhost:3001/mcp");
    expect(data.status).toBe("inactive");
    expect(data.toolCount).toBe(0);

    // Verify it appears in list
    const listRes = await mcpApp.request("/mcp/servers", {}, env);
    const list = (await listRes.json()) as any[];
    expect(list).toHaveLength(1);
  });

  it("DELETE /mcp/servers/:id removes a server", async () => {
    const env = createTestEnv();

    // Create first
    const createRes = await mcpApp.request(
      "/mcp/servers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "To Delete",
          serverUrl: "http://localhost:3002/mcp",
        }),
      },
      env,
    );
    const created = (await createRes.json()) as any;

    // Delete
    const delRes = await mcpApp.request(
      `/mcp/servers/${created.id}`,
      { method: "DELETE" },
      env,
    );
    expect(delRes.status).toBe(200);
    const delData = (await delRes.json()) as any;
    expect(delData.deleted).toBe(true);

    // 404 on non-existent
    const notFound = await mcpApp.request(
      "/mcp/servers/non-existent",
      { method: "DELETE" },
      env,
    );
    expect(notFound.status).toBe(404);
  });

  it("POST /mcp/servers/:id/test connects and caches tools", async () => {
    const env = createTestEnv();

    // Create server
    const createRes = await mcpApp.request(
      "/mcp/servers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Testable",
          serverUrl: "http://localhost:3003/mcp",
        }),
      },
      env,
    );
    const created = (await createRes.json()) as any;

    // Test connection
    const testRes = await mcpApp.request(
      `/mcp/servers/${created.id}/test`,
      { method: "POST" },
      env,
    );
    expect(testRes.status).toBe(200);
    const testData = (await testRes.json()) as any;
    expect(testData.status).toBe("connected");
    expect(testData.toolCount).toBe(2);
    expect(testData.tools).toHaveLength(2);

    // Verify status updated to active
    const listRes = await mcpApp.request("/mcp/servers", {}, env);
    const list = (await listRes.json()) as any[];
    const updated = list.find((s: any) => s.id === created.id);
    expect(updated.status).toBe("active");
    expect(updated.toolCount).toBe(2);
  });

  it("GET /mcp/servers/:id/tools returns cached tools", async () => {
    const env = createTestEnv();

    // Create + test (populates cache)
    const createRes = await mcpApp.request(
      "/mcp/servers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Tools Server",
          serverUrl: "http://localhost:3004/mcp",
        }),
      },
      env,
    );
    const created = (await createRes.json()) as any;

    await mcpApp.request(`/mcp/servers/${created.id}/test`, { method: "POST" }, env);

    // Get tools (should be cached)
    const toolsRes = await mcpApp.request(
      `/mcp/servers/${created.id}/tools`,
      {},
      env,
    );
    expect(toolsRes.status).toBe(200);
    const toolsData = (await toolsRes.json()) as any;
    expect(toolsData.tools).toHaveLength(2);
    expect(toolsData.cached).toBe(true);

    // 404 for non-existent
    const notFound = await mcpApp.request("/mcp/servers/non-existent/tools", {}, env);
    expect(notFound.status).toBe(404);
  });
});
