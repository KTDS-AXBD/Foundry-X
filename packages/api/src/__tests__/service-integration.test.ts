import { describe, it, expect, beforeEach } from "vitest";
import { McpServerRegistry } from "../core/agent/services/mcp-registry.js";
import { createMockD1 } from "./helpers/mock-d1.js";

describe("Service Integration (F63)", () => {
  let db: D1Database;
  let registry: McpServerRegistry;

  beforeEach(() => {
    db = createMockD1() as unknown as D1Database;
    registry = new McpServerRegistry(db);
  });

  it("MCP server CRUD lifecycle", async () => {
    // Create
    const server = await registry.createServer({
      name: "lifecycle-test",
      serverUrl: "https://mcp.example.com/sse",
      transportType: "sse",
      apiKey: "sk-test-key",
    });
    expect(server.name).toBe("lifecycle-test");
    expect(server.status).toBe("inactive");

    // Read
    const fetched = await registry.getServer(server.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.serverUrl).toBe("https://mcp.example.com/sse");
    expect(fetched!.apiKeyEncrypted).not.toBeNull(); // encrypted

    // List
    const servers = await registry.listServers();
    expect(servers).toHaveLength(1);

    // Delete
    const deleted = await registry.deleteServer(server.id);
    expect(deleted).toBe(true);

    const afterDelete = await registry.listServers();
    expect(afterDelete).toHaveLength(0);
  });

  it("MCP server status update + tools cache", async () => {
    const server = await registry.createServer({
      name: "status-test",
      serverUrl: "https://mcp.test/http",
      transportType: "http",
    });

    // Update status to active
    await registry.updateStatus(server.id, "active");
    let updated = await registry.getServer(server.id);
    expect(updated!.status).toBe("active");
    expect(updated!.lastConnectedAt).not.toBeNull();

    // Cache tools
    const tools = [
      { name: "foundry_code_review", description: "Review" },
      { name: "foundry_code_gen", description: "Generate" },
    ];
    await registry.cacheTools(server.id, tools);
    updated = await registry.getServer(server.id);
    expect(updated!.toolsCache).not.toBeNull();
    expect(JSON.parse(updated!.toolsCache!)).toHaveLength(2);

    // Update status to error
    await registry.updateStatus(server.id, "error", "Connection refused");
    updated = await registry.getServer(server.id);
    expect(updated!.status).toBe("error");
    expect(updated!.errorMessage).toBe("Connection refused");
  });

  it("findServerForTool returns correct server", async () => {
    // Create 2 servers with different tools
    const server1 = await registry.createServer({
      name: "review-server",
      serverUrl: "https://review.mcp.test",
      transportType: "http",
    });
    await registry.updateStatus(server1.id, "active");
    await registry.cacheTools(server1.id, [
      { name: "foundry_code_review", description: "Review" },
    ]);

    const server2 = await registry.createServer({
      name: "gen-server",
      serverUrl: "https://gen.mcp.test",
      transportType: "http",
    });
    await registry.updateStatus(server2.id, "active");
    await registry.cacheTools(server2.id, [
      { name: "foundry_code_gen", description: "Generate" },
    ]);

    // Find by tool name
    const reviewServer = await registry.findServerForTool("foundry_code_review");
    expect(reviewServer).not.toBeNull();
    expect(reviewServer!.name).toBe("review-server");

    const genServer = await registry.findServerForTool("foundry_code_gen");
    expect(genServer).not.toBeNull();
    expect(genServer!.name).toBe("gen-server");

    // Non-existent tool
    const notFound = await registry.findServerForTool("nonexistent_tool");
    expect(notFound).toBeNull();
  });
});
