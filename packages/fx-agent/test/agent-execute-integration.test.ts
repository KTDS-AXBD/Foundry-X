import { describe, it, expect, vi, afterEach } from "vitest";
import { AgentOrchestrator } from "../src/services/agent-orchestrator.js";
import { SSEManager } from "../src/services/sse-manager.js";
import { createMockD1 } from "./helpers/mock-d1.js";
import type { AgentRunner } from "../src/services/agent-runner.js";
import type { AgentExecutionResult } from "../src/services/execution-types.js";

function createMockRunner(result?: Partial<AgentExecutionResult>): AgentRunner {
  return {
    type: "mock",
    execute: vi.fn().mockResolvedValue({
      status: "success",
      output: { analysis: "[Mock] Code reviewed successfully" },
      tokensUsed: 100,
      model: "mock",
      duration: 50,
      ...result,
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
    supportsTaskType: vi.fn().mockReturnValue(true),
  };
}

describe("AgentOrchestrator + SSE integration (F55)", () => {
  let sse: SSEManager;

  afterEach(() => {
    sse?.dispose();
  });

  it("emits agent.task.started on executeTask", async () => {
    const db = createMockD1() as unknown as D1Database;
    sse = new SSEManager(db);

    const pushSpy = vi.spyOn(sse, "pushEvent");
    const orchestrator = new AgentOrchestrator(db, sse);
    const runner = createMockRunner();

    await orchestrator.executeTask("agent-review", "code-review", {
      repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
      branch: "feat/test",
    }, runner);

    const startedCalls = pushSpy.mock.calls.filter(
      ([e]) => e.event === "agent.task.started",
    );
    expect(startedCalls).toHaveLength(1);
    expect(startedCalls[0]![0].data).toMatchObject({
      agentId: "agent-review",
      taskType: "code-review",
      runnerType: "mock",
    });
  });

  it("emits agent.task.completed on executeTask", async () => {
    const db = createMockD1() as unknown as D1Database;
    sse = new SSEManager(db);

    const pushSpy = vi.spyOn(sse, "pushEvent");
    const orchestrator = new AgentOrchestrator(db, sse);
    const runner = createMockRunner();

    await orchestrator.executeTask("agent-gen", "code-generation", {
      repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
      branch: "feat/gen",
    }, runner);

    const completedCalls = pushSpy.mock.calls.filter(
      ([e]) => e.event === "agent.task.completed",
    );
    expect(completedCalls).toHaveLength(1);
    expect(completedCalls[0]![0].data).toMatchObject({
      agentId: "agent-gen",
      status: "success",
      tokensUsed: 100,
      durationMs: 50,
    });
  });

  it("emits completed event even on failure", async () => {
    const db = createMockD1() as unknown as D1Database;
    sse = new SSEManager(db);

    const pushSpy = vi.spyOn(sse, "pushEvent");
    const orchestrator = new AgentOrchestrator(db, sse);
    const runner = createMockRunner({ status: "failed", output: { analysis: "Error occurred" } });

    await orchestrator.executeTask("agent-fail", "spec-analysis", {
      repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
      branch: "feat/fail",
    }, runner);

    const completedCalls = pushSpy.mock.calls.filter(
      ([e]) => e.event === "agent.task.completed",
    );
    expect(completedCalls).toHaveLength(1);
    expect(completedCalls[0]![0].data).toMatchObject({
      status: "failed",
    });
  });

  it("works without SSEManager (optional chaining)", async () => {
    const db = createMockD1() as unknown as D1Database;
    const orchestrator = new AgentOrchestrator(db); // no SSE
    const runner = createMockRunner();

    const result = await orchestrator.executeTask("agent-solo", "code-review", {
      repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
      branch: "feat/solo",
    }, runner);

    expect(result.status).toBe("success");
  });

  it("deduplicates same taskId events via SSEManager", async () => {
    const db = createMockD1() as unknown as D1Database;
    sse = new SSEManager(db);

    let receivedCount = 0;
    sse.subscribers.add((_payload: string) => { receivedCount++; return true; });

    const orchestrator = new AgentOrchestrator(db, sse);
    const runner = createMockRunner();

    await orchestrator.executeTask("agent-dedup", "code-review", {
      repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
      branch: "feat/dedup",
    }, runner);

    // Should have received exactly 2 events: started + completed
    expect(receivedCount).toBe(2);
  });
});
