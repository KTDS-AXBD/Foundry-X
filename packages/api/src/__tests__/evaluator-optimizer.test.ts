import { describe, it, expect } from "vitest";
import type { AgentRunner } from "../agent/services/agent-runner.js";
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "../agent/services/execution-types.js";
import {
  CodeReviewCriteria,
  TestCoverageCriteria,
  SpecComplianceCriteria,
} from "../modules/gate/services/evaluation-criteria.js";
import { EvaluatorOptimizer } from "../core/harness/services/evaluator-optimizer.js";

// ── Mock Runner ─────────────────────────────────────────────

class TestMockRunner implements AgentRunner {
  readonly type = "mock" as const;
  private callCount = 0;
  constructor(private results: AgentExecutionResult[]) {}
  async execute(): Promise<AgentExecutionResult> {
    const result = this.results[this.callCount++] ?? this.results[this.results.length - 1];
    return result!;
  }
  async isAvailable() {
    return true;
  }
  supportsTaskType() {
    return true;
  }
}

class FailingRunner implements AgentRunner {
  readonly type = "mock" as const;
  private callCount = 0;
  constructor(
    private failUntil: number,
    private fallback: AgentExecutionResult,
  ) {}
  async execute(): Promise<AgentExecutionResult> {
    this.callCount++;
    if (this.callCount <= this.failUntil) {
      throw new Error("Runner unavailable");
    }
    return this.fallback;
  }
  async isAvailable() {
    return true;
  }
  supportsTaskType() {
    return true;
  }
}

// ── Helpers ─────────────────────────────────────────────────

function makeRequest(
  overrides?: Partial<AgentExecutionRequest>,
): AgentExecutionRequest {
  return {
    taskId: "task-1",
    agentId: "agent-1",
    taskType: "code-generation",
    context: {
      repoUrl: "https://github.com/test/repo",
      branch: "main",
      ...overrides?.context,
    },
    constraints: [],
    ...overrides,
  };
}

function makeResult(overrides?: Partial<AgentExecutionResult>): AgentExecutionResult {
  return {
    status: "success",
    output: {},
    tokensUsed: 100,
    model: "test-model",
    duration: 500,
    ...overrides,
  };
}

// ── CodeReviewCriteria ──────────────────────────────────────

describe("CodeReviewCriteria", () => {
  const criteria = new CodeReviewCriteria();

  it("returns score 100 when there are no error comments", () => {
    const result = makeResult({
      output: {
        reviewComments: [
          { file: "a.ts", line: 1, comment: "looks fine", severity: "info" },
        ],
      },
    });
    const score = criteria.evaluate(result, makeRequest());
    expect(score.score).toBe(100);
    expect(score.feedback).toHaveLength(0);
  });

  it("deducts 20 per error and 5 per warning", () => {
    const result = makeResult({
      output: {
        reviewComments: [
          { file: "a.ts", line: 1, comment: "bug", severity: "error" },
          { file: "a.ts", line: 2, comment: "bug2", severity: "error" },
          { file: "b.ts", line: 3, comment: "style", severity: "warning" },
        ],
      },
    });
    const score = criteria.evaluate(result, makeRequest());
    // 100 - 2*20 - 1*5 = 55
    expect(score.score).toBe(55);
    expect(score.feedback).toHaveLength(2); // only errors
  });

  it("floors score at 0", () => {
    const result = makeResult({
      output: {
        reviewComments: [
          { file: "a.ts", line: 1, comment: "e1", severity: "error" },
          { file: "a.ts", line: 2, comment: "e2", severity: "error" },
          { file: "a.ts", line: 3, comment: "e3", severity: "error" },
          { file: "a.ts", line: 4, comment: "e4", severity: "error" },
          { file: "a.ts", line: 5, comment: "e5", severity: "error" },
          { file: "a.ts", line: 6, comment: "e6", severity: "error" },
        ],
      },
    });
    const score = criteria.evaluate(result, makeRequest());
    expect(score.score).toBe(0);
  });
});

// ── TestCoverageCriteria ────────────────────────────────────

