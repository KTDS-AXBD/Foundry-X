import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  EnsembleVoting,
  VOTING_STRATEGIES,
  ENSEMBLE_EVALUATION_PROMPT,
} from "../services/ensemble-voting.js";
import type {
  AgentExecutionResult,
  AgentExecutionRequest,
} from "../services/execution-types.js";

// ─── Mock OpenRouterRunner ───

const mockExecute = vi.fn();

vi.mock("../services/openrouter-runner.js", () => ({
  OpenRouterRunner: vi.fn().mockImplementation((_key: string, model: string) => ({
    type: "openrouter",
    execute: (...args: unknown[]) => mockExecute(model, ...args),
    isAvailable: () => Promise.resolve(true),
    supportsTaskType: () => true,
  })),
}));

// ─── Helpers ───

function makeResult(
  model: string,
  status: "success" | "partial" | "failed" = "success",
  overrides: Partial<AgentExecutionResult> = {},
): AgentExecutionResult {
  return {
    status,
    output: { analysis: `Analysis from ${model}` },
    tokensUsed: 200,
    model,
    duration: 500,
    ...overrides,
  };
}

function makeRequest(): AgentExecutionRequest {
  return {
    taskId: "test-001",
    agentId: "ensemble-voting",
    taskType: "code-review",
    context: {
      repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
      branch: "master",
      instructions: "Review the code",
    },
    constraints: [],
  };
}

function createService() {
  return new EnsembleVoting({
    OPENROUTER_API_KEY: "test-key",
    OPENROUTER_DEFAULT_MODEL: "anthropic/claude-sonnet-4",
  });
}

// ─── Tests ───

describe("EnsembleVoting", () => {
  let svc: EnsembleVoting;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = createService();
  });

  // ─── Validation ───

  it("throws when models < 2", async () => {
    await expect(
      svc.executeEnsemble(makeRequest(), {
        models: ["model-a"],
        strategy: "majority",
      }),
    ).rejects.toThrow("At least 2 models required");
  });

  it("throws when models > 5", async () => {
    await expect(
      svc.executeEnsemble(makeRequest(), {
        models: ["a", "b", "c", "d", "e", "f"],
        strategy: "majority",
      }),
    ).rejects.toThrow("Maximum 5 models allowed");
  });

  it("throws when OPENROUTER_API_KEY missing", async () => {
    const noKey = new EnsembleVoting({});
    await expect(
      noKey.executeEnsemble(makeRequest(), {
        models: ["a", "b"],
        strategy: "majority",
      }),
    ).rejects.toThrow("OPENROUTER_API_KEY required");
  });

  // ─── All models fail ───

  it("throws when all models fail", async () => {
    mockExecute.mockRejectedValue(new Error("API error"));

    await expect(
      svc.executeEnsemble(makeRequest(), {
        models: ["model-a", "model-b"],
        strategy: "majority",
      }),
    ).rejects.toThrow("All models failed in ensemble execution");
  });

  // ─── Majority strategy ───

  it("selects winner by majority vote with similar analysis", async () => {
    mockExecute.mockImplementation((model: string) =>
      Promise.resolve(
        makeResult(model, "success", {
          output: { analysis: "The code looks good with minor issues" },
        }),
      ),
    );

    const result = await svc.executeEnsemble(makeRequest(), {
      models: ["model-a", "model-b", "model-c"],
      strategy: "majority",
    });

    expect(result.winner).toBeDefined();
    expect(result.winnerModel).toBeDefined();
    expect(result.winnerScore).toBeGreaterThan(0);
    expect(result.allResults).toHaveLength(3);
    expect(result.votingDetails.strategy).toBe("majority");
    expect(result.votingDetails.totalModels).toBe(3);
    expect(result.votingDetails.successfulModels).toBe(3);
  });

  it("majority vote with reviewComments uses file Jaccard", async () => {
    mockExecute.mockImplementation((model: string) => {
      const files = model === "model-a"
        ? [{ file: "a.ts", line: 1, comment: "fix", severity: "error" as const }]
        : [{ file: "a.ts", line: 2, comment: "ok", severity: "info" as const }, { file: "b.ts", line: 1, comment: "ok", severity: "info" as const }];
      return Promise.resolve(
        makeResult(model, "success", { output: { reviewComments: files } }),
      );
    });

    const result = await svc.executeEnsemble(makeRequest(), {
      models: ["model-a", "model-b"],
      strategy: "majority",
    });

    expect(result.allResults.every((r) => r.score >= 0)).toBe(true);
  });

  it("majority vote with generatedCode uses path Jaccard", async () => {
    mockExecute.mockImplementation((model: string) => {
      const code = model === "model-a"
        ? [{ path: "src/a.ts", content: "code", action: "create" as const }]
        : [{ path: "src/a.ts", content: "code2", action: "create" as const }, { path: "src/b.ts", content: "code3", action: "create" as const }];
      return Promise.resolve(
        makeResult(model, "success", { output: { generatedCode: code } }),
      );
    });

    const result = await svc.executeEnsemble(makeRequest(), {
      models: ["model-a", "model-b"],
      strategy: "majority",
    });

    expect(result.winnerModel).toBeDefined();
    expect(result.allResults).toHaveLength(2);
  });

  // ─── Partial success ───

  it("handles mix of success and failure results", async () => {
    mockExecute.mockImplementation((model: string) => {
      if (model === "model-b") {
        return Promise.reject(new Error("Timeout"));
      }
      return Promise.resolve(makeResult(model));
    });

    const result = await svc.executeEnsemble(makeRequest(), {
      models: ["model-a", "model-b", "model-c"],
      strategy: "majority",
    });

    expect(result.votingDetails.totalModels).toBe(3);
    expect(result.votingDetails.successfulModels).toBe(2);
    const failedResult = result.allResults.find((r) => r.model === "model-b");
    expect(failedResult?.result).toBeNull();
    expect(failedResult?.error).toBe("Timeout");
  });

  // ─── Constants ───

  it("has correct static constants", () => {
    expect(EnsembleVoting.MIN_MODELS).toBe(2);
    expect(EnsembleVoting.MAX_MODELS).toBe(5);
    expect(EnsembleVoting.DEFAULT_TIMEOUT_MS).toBe(30_000);
  });

  it("ENSEMBLE_EVALUATION_PROMPT is non-empty", () => {
    expect(ENSEMBLE_EVALUATION_PROMPT).toContain("Score the following result");
  });
});

