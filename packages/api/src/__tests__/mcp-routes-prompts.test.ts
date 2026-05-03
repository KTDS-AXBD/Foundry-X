import { describe, it, expect, vi } from "vitest";
import mcpApp from "../core/harness/routes/mcp.js";
import { createTestEnv } from "./helpers/test-app.js";

// Mock transport + runner for prompts/sampling
vi.mock("../services/agent/mcp-transport.js", () => ({
  createTransport: vi.fn(() => ({
    type: "http",
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: () => true,
    send: vi.fn(),
  })),
}));

vi.mock("../services/agent/mcp-runner.js", () => ({
  McpRunner: vi.fn().mockImplementation(() => ({
    listTools: vi.fn().mockResolvedValue([]),
    listPrompts: vi.fn().mockResolvedValue([
      { name: "summarize", description: "Summarize text" },
      { name: "review", description: "Code review", arguments: [{ name: "lang" }] },
    ]),
    getPrompt: vi.fn().mockResolvedValue([
      { role: "user", content: { type: "text", text: "Summarize this" } },
      { role: "assistant", content: { type: "text", text: "Here is the summary" } },
    ]),
  })),
}));

vi.mock("../services/llm.js", () => ({
  LLMService: vi.fn().mockImplementation(() => ({
    generate: vi.fn().mockResolvedValue({
      content: "LLM response text",
      model: "claude-haiku-4-5",
      tokensUsed: 50,
    }),
  })),
}));

// Helper: create a server and return its id
async function createServer(env: ReturnType<typeof createTestEnv>) {
  const res = await mcpApp.request(
    "/mcp/servers",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Prompt Server",
        serverUrl: "http://localhost:4000/mcp",
        transportType: "http",
      }),
    },
    env,
  );
  const data = (await res.json()) as { id: string };
  return data.id;
}

describe("MCP Routes — Prompts & Sampling (F64)", () => {
  it("GET /mcp/servers/:id/prompts lists prompts", async () => {
    const env = createTestEnv();
    const serverId = await createServer(env);

    const res = await mcpApp.request(
      `/mcp/servers/${serverId}/prompts`,
      {},
      env,
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { prompts: any[] };
    expect(data.prompts).toHaveLength(2);
    expect(data.prompts[0].name).toBe("summarize");
  });

  it("POST /mcp/servers/:id/prompts/:name executes a prompt", async () => {
    const env = createTestEnv();
    const serverId = await createServer(env);

    const res = await mcpApp.request(
      `/mcp/servers/${serverId}/prompts/summarize`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arguments: { text: "hello" } }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { messages: any[] };
    expect(data.messages).toHaveLength(2);
    expect(data.messages[0].role).toBe("user");
  });

  it("POST /mcp/servers/:id/sampling returns LLM response", async () => {
    const env = createTestEnv();
    const serverId = await createServer(env);

    const res = await mcpApp.request(
      `/mcp/servers/${serverId}/sampling`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: { type: "text", text: "Hello" } }],
          maxTokens: 1024,
        }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { role: string; content: { text: string }; model: string };
    expect(data.role).toBe("assistant");
    expect(data.content.text).toBe("LLM response text");
    expect(data.model).toBe("claude-haiku-4-5");
  });

  it("GET /mcp/sampling/log returns sampling history", async () => {
    const env = createTestEnv();
    const serverId = await createServer(env);

    // First make a sampling request to generate a log entry
    await mcpApp.request(
      `/mcp/servers/${serverId}/sampling`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: { type: "text", text: "Log test" } }],
          maxTokens: 512,
        }),
      },
      env,
    );

    // Query the log
    const res = await mcpApp.request(
      `/mcp/sampling/log?serverId=${serverId}&limit=10`,
      {},
      env,
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { logs: any[] };
    expect(data.logs).toHaveLength(1);
    expect(data.logs[0].serverId).toBe(serverId);
    expect(data.logs[0].status).toBe("success");
    expect(data.logs[0].model).toBe("claude-haiku-4-5");
  });
});