describe("TestCoverageCriteria", () => {
  const criteria = new TestCoverageCriteria();

  it("returns score 100 when test-to-source ratio >= 1", () => {
    const result = makeResult({
      output: {
        generatedCode: [
          { path: "src/service.ts", content: "", action: "create" },
          { path: "src/__tests__/service.test.ts", content: "", action: "create" },
        ],
      },
    });
    const score = criteria.evaluate(result, makeRequest());
    expect(score.score).toBe(100);
    expect(score.feedback).toHaveLength(0);
  });

  it("returns score 0 with feedback when no test files exist", () => {
    const result = makeResult({
      output: {
        generatedCode: [
          { path: "src/service.ts", content: "", action: "create" },
        ],
      },
    });
    const score = criteria.evaluate(result, makeRequest());
    expect(score.score).toBe(0);
    expect(score.feedback).toContain("No test files generated");
  });

  it("recognizes .test. pattern", () => {
    const result = makeResult({
      output: {
        generatedCode: [
          { path: "src/a.ts", content: "", action: "create" },
          { path: "src/a.test.ts", content: "", action: "create" },
          { path: "src/b.ts", content: "", action: "create" },
        ],
      },
    });
    const score = criteria.evaluate(result, makeRequest());
    // 1 test / 2 source = 50%
    expect(score.score).toBe(50);
  });
});

// ── SpecComplianceCriteria ──────────────────────────────────

describe("SpecComplianceCriteria", () => {
  const criteria = new SpecComplianceCriteria();

  it("returns score 100 when all criteria are met", () => {
    const request = makeRequest({
      context: {
        repoUrl: "https://github.com/test/repo",
        branch: "main",
        spec: {
          title: "Test",
          description: "desc",
          acceptanceCriteria: ["login", "dashboard"],
        },
      },
    });
    const result = makeResult({
      output: { analysis: "Implemented login page and dashboard view" },
    });
    const score = criteria.evaluate(result, request);
    expect(score.score).toBe(100);
    expect(score.feedback).toHaveLength(0);
  });

  it("returns score 50 when half of criteria are met", () => {
    const request = makeRequest({
      context: {
        repoUrl: "https://github.com/test/repo",
        branch: "main",
        spec: {
          title: "Test",
          description: "desc",
          acceptanceCriteria: ["login", "dashboard"],
        },
      },
    });
    const result = makeResult({
      output: { analysis: "Implemented login page" },
    });
    const score = criteria.evaluate(result, request);
    expect(score.score).toBe(50);
    expect(score.feedback).toHaveLength(1);
    expect(score.feedback[0]).toContain("dashboard");
  });

  it("returns score 100 when no acceptance criteria exist", () => {
    const request = makeRequest();
    const result = makeResult();
    const score = criteria.evaluate(result, request);
    expect(score.score).toBe(100);
  });

  it("is case-insensitive", () => {
    const request = makeRequest({
      context: {
        repoUrl: "https://github.com/test/repo",
        branch: "main",
        spec: {
          title: "Test",
          description: "desc",
          acceptanceCriteria: ["LOGIN"],
        },
      },
    });
    const result = makeResult({
      output: { analysis: "login feature implemented" },
    });
    const score = criteria.evaluate(result, request);
    expect(score.score).toBe(100);
  });
});

// ── EvaluatorOptimizer ──────────────────────────────────────

