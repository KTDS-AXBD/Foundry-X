import { describe, it, expect } from "vitest";
import { McpServerRegistry } from "../src/services/mcp-registry.js";
import { createMockD1 } from "./helpers/mock-d1.js";

function createRegistry() {
  const db = createMockD1() as unknown as D1Database;
  return { registry: new McpServerRegistry(db), db };
}

describe("McpServerRegistry", () => {
  it("listServers returns empty array initially", async () => {
    const { registry } = createRegistry();
    const servers = await registry.listServers();
    expect(servers).toEqual([]);
  });

  it("createServer + getServer round-trip", async () => {
    const { registry } = createRegistry();
    const created = await registry.createServer({
      name: "Test MCP",
      serverUrl: "http://localhost:3001/mcp",
      transportType: "sse",
    });

    expect(created.name).toBe("Test MCP");
    expect(created.serverUrl).toBe("http://localhost:3001/mcp");
    expect(created.transportType).toBe("sse");
    expect(created.status).toBe("inactive");

    const fetched = await registry.getServer(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
  });

  it("deleteServer removes the server", async () => {
    const { registry } = createRegistry();
    const created = await registry.createServer({
      name: "To Delete",
      serverUrl: "http://localhost:3002/mcp",
    });

    const deleted = await registry.deleteServer(created.id);
    expect(deleted).toBe(true);

    const fetched = await registry.getServer(created.id);
    expect(fetched).toBeNull();

    // deleting non-existent returns false
    const again = await registry.deleteServer("non-existent-id");
    expect(again).toBe(false);
  });

  it("findServerForTool locates active server with matching tool", async () => {
    const { registry } = createRegistry();
    const server = await registry.createServer({
      name: "Tool Server",
      serverUrl: "http://localhost:3003/mcp",
    });

    // Initially inactive — should not find
    await registry.cacheTools(server.id, [
      { name: "foundry_code_review", description: "Review code" },
    ]);
    let found = await registry.findServerForTool("foundry_code_review");
    expect(found).toBeNull(); // inactive

    // Activate + cache
    await registry.updateStatus(server.id, "active");
    found = await registry.findServerForTool("foundry_code_review");
    expect(found).not.toBeNull();
    expect(found!.id).toBe(server.id);

    // Non-existent tool
    found = await registry.findServerForTool("no_such_tool");
    expect(found).toBeNull();
  });
});
