import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentRunner } from "../services/agent-runner.js";
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "../services/execution-types.js";
import { TestAgent } from "../services/test-agent.js";
import {
  buildTestGenerationPrompt,
  buildCoveragePrompt,
} from "../services/test-agent-prompts.js";
import {
  testGenerateSchema,
  coverageGapsSchema,
} from "../schemas/agent.js";

// ── Mock Runner ─────────────────────────────────────────

function makeMockRunner(output: string, overrides?: Partial<AgentExecutionResult>): AgentRunner {
  return {
    type: "mock" as const,
    execute: vi.fn().mockResolvedValue({
      status: "success",
      output: { analysis: output },
      tokensUsed: 100,
      model: "test-model",
      duration: 500,
      ...overrides,
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
    supportsTaskType: vi.fn().mockReturnValue(true),
  };
}

function makeFailingRunner(): AgentRunner {
  return {
    type: "mock" as const,
    execute: vi.fn().mockResolvedValue({
      status: "failed" as const,
      output: {},
      tokensUsed: 0,
      model: "test-model",
      duration: 0,
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
    supportsTaskType: vi.fn().mockReturnValue(true),
  };
}

function makeThrowingRunner(): AgentRunner {
  return {
    type: "mock" as const,
    execute: vi.fn().mockRejectedValue(new Error("LLM unavailable")),
    isAvailable: vi.fn().mockResolvedValue(true),
    supportsTaskType: vi.fn().mockReturnValue(true),
  };
}

// ── Helpers ──────────────────────────────────────────────

function makeRequest(overrides?: Partial<AgentExecutionRequest>): AgentExecutionRequest {
  return {
    taskId: "task-1",
    agentId: "test-agent",
    taskType: "test-generation",
    context: {
      repoUrl: "https://github.com/test/repo",
      branch: "main",
      ...overrides?.context,
    },
    constraints: [],
    ...overrides,
  };
}

// ── Mock createRoutedRunner ─────────────────────────────

let currentMockRunner: AgentRunner;

vi.mock("../services/agent-runner.js", () => ({
  createRoutedRunner: vi.fn().mockImplementation(() => Promise.resolve(currentMockRunner)),
  createAgentRunner: vi.fn(),
}));

// ── Tests ───────────────────────────────────────────────

describe("TestAgent", () => {
  describe("generateTests", () => {
    it("should parse testFiles from LLM response", async () => {
      const llmOutput = JSON.stringify({
        testFiles: [
          { path: "src/__tests__/foo.test.ts", content: "test code", testCount: 3, framework: "vitest" },
        ],
        totalTestCount: 3,
        coverageEstimate: 85,
        edgeCases: [{ function: "foo", case: "null input", category: "null" }],
      });
      currentMockRunner = makeMockRunner(llmOutput);

      const agent = new TestAgent({ env: {} });
      const result = await agent.generateTests(makeRequest());

      expect(result.testFiles).toHaveLength(1);
      expect(result.testFiles[0]!.path).toBe("src/__tests__/foo.test.ts");
      expect(result.totalTestCount).toBe(3);
      expect(result.model).toBe("test-model");
    });

    it("should clamp coverageEstimate to 0-100", async () => {
      const llmOutput = JSON.stringify({
        testFiles: [],
        totalTestCount: 0,
        coverageEstimate: 150,
        edgeCases: [],
      });
      currentMockRunner = makeMockRunner(llmOutput);

      const agent = new TestAgent({ env: {} });
      const result = await agent.generateTests(makeRequest());

      expect(result.coverageEstimate).toBe(100);
    });

    it("should clamp negative coverageEstimate to 0", async () => {
      const llmOutput = JSON.stringify({
        testFiles: [],
        totalTestCount: 0,
        coverageEstimate: -20,
        edgeCases: [],
      });
      currentMockRunner = makeMockRunner(llmOutput);

      const agent = new TestAgent({ env: {} });
      const result = await agent.generateTests(makeRequest());

      expect(result.coverageEstimate).toBe(0);
    });

    it("should parse edgeCases array", async () => {
      const llmOutput = JSON.stringify({
        testFiles: [],
        totalTestCount: 0,
        coverageEstimate: 50,
        edgeCases: [
          { function: "add", case: "overflow", category: "boundary" },
          { function: "divide", case: "zero divisor", category: "error" },
        ],
      });
      currentMockRunner = makeMockRunner(llmOutput);

      const agent = new TestAgent({ env: {} });
      const result = await agent.generateTests(makeRequest());

      expect(result.edgeCases).toHaveLength(2);
      expect(result.edgeCases[0]!.category).toBe("boundary");
      expect(result.edgeCases[1]!.function).toBe("divide");
    });

    it("should return default result on LLM failure status", async () => {
      currentMockRunner = makeFailingRunner();

      const agent = new TestAgent({ env: {} });
      const result = await agent.generateTests(makeRequest());

      expect(result.testFiles).toEqual([]);
      expect(result.totalTestCount).toBe(0);
      expect(result.coverageEstimate).toBe(0);
    });

    it("should return default result on non-JSON response", async () => {
      currentMockRunner = makeMockRunner("This is not JSON at all");

      const agent = new TestAgent({ env: {} });
      const result = await agent.generateTests(makeRequest());

      expect(result.testFiles).toEqual([]);
      expect(result.totalTestCount).toBe(0);
    });

    it("should handle missing fields gracefully with defaults", async () => {
      const llmOutput = JSON.stringify({ totalTestCount: 7 });
      currentMockRunner = makeMockRunner(llmOutput);

      const agent = new TestAgent({ env: {} });
      const result = await agent.generateTests(makeRequest());

      expect(result.testFiles).toEqual([]);
      expect(result.totalTestCount).toBe(7);
      expect(result.edgeCases).toEqual([]);
      expect(result.coverageEstimate).toBe(0);
    });

    it("should include duration from timing measurement", async () => {
      const llmOutput = JSON.stringify({
        testFiles: [],
        totalTestCount: 0,
        coverageEstimate: 0,
        edgeCases: [],
      });
      currentMockRunner = makeMockRunner(llmOutput);

      const agent = new TestAgent({ env: {} });
      const result = await agent.generateTests(makeRequest());

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.tokensUsed).toBe(100);
    });
  });

  describe("analyzeCoverage", () => {
    it("should parse uncoveredFunctions from response", async () => {
      const llmOutput = JSON.stringify({
        analyzedFiles: 3,
        uncoveredFunctions: [
          { file: "src/utils.ts", function: "parseDate", complexity: "simple", priority: "medium" },
        ],
        missingEdgeCases: [],
        overallCoverage: 70,
      });
      currentMockRunner = makeMockRunner(llmOutput);

      const agent = new TestAgent({ env: {} });
      const result = await agent.analyzeCoverage({ "src/utils.ts": "export function parseDate() {}" });

      expect(result.analyzedFiles).toBe(3);
      expect(result.uncoveredFunctions).toHaveLength(1);
      expect(result.uncoveredFunctions[0]!.function).toBe("parseDate");
      expect(result.overallCoverage).toBe(70);
    });

    it("should parse missingEdgeCases from response", async () => {
      const llmOutput = JSON.stringify({
        analyzedFiles: 1,
        uncoveredFunctions: [],
        missingEdgeCases: [
          { file: "src/calc.ts", function: "divide", suggestedCases: ["zero divisor", "NaN input"] },
        ],
        overallCoverage: 90,
      });
      currentMockRunner = makeMockRunner(llmOutput);

      const agent = new TestAgent({ env: {} });
      const result = await agent.analyzeCoverage({ "src/calc.ts": "function divide() {}" });

      expect(result.missingEdgeCases).toHaveLength(1);
      expect(result.missingEdgeCases[0]!.suggestedCases).toContain("zero divisor");
    });

    it("should handle empty sourceFiles", async () => {
      const llmOutput = JSON.stringify({
        analyzedFiles: 0,
        uncoveredFunctions: [],
        missingEdgeCases: [],
        overallCoverage: 100,
      });
      currentMockRunner = makeMockRunner(llmOutput);

      const agent = new TestAgent({ env: {} });
      const result = await agent.analyzeCoverage({});

      expect(result.analyzedFiles).toBe(0);
      expect(result.overallCoverage).toBe(100);
    });

    it("should clamp overallCoverage to 0-100", async () => {
      const llmOutput = JSON.stringify({
        analyzedFiles: 1,
        uncoveredFunctions: [],
        missingEdgeCases: [],
        overallCoverage: 200,
      });
      currentMockRunner = makeMockRunner(llmOutput);

      const agent = new TestAgent({ env: {} });
      const result = await agent.analyzeCoverage({ "a.ts": "code" });

      expect(result.overallCoverage).toBe(100);
    });

    it("should return default on failed status", async () => {
      currentMockRunner = makeFailingRunner();

      const agent = new TestAgent({ env: {} });
      const result = await agent.analyzeCoverage({ "a.ts": "code" });

      expect(result.analyzedFiles).toBe(0);
      expect(result.uncoveredFunctions).toEqual([]);
    });
  });

  describe("suggestEdgeCases", () => {
    it("should return edge cases by category", async () => {
      const llmOutput = JSON.stringify({
        functionName: "processOrder",
        edgeCases: [
          { case: "negative quantity", category: "boundary", input: "-1", expectedBehavior: "throw error" },
          { case: "null customer", category: "null", input: "null", expectedBehavior: "return error" },
        ],
      });
      currentMockRunner = makeMockRunner(llmOutput);

      const agent = new TestAgent({ env: {} });
      const result = await agent.suggestEdgeCases("function processOrder(qty: number, customer: Customer): Order");

      expect(result.functionName).toBe("processOrder");
      expect(result.edgeCases).toHaveLength(2);
      expect(result.edgeCases[0]!.category).toBe("boundary");
      expect(result.edgeCases[1]!.expectedBehavior).toBe("return error");
    });

    it("should include function body in prompt when provided", async () => {
      const llmOutput = JSON.stringify({ functionName: "add", edgeCases: [] });
      const mockRunner = makeMockRunner(llmOutput);
      currentMockRunner = mockRunner;

      const agent = new TestAgent({ env: {} });
      await agent.suggestEdgeCases("function add(a: number, b: number): number", "return a + b;");

      const callArg = (mockRunner.execute as ReturnType<typeof vi.fn>).mock.calls[0]![0] as AgentExecutionRequest;
      expect(callArg.context.instructions).toContain("return a + b;");
      expect(callArg.context.instructions).toContain("## Function");
    });

    it("should use signature-only prompt when body is not provided", async () => {
      const llmOutput = JSON.stringify({ functionName: "add", edgeCases: [] });
      const mockRunner = makeMockRunner(llmOutput);
      currentMockRunner = mockRunner;

      const agent = new TestAgent({ env: {} });
      await agent.suggestEdgeCases("function add(a: number, b: number): number");

      const callArg = (mockRunner.execute as ReturnType<typeof vi.fn>).mock.calls[0]![0] as AgentExecutionRequest;
      expect(callArg.context.instructions).toContain("## Function Signature");
    });

    it("should return default on failed result", async () => {
      currentMockRunner = makeFailingRunner();

      const agent = new TestAgent({ env: {} });
      const result = await agent.suggestEdgeCases("function broken(): void");

      expect(result.functionName).toBe("");
      expect(result.edgeCases).toEqual([]);
    });
  });
});

// ── Prompt Builder Tests ────────────────────────────────

describe("buildTestGenerationPrompt", () => {
  it("should include fileContents in prompt", () => {
    const request = makeRequest({
      context: {
        repoUrl: "https://github.com/test/repo",
        branch: "main",
        fileContents: { "src/utils.ts": "export function add(a: number, b: number) { return a + b; }" },
      },
    });
    const prompt = buildTestGenerationPrompt(request);

    expect(prompt).toContain("## Source Files to Test");
    expect(prompt).toContain("src/utils.ts");
    expect(prompt).toContain("export function add");
  });

  it("should include spec requirements when present", () => {
    const request = makeRequest({
      context: {
        repoUrl: "https://github.com/test/repo",
        branch: "main",
        spec: {
          title: "User Auth",
          description: "Login feature",
          acceptanceCriteria: ["Must validate email", "Must hash password"],
        },
      },
    });
    const prompt = buildTestGenerationPrompt(request);

    expect(prompt).toContain("## Spec Requirements");
    expect(prompt).toContain("User Auth");
    expect(prompt).toContain("Must validate email");
  });

  it("should include instructions when present", () => {
    const request = makeRequest({
      context: {
        repoUrl: "https://github.com/test/repo",
        branch: "main",
        instructions: "Focus on error handling tests",
      },
    });
    const prompt = buildTestGenerationPrompt(request);

    expect(prompt).toContain("## Additional Instructions");
    expect(prompt).toContain("Focus on error handling tests");
  });

  it("should always include repo and branch", () => {
    const request = makeRequest();
    const prompt = buildTestGenerationPrompt(request);

    expect(prompt).toContain("Repo: https://github.com/test/repo");
    expect(prompt).toContain("Branch: main");
  });
});

describe("buildCoveragePrompt", () => {
  it("should include source files", () => {
    const prompt = buildCoveragePrompt(
      { "src/a.ts": "function a() {}", "src/b.ts": "function b() {}" },
      {},
    );

    expect(prompt).toContain("## Source Files");
    expect(prompt).toContain("src/a.ts");
    expect(prompt).toContain("src/b.ts");
  });

  it("should include test files when provided", () => {
    const prompt = buildCoveragePrompt(
      { "src/a.ts": "code" },
      { "src/__tests__/a.test.ts": "test code" },
    );

    expect(prompt).toContain("## Existing Test Files");
    expect(prompt).toContain("a.test.ts");
  });

  it("should omit test files section when empty", () => {
    const prompt = buildCoveragePrompt({ "src/a.ts": "code" }, {});

    expect(prompt).not.toContain("## Existing Test Files");
  });
});

// ── API Route Tests ─────────────────────────────────────

describe("TestAgent API routes", () => {

  it("POST /agents/test/generate — schema accepts valid request", () => {
    const valid = testGenerateSchema.safeParse({
      taskId: "task-1",
      taskType: "test-generation",
      context: {
        repoUrl: "https://github.com/test/repo",
        branch: "main",
        fileContents: { "src/a.ts": "code" },
      },
    });
    expect(valid.success).toBe(true);
  });

  it("POST /agents/test/generate — schema rejects wrong taskType", () => {
    const invalid = testGenerateSchema.safeParse({
      taskId: "task-1",
      taskType: "code-review",
      context: {
        repoUrl: "https://github.com/test/repo",
        branch: "main",
      },
    });
    expect(invalid.success).toBe(false);
  });

  it("POST /agents/test/coverage-gaps — schema accepts valid request", () => {
    const valid = coverageGapsSchema.safeParse({
      sourceFiles: { "src/a.ts": "export function a() {}" },
    });
    expect(valid.success).toBe(true);
  });

  it("POST /agents/test/coverage-gaps — schema defaults testFiles to empty", () => {
    const result = coverageGapsSchema.parse({
      sourceFiles: { "src/a.ts": "code" },
    });
    expect(result.testFiles).toEqual({});
  });
});