describe("EvaluatorOptimizer", () => {
  const defaultCriteria = [
    new CodeReviewCriteria(),
    new TestCoverageCriteria(),
    new SpecComplianceCriteria(),
  ];

  it("converges on first try when quality is high enough", async () => {
    const goodResult = makeResult({
      output: {
        generatedCode: [
          { path: "src/a.ts", content: "code", action: "create" },
          { path: "src/a.test.ts", content: "test", action: "create" },
        ],
        reviewComments: [],
      },
    });

    const optimizer = new EvaluatorOptimizer({
      maxIterations: 3,
      qualityThreshold: 80,
      criteria: defaultCriteria,
      generatorRunner: new TestMockRunner([goodResult]),
    });

    const loop = await optimizer.run(makeRequest());
    expect(loop.converged).toBe(true);
    expect(loop.iterations).toBe(1);
  });

  it("converges after 3 iterations with improving results", async () => {
    const lowResult = makeResult({
      tokensUsed: 50,
      output: {
        generatedCode: [{ path: "src/a.ts", content: "", action: "create" }],
        reviewComments: [
          { file: "a.ts", line: 1, comment: "err", severity: "error" },
          { file: "a.ts", line: 2, comment: "err2", severity: "error" },
        ],
      },
    });
    const midResult = makeResult({
      tokensUsed: 60,
      output: {
        generatedCode: [{ path: "src/a.ts", content: "", action: "create" }],
        reviewComments: [
          { file: "a.ts", line: 1, comment: "err", severity: "error" },
        ],
      },
    });
    const highResult = makeResult({
      tokensUsed: 70,
      output: {
        generatedCode: [
          { path: "src/a.ts", content: "", action: "create" },
          { path: "src/a.test.ts", content: "", action: "create" },
        ],
        reviewComments: [],
      },
    });

    const optimizer = new EvaluatorOptimizer({
      maxIterations: 5,
      qualityThreshold: 80,
      criteria: defaultCriteria,
      generatorRunner: new TestMockRunner([lowResult, midResult, highResult]),
    });

    const loop = await optimizer.run(makeRequest());
    expect(loop.converged).toBe(true);
    expect(loop.iterations).toBe(3);
  });

  it("returns best result when maxIterations is reached without convergence", async () => {
    const lowResult = makeResult({
      output: {
        reviewComments: [
          { file: "a.ts", line: 1, comment: "err", severity: "error" },
          { file: "a.ts", line: 2, comment: "err2", severity: "error" },
        ],
      },
    });

    const optimizer = new EvaluatorOptimizer({
      maxIterations: 2,
      qualityThreshold: 95,
      criteria: defaultCriteria,
      generatorRunner: new TestMockRunner([lowResult]),
    });

    const loop = await optimizer.run(makeRequest());
    expect(loop.converged).toBe(false);
    expect(loop.iterations).toBe(2);
  });

  it("clamps maxIterations to HARD_MAX_ITERATIONS (5)", async () => {
    const result = makeResult({
      output: {
        generatedCode: [
          { path: "src/a.ts", content: "", action: "create" },
          { path: "src/a.test.ts", content: "", action: "create" },
        ],
        reviewComments: [],
      },
    });

    const optimizer = new EvaluatorOptimizer({
      maxIterations: 100, // should be clamped to 5
      qualityThreshold: 999, // will never converge
      criteria: defaultCriteria,
      generatorRunner: new TestMockRunner([result]),
    });

    const loop = await optimizer.run(makeRequest());
    expect(loop.converged).toBe(false);
    expect(loop.iterations).toBe(5);
  });

  it("records failed iteration and continues to next", async () => {
    const goodResult = makeResult({
      output: {
        generatedCode: [
          { path: "src/a.ts", content: "", action: "create" },
          { path: "src/a.test.ts", content: "", action: "create" },
        ],
        reviewComments: [],
      },
    });

    const optimizer = new EvaluatorOptimizer({
      maxIterations: 3,
      qualityThreshold: 80,
      criteria: defaultCriteria,
      generatorRunner: new FailingRunner(1, goodResult),
    });

    const loop = await optimizer.run(makeRequest());
    // iteration 1: fail, iteration 2: success (converges)
    expect(loop.iterations).toBe(2);
    expect(loop.history[0]!.result.status).toBe("failed");
    expect(loop.history[0]!.feedback).toContain("Runner execution failed");
    expect(loop.converged).toBe(true);
  });

  it("appends feedback to instructions in buildImprovedRequest", async () => {
    let capturedRequest: AgentExecutionRequest | undefined;
    const lowResult = makeResult({
      output: {
        generatedCode: [
          { path: "src/service.ts", content: "code", action: "create" },
        ],
        reviewComments: [
          { file: "a.ts", line: 1, comment: "missing null check", severity: "error" },
        ],
      },
    });
    const highResult = makeResult({
      output: {
        generatedCode: [
          { path: "src/a.ts", content: "", action: "create" },
          { path: "src/a.test.ts", content: "", action: "create" },
        ],
        reviewComments: [],
      },
    });

    let callCount = 0;
    const trackingRunner: AgentRunner = {
      type: "mock" as const,
      async execute(req: AgentExecutionRequest) {
        callCount++;
        if (callCount === 1) return lowResult;
        capturedRequest = req;
        return highResult;
      },
      async isAvailable() { return true; },
      supportsTaskType() { return true; },
    };

    const optimizer = new EvaluatorOptimizer({
      maxIterations: 3,
      qualityThreshold: 80,
      criteria: defaultCriteria,
      generatorRunner: trackingRunner,
    });

    await optimizer.run(
      makeRequest({ context: { repoUrl: "r", branch: "b", instructions: "Build it" } }),
    );

    expect(capturedRequest).toBeDefined();
    expect(capturedRequest!.context.instructions).toContain(
      "--- Improvement Feedback ---",
    );
    expect(capturedRequest!.context.instructions).toContain("Build it");
  });

  it("computes weightedAverage with normalization", async () => {
    // Use criteria with non-standard weights to verify normalization
    const halfCriteria = new CodeReviewCriteria(); // weight 0.4

    const result = makeResult({
      output: { reviewComments: [] }, // score 100 from code review
    });

    const optimizer = new EvaluatorOptimizer({
      maxIterations: 1,
      qualityThreshold: 50,
      criteria: [halfCriteria], // only one criteria, weight 0.4
      generatorRunner: new TestMockRunner([result]),
    });

    const loop = await optimizer.run(makeRequest());
    // weightedAverage: (100 * 0.4) / 0.4 = 100
    expect(loop.finalScore).toBe(100);
  });

  it("sums totalTokensUsed across all iterations", async () => {
    const badOutput = {
      generatedCode: [
        { path: "src/a.ts", content: "", action: "create" as const },
      ],
      reviewComments: [
        { file: "a.ts", line: 1, comment: "err", severity: "error" as const },
        { file: "a.ts", line: 2, comment: "err2", severity: "error" as const },
      ],
    };
    const r1 = makeResult({ tokensUsed: 100, output: badOutput });
    const r2 = makeResult({ tokensUsed: 200, output: badOutput });
    const r3 = makeResult({
      tokensUsed: 300,
      output: {
        generatedCode: [
          { path: "src/a.ts", content: "", action: "create" },
          { path: "src/a.test.ts", content: "", action: "create" },
        ],
        reviewComments: [],
      },
    });

    const optimizer = new EvaluatorOptimizer({
      maxIterations: 5,
      qualityThreshold: 80,
      criteria: defaultCriteria,
      generatorRunner: new TestMockRunner([r1, r2, r3]),
    });

    const loop = await optimizer.run(makeRequest());
    expect(loop.totalTokensUsed).toBe(100 + 200 + 300);
  });

  it("merges generatedCode into fileContents for next iteration", async () => {
    let secondCallRequest: AgentExecutionRequest | undefined;
    let callCount = 0;

    const firstResult = makeResult({
      output: {
        generatedCode: [
          { path: "src/new-file.ts", content: "export const x = 1;", action: "create" },
        ],
        reviewComments: [
          { file: "a.ts", line: 1, comment: "err", severity: "error" },
        ],
      },
    });
    const secondResult = makeResult({
      output: {
        generatedCode: [
          { path: "src/a.ts", content: "", action: "create" },
          { path: "src/a.test.ts", content: "", action: "create" },
        ],
        reviewComments: [],
      },
    });

    const capturingRunner: AgentRunner = {
      type: "mock" as const,
      async execute(req: AgentExecutionRequest) {
        callCount++;
        if (callCount === 1) return firstResult;
        secondCallRequest = req;
        return secondResult;
      },
      async isAvailable() { return true; },
      supportsTaskType() { return true; },
    };

    const optimizer = new EvaluatorOptimizer({
      maxIterations: 3,
      qualityThreshold: 80,
      criteria: defaultCriteria,
      generatorRunner: capturingRunner,
    });

    await optimizer.run(makeRequest());

    expect(secondCallRequest).toBeDefined();
    expect(secondCallRequest!.context.fileContents?.["src/new-file.ts"]).toBe(
      "export const x = 1;",
    );
  });

  it("sums totalDuration across all iterations", async () => {
    const badOutput = {
      generatedCode: [
        { path: "src/a.ts", content: "", action: "create" as const },
      ],
      reviewComments: [
        { file: "a.ts", line: 1, comment: "err", severity: "error" as const },
        { file: "a.ts", line: 2, comment: "err2", severity: "error" as const },
      ],
    };
    const r1 = makeResult({ duration: 100, output: badOutput });
    const r2 = makeResult({
      duration: 250,
      output: {
        generatedCode: [
          { path: "src/a.ts", content: "", action: "create" },
          { path: "src/a.test.ts", content: "", action: "create" },
        ],
        reviewComments: [],
      },
    });

    const optimizer = new EvaluatorOptimizer({
      maxIterations: 5,
      qualityThreshold: 80,
      criteria: defaultCriteria,
      generatorRunner: new TestMockRunner([r1, r2]),
    });

    const loop = await optimizer.run(makeRequest());
    expect(loop.totalDuration).toBe(350);
  });
});
