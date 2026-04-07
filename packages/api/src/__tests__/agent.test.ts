import { describe, it, expect } from "vitest";
import { agentRoute } from "../core/agent/routes/agent.js";
import { createTestEnv } from "./helpers/test-app.js";

describe("agent routes", () => {
  it("GET /agents returns agent list", async () => {
    const res = await agentRoute.request("/agents");
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(2);

    const agent = data[0];
    expect(agent).toHaveProperty("id");
    expect(agent).toHaveProperty("name");
    expect(agent).toHaveProperty("capabilities");
    expect(agent).toHaveProperty("constraints");
  });

  it("GET /agents/stream returns SSE response", async () => {
    const env = createTestEnv();
    const res = await agentRoute.request("/agents/stream", {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");

    // Read first chunk to verify SSE format (heartbeat since DB is empty)
    const reader = res.body!.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);
    expect(text).toContain("heartbeat");
    reader.cancel();
  });

  it("agent profile has correct constraint tiers", async () => {
    const res = await agentRoute.request("/agents");
    const data = await res.json() as any;
    const agent = data[0];

    for (const constraint of agent.constraints) {
      expect(["always", "ask", "never"]).toContain(constraint.tier);
      expect(constraint).toHaveProperty("rule");
      expect(constraint).toHaveProperty("reason");
    }
  });

  // ─── Sprint 10: Agent Execution Endpoints (F53) ───

  it("POST /agents/{id}/execute runs task via MockRunner", async () => {
    const env = createTestEnv();
    // No ANTHROPIC_API_KEY → falls back to MockRunner
    const res = await agentRoute.request(
      "/agents/agent-code-review/execute",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: "code-review",
          context: {
            repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
            branch: "feat/test",
            targetFiles: ["src/index.ts"],
          },
        }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.status).toBe("success");
    expect(data.output.analysis).toContain("[Mock]");
    expect(data.model).toBe("mock");
    expect(data.tokensUsed).toBe(0);
    expect(data.duration).toBeGreaterThanOrEqual(0);
  });

  it("GET /agents/runners returns runner info list", async () => {
    const env = createTestEnv();
    const res = await agentRoute.request("/agents/runners", {}, env);

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(3);

    const types = data.map((r: any) => r.type);
    expect(types).toContain("claude-api");
    expect(types).toContain("mcp");
    expect(types).toContain("mock");

    // mock is always available
    const mockRunner = data.find((r: any) => r.type === "mock");
    expect(mockRunner.available).toBe(true);

    // mcp is not yet available
    const mcpRunner = data.find((r: any) => r.type === "mcp");
    expect(mcpRunner.available).toBe(false);
  });

  it("GET /agents/tasks/{taskId}/result returns 404 for non-existent task", async () => {
    const env = createTestEnv();
    const res = await agentRoute.request(
      "/agents/tasks/non-existent/result",
      {},
      env,
    );

    expect(res.status).toBe(404);
    const data = await res.json() as any;
    expect(data.error).toBe("Task not found");
  });

  it("GET /agents/tasks/{taskId}/result returns result after execution", async () => {
    const env = createTestEnv();

    // First execute a task
    const execRes = await agentRoute.request(
      "/agents/agent-test/execute",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: "spec-analysis",
          context: {
            repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
            branch: "feat/test",
          },
        }),
      },
      env,
    );
    expect(execRes.status).toBe(200);

    // Find the task ID from DB directly
    const { results } = await (env.DB as any)
      .prepare("SELECT id FROM agent_tasks ORDER BY created_at DESC LIMIT 1")
      .all();
    const taskId = results[0].id;

    // Now get the result
    const res = await agentRoute.request(
      `/agents/tasks/${taskId}/result`,
      {},
      env,
    );

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.task).toBeDefined();
    expect(data.task.id).toBe(taskId);
    expect(data.result).toBeDefined();
    expect(data.result.analysis).toContain("[Mock]");
  });
});