describe("Voting Strategies", () => {
  let svc: EnsembleVoting;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = createService();
  });

  // ─── quality-score ───

  it("quality-score strategy uses evaluation model", async () => {
    let callCount = 0;
    mockExecute.mockImplementation((model: string) => {
      callCount++;
      // First 2 calls = actual execution; next 2 = evaluation
      if (model.includes("haiku") || model.includes("eval")) {
        return Promise.resolve(
          makeResult(model, "success", {
            output: { analysis: JSON.stringify({ score: callCount <= 3 ? 85 : 70, reasoning: "good" }) },
          }),
        );
      }
      return Promise.resolve(makeResult(model));
    });

    const result = await svc.executeEnsemble(makeRequest(), {
      models: ["model-a", "model-b"],
      strategy: "quality-score",
      evaluationModel: "eval-model",
    });

    expect(result.votingDetails.strategy).toBe("quality-score");
    expect(result.winner).toBeDefined();
  });

  it("quality-score falls back to 50 on parse failure", async () => {
    mockExecute.mockImplementation((model: string) => {
      if (model.includes("haiku")) {
        return Promise.resolve(
          makeResult(model, "success", { output: { analysis: "not json" } }),
        );
      }
      return Promise.resolve(makeResult(model));
    });

    const result = await svc.executeEnsemble(makeRequest(), {
      models: ["model-a", "model-b"],
      strategy: "quality-score",
    });

    // Both results get fallback score 50
    const scores = result.allResults.filter((r) => r.result !== null).map((r) => r.score);
    expect(scores.every((s) => s === 50)).toBe(true);
  });

  it("quality-score falls back to 50 on evaluation rejection", async () => {
    mockExecute.mockImplementation((model: string) => {
      if (model.includes("haiku")) {
        return Promise.reject(new Error("eval failed"));
      }
      return Promise.resolve(makeResult(model));
    });

    const result = await svc.executeEnsemble(makeRequest(), {
      models: ["model-a", "model-b"],
      strategy: "quality-score",
    });

    const scores = result.allResults.filter((r) => r.result !== null).map((r) => r.score);
    expect(scores.every((s) => s === 50)).toBe(true);
  });

  // ─── weighted ───

  it("weighted strategy uses provided weights", async () => {
    mockExecute.mockImplementation((model: string) =>
      Promise.resolve(makeResult(model, "success", { tokensUsed: 100 })),
    );

    const result = await svc.executeEnsemble(makeRequest(), {
      models: ["model-a", "model-b"],
      strategy: "weighted",
      weights: { "model-a": 80, "model-b": 20 },
    });

    expect(result.votingDetails.strategy).toBe("weighted");
    // model-a with higher weight should score higher
    const scoreA = result.allResults.find((r) => r.model === "model-a")?.score ?? 0;
    const scoreB = result.allResults.find((r) => r.model === "model-b")?.score ?? 0;
    expect(scoreA).toBeGreaterThan(scoreB);
  });

  it("weighted strategy uses equal weights when none provided", async () => {
    mockExecute.mockImplementation((model: string) =>
      Promise.resolve(makeResult(model, "success", { tokensUsed: 200 })),
    );

    const result = await svc.executeEnsemble(makeRequest(), {
      models: ["model-a", "model-b"],
      strategy: "weighted",
    });

    const scoreA = result.allResults.find((r) => r.model === "model-a")?.score ?? 0;
    const scoreB = result.allResults.find((r) => r.model === "model-b")?.score ?? 0;
    // Equal tokens + equal default weight → same score
    expect(scoreA).toBeCloseTo(scoreB, 2);
  });

  it("weighted strategy penalizes high token usage", async () => {
    mockExecute.mockImplementation((model: string) =>
      Promise.resolve(
        makeResult(model, "success", {
          tokensUsed: model === "model-a" ? 100 : 5000,
        }),
      ),
    );

    const result = await svc.executeEnsemble(makeRequest(), {
      models: ["model-a", "model-b"],
      strategy: "weighted",
    });

    const scoreA = result.allResults.find((r) => r.model === "model-a")?.score ?? 0;
    const scoreB = result.allResults.find((r) => r.model === "model-b")?.score ?? 0;
    expect(scoreA).toBeGreaterThan(scoreB);
  });

  // ─── VOTING_STRATEGIES constant ───

  it("VOTING_STRATEGIES has 3 entries", () => {
    expect(VOTING_STRATEGIES).toHaveLength(3);
    expect(VOTING_STRATEGIES.map((s) => s.name)).toEqual([
      "majority",
      "quality-score",
      "weighted",
    ]);
  });

  it("each strategy has required fields", () => {
    for (const s of VOTING_STRATEGIES) {
      expect(s.name).toBeDefined();
      expect(s.description).toBeTruthy();
      expect(typeof s.costMultiplier).toBe("number");
      expect(s.bestFor).toBeTruthy();
    }
  });
});

describe("Ensemble API", () => {
  it("votingDetails includes averageLatencyMs", async () => {
    vi.clearAllMocks();
    mockExecute.mockImplementation((model: string) =>
      Promise.resolve(makeResult(model)),
    );

    const svc = createService();
    const result = await svc.executeEnsemble(makeRequest(), {
      models: ["model-a", "model-b"],
      strategy: "majority",
    });

    expect(result.votingDetails.averageLatencyMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.votingDetails.averageLatencyMs).toBe("number");
  });

  it("ensemble result includes all model results", async () => {
    vi.clearAllMocks();
    mockExecute.mockImplementation((model: string) =>
      Promise.resolve(makeResult(model)),
    );

    const svc = createService();
    const result = await svc.executeEnsemble(makeRequest(), {
      models: ["model-a", "model-b", "model-c"],
      strategy: "majority",
    });

    expect(result.allResults).toHaveLength(3);
    expect(result.allResults.map((r) => r.model)).toEqual(["model-a", "model-b", "model-c"]);
  });
});
