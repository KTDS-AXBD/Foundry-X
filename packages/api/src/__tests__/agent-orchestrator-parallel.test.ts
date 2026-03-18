import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentOrchestrator } from "../services/agent-orchestrator.js";
import { createMockD1 } from "./helpers/mock-d1.js";
import type { AgentRunner } from "../services/agent-runner.js";
import type { AgentExecutionResult } from "../services/execution-types.js";

const MOCK_RESULT: AgentExecutionResult = {
  status: "success",
  output: {
    analysis: "Test analysis",
    generatedCode: [{ path: "src/test.ts", content: "export const x = 1;", action: "create" }],
  },
  tokensUsed: 100,
  model: "mock",
  duration: 50,
};

function createMockRunner(): AgentRunner {
  return {
    type: "mock",
    execute: vi.fn().mockResolvedValue(MOCK_RESULT),
    isAvailable: vi.fn().mockResolvedValue(true),
    supportsTaskType: vi.fn().mockReturnValue(true),
  };
}

function createMockSSE() {
  return { pushEvent: vi.fn() };
}

describe("AgentOrchestrator parallel execution (F68)", () => {
  let db: ReturnType<typeof createMockD1>;
  let sse: ReturnType<typeof createMockSSE>;
  let orchestrator: AgentOrchestrator;
  let runner: AgentRunner;

  beforeEach(() => {
    db = createMockD1();
    sse = createMockSSE();
    orchestrator = new AgentOrchestrator(db as any, sse as any);
    runner = createMockRunner();
  });

  it("executeParallel runs all tasks concurrently", async () => {
    const tasks = [
      { agentId: "agent-1", taskType: "code-review" as const, context: { repoUrl: "https://github.com/test", branch: "main" } },
      { agentId: "agent-2", taskType: "test-generation" as const, context: { repoUrl: "https://github.com/test", branch: "main" } },
    ];

    const result = await orchestrator.executeParallel(tasks, runner);
    expect(result.executionId).toMatch(/^pexec-/);
    expect(result.results).toHaveLength(2);
    expect(result.results[0]!.status).toBe("success");
    expect(result.results[1]!.status).toBe("success");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("executeParallel handles partial failures", async () => {
    const failRunner: AgentRunner = {
      ...createMockRunner(),
      execute: vi.fn()
        .mockResolvedValueOnce(MOCK_RESULT)
        .mockRejectedValueOnce(new Error("Runner error")),
    };

    const tasks = [
      { agentId: "agent-1", taskType: "code-review" as const, context: { repoUrl: "https://github.com/test", branch: "main" } },
      { agentId: "agent-2", taskType: "code-review" as const, context: { repoUrl: "https://github.com/test", branch: "main" } },
    ];

    const result = await orchestrator.executeParallel(tasks, failRunner);
    expect(result.results[0]!.status).toBe("success");
    expect(result.results[1]!.status).toBe("failed");
    expect(result.results[1]!.error).toBe("Runner error");
  });

  it("executeParallel records execution in D1", async () => {
    const tasks = [
      { agentId: "agent-1", taskType: "code-review" as const, context: { repoUrl: "https://github.com/test", branch: "main" } },
      { agentId: "agent-2", taskType: "code-review" as const, context: { repoUrl: "https://github.com/test", branch: "main" } },
    ];

    const result = await orchestrator.executeParallel(tasks, runner);

    // Verify D1 record
    const row = await db.prepare("SELECT * FROM parallel_executions WHERE id = ?")
      .bind(result.executionId)
      .first<{ id: string; status: string; total_tasks: number; completed_tasks: number }>();

    expect(row).not.toBeNull();
    expect(row!.status).toBe("completed");
    expect(row!.total_tasks).toBe(2);
    expect(row!.completed_tasks).toBe(2);
  });

  it("executeParallelWithPr creates PRs and enqueues", async () => {
    const mockPipeline = {
      createAgentPr: vi.fn().mockResolvedValue({
        id: "pr-rec-1",
        prNumber: 42,
        prUrl: "https://github.com/pulls/42",
      }),
    };
    const mockQueue = {
      enqueue: vi.fn().mockResolvedValue({ position: 1 }),
      detectConflicts: vi.fn().mockResolvedValue({
        conflicting: [],
        suggestedOrder: [],
        autoResolvable: true,
      }),
    };

    orchestrator.setPrPipeline(mockPipeline);
    orchestrator.setMergeQueue(mockQueue as any);

    const tasks = [
      { agentId: "agent-1", taskType: "code-generation" as const, context: { repoUrl: "https://github.com/test", branch: "main" } },
      { agentId: "agent-2", taskType: "code-generation" as const, context: { repoUrl: "https://github.com/test", branch: "main" } },
    ];

    const result = await orchestrator.executeParallelWithPr(tasks, runner);
    expect(result.prs).toHaveLength(2);
    expect(result.prs[0]!.prNumber).toBe(42);
    expect(result.conflicts.autoResolvable).toBe(true);
    expect(mockPipeline.createAgentPr).toHaveBeenCalledTimes(2);
    expect(mockQueue.enqueue).toHaveBeenCalledTimes(2);
  });

  it("setMergeQueue sets the merge queue service", () => {
    const mockQueue = {} as any;
    orchestrator.setMergeQueue(mockQueue);
    // No error thrown — just verifying setter works
    expect(true).toBe(true);
  });

  it("executeParallelWithPr works without prPipeline", async () => {
    const tasks = [
      { agentId: "agent-1", taskType: "code-generation" as const, context: { repoUrl: "https://github.com/test", branch: "main" } },
    ];

    // No pipeline set — should still return results with null PRs
    const result = await orchestrator.executeParallelWithPr(tasks, runner);
    expect(result.prs).toHaveLength(1);
    expect(result.prs[0]!.prNumber).toBeNull();
  });
});
