// F528 Graph Orchestration (L3) — Agents-as-Tools TDD Red Phase
import { describe, it, expect, vi, beforeEach } from "vitest";
import { agentAsTool } from "../../core/agent/orchestration/agents-as-tools.js";
import { ToolRegistry } from "../../core/agent/runtime/tool-registry.js";
import type { AgentSpec, RuntimeContext } from "@foundry-x/shared";

// AgentRuntime 인터페이스 최소 mock
function makeRuntime(specName: string, runOutput: string) {
  const spec: AgentSpec = {
    name: specName,
    model: "claude-sonnet-4-6",
    systemPrompt: "You are a helpful assistant for testing purposes",
    tools: [],
  };
  return {
    spec,
    run: vi.fn().mockResolvedValue({ output: runOutput, stopReason: "end_turn", rounds: 1, tokenUsage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 } }),
  };
}

describe("F528 AgentsAsTools", () => {
  it("agentAsTool()이 ToolDefinition을 반환한다", () => {
    const runtime = makeRuntime("planner", "plan output");
    const tool = agentAsTool(runtime as never);

    expect(tool).toBeDefined();
    expect(tool.name).toBeDefined();
    expect(tool.description).toBeDefined();
    expect(typeof tool.execute).toBe("function");
  });

  it("반환된 ToolDefinition의 name은 agent_{spec.name}이다", () => {
    const runtime = makeRuntime("architect", "arch output");
    const tool = agentAsTool(runtime as never);

    expect(tool.name).toBe("agent_architect");
  });

  it("execute() 호출 시 runtime.run()이 호출된다", async () => {
    const runtime = makeRuntime("coder", "code output");
    const tool = agentAsTool(runtime as never);

    const result = await tool.execute(
      { message: "write a function" },
      { agentId: "test", sessionId: "sess-1", apiKey: "key-1" }
    );

    expect(runtime.run).toHaveBeenCalledOnce();
    expect(result).toBe("code output");
  });

  it("ToolRegistry에 등록 후 name으로 조회 가능하다", () => {
    const registry = new ToolRegistry();
    const runtime = makeRuntime("reviewer", "review output");
    const tool = agentAsTool(runtime as never);

    registry.register(tool);

    const found = registry.get("agent_reviewer");
    expect(found).toBeDefined();
    expect(found?.name).toBe("agent_reviewer");
  });
});
