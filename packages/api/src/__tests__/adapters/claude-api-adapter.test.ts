// ─── F336: Claude API Adapter Tests (Sprint 151) ───

import { describe, it, expect, vi } from "vitest";
import { AgentAdapterFactory } from "../../services/agent-adapter-factory.js";
import type { AgentExecutionContext } from "@foundry-x/shared";
import type { AgentRunner } from "../../services/agent-runner.js";

function makeContext(): AgentExecutionContext {
  return {
    taskId: "task-1",
    tenantId: "tenant-1",
    round: 1,
    loopMode: "retry",
    previousFeedback: [],
    metadata: { repoUrl: "https://github.com/test/repo", branch: "main" },
  };
}

function makeMockRunner(): AgentRunner {
  return {
    type: "mock" as const,
    execute: vi.fn().mockResolvedValue({
      status: "success",
      output: { analysis: "Code looks good" },
      tokensUsed: 150,
      model: "claude-haiku-4-5-20250714",
      duration: 300,
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
    supportsTaskType: vi.fn().mockReturnValue(true),
  };
}

describe("Claude API Adapter", () => {
  it("creates adapter with generator role", () => {
    const runner = makeMockRunner();
    const adapter = AgentAdapterFactory.wrapRunner(runner, "claude-api", "generator");

    expect(adapter.name).toBe("claude-api");
    expect(adapter.role).toBe("generator");
    expect(adapter.metadata?.source).toBe("service");
    expect(adapter.metadata?.originalService).toBe("mock");
  });

  it("executes and returns AgentResult", async () => {
    const runner = makeMockRunner();
    const adapter = AgentAdapterFactory.wrapRunner(runner, "claude-api", "generator");

    const result = await adapter.execute(makeContext());

    expect(result.success).toBe(true);
    expect(result.qualityScore).toBe(0.8);
    expect(result.feedback).toContain("Code looks good");
    expect(result.artifacts?.tokensUsed).toBe(150);
  });

  it("handles failed execution", async () => {
    const runner = makeMockRunner();
    (runner.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "failed",
      output: { analysis: "API error" },
      tokensUsed: 0,
      model: "claude-haiku-4-5-20250714",
      duration: 100,
    });

    const adapter = AgentAdapterFactory.wrapRunner(runner, "claude-api", "generator");
    const result = await adapter.execute(makeContext());

    expect(result.success).toBe(false);
    expect(result.qualityScore).toBe(0.3);
  });
});
