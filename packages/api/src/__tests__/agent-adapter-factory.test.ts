// ─── F336: AgentAdapterFactory Tests (Sprint 151) ───

import { describe, it, expect, vi } from "vitest";
import {
  AgentAdapterFactory,
  contextToRequest,
  resultToAgentResult,
} from "../services/agent-adapter-factory.js";
import type { AgentExecutionContext } from "@foundry-x/shared";
import type { AgentRunner } from "../services/agent-runner.js";
import type { AgentExecutionResult } from "../services/execution-types.js";

function makeContext(overrides?: Partial<AgentExecutionContext>): AgentExecutionContext {
  return {
    taskId: "task-1",
    tenantId: "tenant-1",
    round: 1,
    loopMode: "retry",
    previousFeedback: [],
    metadata: {},
    ...overrides,
  };
}

function makeRunner(overrides?: Partial<AgentExecutionResult>): AgentRunner {
  const result: AgentExecutionResult = {
    status: "success",
    output: { analysis: "All good" },
    tokensUsed: 100,
    model: "claude-haiku-4-5-20250714",
    duration: 500,
    ...overrides,
  };

  return {
    type: "mock" as const,
    execute: vi.fn().mockResolvedValue(result),
    isAvailable: vi.fn().mockResolvedValue(true),
    supportsTaskType: vi.fn().mockReturnValue(true),
  };
}

describe("contextToRequest", () => {
  it("maps basic fields", () => {
    const ctx = makeContext({ metadata: { repoUrl: "https://github.com/test", branch: "main" } });
    const req = contextToRequest(ctx, "agent-1", "code-generation");

    expect(req.taskId).toBe("task-1");
    expect(req.agentId).toBe("agent-1");
    expect(req.taskType).toBe("code-generation");
    expect(req.context.repoUrl).toBe("https://github.com/test");
    expect(req.context.branch).toBe("main");
  });

  it("prepends previous feedback to instructions", () => {
    const ctx = makeContext({
      previousFeedback: ["Fix the typo", "Add error handling"],
      metadata: { instructions: "Original" },
    });
    const req = contextToRequest(ctx, "agent-1", "code-review");

    expect(req.context.instructions).toContain("Previous feedback:");
    expect(req.context.instructions).toContain("Fix the typo");
    expect(req.context.instructions).toContain("Original");
  });

  it("defaults repoUrl and branch when metadata is empty", () => {
    const ctx = makeContext();
    const req = contextToRequest(ctx, "agent-1", "code-generation");

    expect(req.context.repoUrl).toBe("");
    expect(req.context.branch).toBe("main");
  });
});

describe("resultToAgentResult", () => {
  it("converts success result", () => {
    const result: AgentExecutionResult = {
      status: "success",
      output: { analysis: "Good code" },
      tokensUsed: 50,
      model: "claude-haiku-4-5-20250714",
      duration: 200,
    };
    const agentResult = resultToAgentResult(result);

    expect(agentResult.success).toBe(true);
    expect(agentResult.qualityScore).toBe(0.8);
    expect(agentResult.feedback).toContain("Good code");
  });

  it("uses reflection score when available", () => {
    const result: AgentExecutionResult = {
      status: "success",
      output: { analysis: "Reviewed" },
      tokensUsed: 100,
      model: "claude-sonnet-4-5-20250514",
      duration: 300,
      reflection: {
        score: 92,
        confidence: 0.95,
        reasoning: "High quality",
        suggestions: [],
        retryCount: 0,
        history: [],
      },
    };
    const agentResult = resultToAgentResult(result);

    expect(agentResult.qualityScore).toBeCloseTo(0.92);
  });

  it("converts review comments to feedback", () => {
    const result: AgentExecutionResult = {
      status: "partial",
      output: {
        analysis: "Issues found",
        reviewComments: [
          { file: "src/foo.ts", line: 10, comment: "Missing null check", severity: "warning" },
        ],
      },
      tokensUsed: 80,
      model: "claude-haiku-4-5-20250714",
      duration: 150,
    };
    const agentResult = resultToAgentResult(result);

    expect(agentResult.success).toBe(false);
    expect(agentResult.feedback).toContain("src/foo.ts:10 [warning] Missing null check");
  });
});

describe("AgentAdapterFactory.wrapRunner", () => {
  it("wraps runner and forwards execute", async () => {
    const runner = makeRunner();
    const adapter = AgentAdapterFactory.wrapRunner(runner, "test-agent", "generator");

    expect(adapter.name).toBe("test-agent");
    expect(adapter.role).toBe("generator");
    expect(adapter.metadata?.source).toBe("service");

    const result = await adapter.execute(makeContext());
    expect(result.success).toBe(true);
    expect(runner.execute).toHaveBeenCalledOnce();
  });

  it("respects taskType from context metadata", async () => {
    const runner = makeRunner();
    const adapter = AgentAdapterFactory.wrapRunner(runner, "test", "generator", "code-generation");

    await adapter.execute(makeContext({ metadata: { taskType: "security-review" } }));

    const call = (runner.execute as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.taskType).toBe("security-review");
  });
});

describe("AgentAdapterFactory.fromYamlDefinition", () => {
  it("creates adapter with yaml metadata", () => {
    const adapter = AgentAdapterFactory.fromYamlDefinition(
      "spec-checker",
      "discriminator",
      "Spec verification",
      "haiku",
    );

    expect(adapter.name).toBe("spec-checker");
    expect(adapter.role).toBe("discriminator");
    expect(adapter.metadata?.source).toBe("yaml");
    expect(adapter.metadata?.modelTier).toBe("haiku");
  });

  it("returns not-executable result", async () => {
    const adapter = AgentAdapterFactory.fromYamlDefinition("test", "generator", "desc");
    const result = await adapter.execute(makeContext());

    expect(result.success).toBe(false);
    expect(result.feedback[0]).toContain("YAML-defined agent");
  });
});
