import { describe, it, expect, vi, beforeEach } from "vitest";
import { ArchitectAgent } from "../agent/services/architect-agent.js";
import type { AgentExecutionRequest, AgentExecutionResult } from "../agent/services/execution-types.js";

// Mock createRoutedRunner — must use hoisted fn to avoid TDZ
const { mockRunner } = vi.hoisted(() => {
  const mockRunner = {
    type: "mock" as const,
    execute: vi.fn(),
    isAvailable: vi.fn().mockResolvedValue(true),
    supportsTaskType: vi.fn().mockReturnValue(true),
  };
  return { mockRunner };
});

vi.mock("../agent/services/agent-runner.js", () => ({
  createRoutedRunner: vi.fn().mockResolvedValue(mockRunner),
  createAgentRunner: vi.fn().mockReturnValue(mockRunner),
}));

function makeRequest(overrides?: Partial<AgentExecutionRequest>): AgentExecutionRequest {
  return {
    taskId: "task-001",
    agentId: "architect-agent",
    taskType: "spec-analysis",
    context: {
      repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
      branch: "master",
      targetFiles: ["src/services/foo.ts"],
      fileContents: { "src/services/foo.ts": "export function foo() { return 1; }" },
    },
    constraints: [],
    ...overrides,
  };
}

function makeSuccessResult(analysis: string): AgentExecutionResult {
  return {
    status: "success",
    output: { analysis },
    tokensUsed: 150,
    model: "test-model",
    duration: 500,
  };
}

const VALID_ANALYSIS = JSON.stringify({
  impactSummary: "Low impact — single utility added",
  designScore: 85,
  dependencyAnalysis: {
    affectedModules: ["services/foo"],
    circularDependencies: [],
    couplingScore: 20,
  },
  riskAssessment: [{ risk: "None significant", severity: "low", mitigation: "N/A" }],
  recommendations: [{ category: "structure", suggestion: "Add index export", priority: "low" }],
});

const VALID_DESIGN_REVIEW = JSON.stringify({
  completenessScore: 90,
  consistencyScore: 80,
  feasibilityScore: 85,
  overallScore: 86,
  missingElements: ["data model diagram"],
  inconsistencies: [],
  suggestions: ["Add sequence diagram"],
});

const VALID_DEPENDENCY = JSON.stringify({
  modules: [{ path: "a.ts", imports: ["./b.js"], exports: ["foo"] }],
  circularDependencies: [["a.ts", "b.ts", "a.ts"]],
  couplingMetrics: { afferentCoupling: { "a.ts": 2 }, efferentCoupling: { "a.ts": 1 } },
  suggestions: ["Extract shared interface"],
});

describe("ArchitectAgent", () => {
  let agent: ArchitectAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new ArchitectAgent({
      env: { ANTHROPIC_API_KEY: "test-key" },
    });
  });

  // ── analyzeArchitecture ──

  describe("analyzeArchitecture", () => {
    it("returns parsed analysis on happy path", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_ANALYSIS));

      const result = await agent.analyzeArchitecture(makeRequest());

      expect(result.impactSummary).toBe("Low impact — single utility added");
      expect(result.designScore).toBe(85);
      expect(result.dependencyAnalysis.affectedModules).toEqual(["services/foo"]);
      expect(result.tokensUsed).toBe(150);
      expect(result.model).toBe("test-model");
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("clamps designScore to 0-100", async () => {
      const over = JSON.stringify({ ...JSON.parse(VALID_ANALYSIS), designScore: 150 });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(over));

      const result = await agent.analyzeArchitecture(makeRequest());
      expect(result.designScore).toBe(100);
    });

    it("clamps negative designScore to 0", async () => {
      const neg = JSON.stringify({ ...JSON.parse(VALID_ANALYSIS), designScore: -10 });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(neg));

      const result = await agent.analyzeArchitecture(makeRequest());
      expect(result.designScore).toBe(0);
    });

    it("clamps couplingScore", async () => {
      const data = JSON.parse(VALID_ANALYSIS);
      data.dependencyAnalysis.couplingScore = 200;
      mockRunner.execute.mockResolvedValue(makeSuccessResult(JSON.stringify(data)));

      const result = await agent.analyzeArchitecture(makeRequest());
      expect(result.dependencyAnalysis.couplingScore).toBe(100);
    });

    it("parses circularDependencies correctly", async () => {
      const data = JSON.parse(VALID_ANALYSIS);
      data.dependencyAnalysis.circularDependencies = [["a.ts", "b.ts", "a.ts"]];
      mockRunner.execute.mockResolvedValue(makeSuccessResult(JSON.stringify(data)));

      const result = await agent.analyzeArchitecture(makeRequest());
      expect(result.dependencyAnalysis.circularDependencies).toEqual([["a.ts", "b.ts", "a.ts"]]);
    });

    it("returns default on LLM failure (status=failed)", async () => {
      mockRunner.execute.mockResolvedValue({
        status: "failed",
        output: { analysis: "error" },
        tokensUsed: 10,
        model: "test-model",
        duration: 100,
      });

      const result = await agent.analyzeArchitecture(makeRequest());
      expect(result.designScore).toBe(0);
      expect(result.impactSummary).toBe("error");
    });

    it("returns default on non-JSON response", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult("This is not JSON at all"));

      const result = await agent.analyzeArchitecture(makeRequest());
      expect(result.designScore).toBe(0);
      expect(result.riskAssessment).toEqual([]);
    });

    it("handles empty fileContents gracefully", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_ANALYSIS));
      const req = makeRequest({ context: { repoUrl: "", branch: "", fileContents: {} } });

      const result = await agent.analyzeArchitecture(req);
      expect(result.designScore).toBe(85);
    });
  });

  // ── reviewDesignDoc ──

  describe("reviewDesignDoc", () => {
    it("returns parsed design review on happy path", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_DESIGN_REVIEW));

      const result = await agent.reviewDesignDoc("# Design\nSome document", "Sprint 37 Design");

      expect(result.completenessScore).toBe(90);
      expect(result.consistencyScore).toBe(80);
      expect(result.feasibilityScore).toBe(85);
      expect(result.overallScore).toBe(86);
      expect(result.missingElements).toEqual(["data model diagram"]);
      expect(result.suggestions).toEqual(["Add sequence diagram"]);
    });

    it("clamps all scores to 0-100", async () => {
      const data = { completenessScore: 120, consistencyScore: -5, feasibilityScore: 200, overallScore: 999 };
      mockRunner.execute.mockResolvedValue(makeSuccessResult(JSON.stringify(data)));

      const result = await agent.reviewDesignDoc("doc");
      expect(result.completenessScore).toBe(100);
      expect(result.consistencyScore).toBe(0);
      expect(result.feasibilityScore).toBe(100);
      expect(result.overallScore).toBe(100);
    });

    it("parses missingElements as array", async () => {
      const data = { ...JSON.parse(VALID_DESIGN_REVIEW), missingElements: ["A", "B"] };
      mockRunner.execute.mockResolvedValue(makeSuccessResult(JSON.stringify(data)));

      const result = await agent.reviewDesignDoc("doc");
      expect(result.missingElements).toEqual(["A", "B"]);
    });

    it("returns default on failed status", async () => {
      mockRunner.execute.mockResolvedValue({
        status: "failed",
        output: { analysis: "fail" },
        tokensUsed: 5,
        model: "m",
        duration: 50,
      });

      const result = await agent.reviewDesignDoc("doc");
      expect(result.overallScore).toBe(0);
      expect(result.suggestions).toEqual(["fail"]);
    });
  });

  // ── analyzeDependencies ──

  describe("analyzeDependencies", () => {
    it("returns parsed dependency analysis on happy path", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_DEPENDENCY));

      const result = await agent.analyzeDependencies({
        "a.ts": 'import { bar } from "./b.js";\nexport function foo() {}',
        "b.ts": 'import { foo } from "./a.js";\nexport function bar() {}',
      });

      expect(result.modules).toHaveLength(1);
      expect(result.circularDependencies).toEqual([["a.ts", "b.ts", "a.ts"]]);
      expect(result.couplingMetrics.afferentCoupling["a.ts"]).toBe(2);
    });

    it("handles missing couplingMetrics gracefully", async () => {
      const data = { modules: [], circularDependencies: [], suggestions: [] };
      mockRunner.execute.mockResolvedValue(makeSuccessResult(JSON.stringify(data)));

      const result = await agent.analyzeDependencies({ "x.ts": "export const x = 1;" });
      expect(result.couplingMetrics).toEqual({ afferentCoupling: {}, efferentCoupling: {} });
    });

    it("returns default on non-JSON", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult("invalid"));

      const result = await agent.analyzeDependencies({ "x.ts": "export const x = 1;" });
      expect(result.modules).toEqual([]);
      expect(result.suggestions).toContain("invalid");
    });
  });

  // ── Prompt builders ──

  describe("prompt builders", () => {
    it("buildArchitectPrompt includes fileContents", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_ANALYSIS));

      await agent.analyzeArchitecture(makeRequest());

      const callArg = mockRunner.execute.mock.calls[0]![0] as AgentExecutionRequest;
      expect(callArg.context.instructions).toContain("src/services/foo.ts");
      expect(callArg.context.instructions).toContain("export function foo()");
    });

    it("buildArchitectPrompt includes spec context when provided", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_ANALYSIS));
      const req = makeRequest({
        context: {
          repoUrl: "",
          branch: "",
          spec: { title: "My Spec", description: "A spec description", acceptanceCriteria: [] },
        },
      });

      await agent.analyzeArchitecture(req);

      const callArg = mockRunner.execute.mock.calls[0]![0] as AgentExecutionRequest;
      expect(callArg.context.instructions).toContain("My Spec");
    });
  });

  // ── API route integration (via Hono app.request) ──

  describe("API routes", () => {
    // These tests verify the ArchitectAgent is correctly invoked.
    // Full route tests require the Hono app setup; here we test the agent layer.

    it("analyzeArchitecture uses spec-analysis taskType", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_ANALYSIS));

      await agent.analyzeArchitecture(makeRequest());

      const callArg = mockRunner.execute.mock.calls[0]![0] as AgentExecutionRequest;
      expect(callArg.taskType).toBe("spec-analysis");
    });

    it("reviewDesignDoc constructs proper request with constraints=[]", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_DESIGN_REVIEW));

      await agent.reviewDesignDoc("# Doc", "Title");

      const callArg = mockRunner.execute.mock.calls[0]![0] as AgentExecutionRequest;
      expect(callArg.constraints).toEqual([]);
      expect(callArg.agentId).toBe("architect-agent");
    });

    it("analyzeDependencies includes file content in instructions", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_DEPENDENCY));

      await agent.analyzeDependencies({ "mod.ts": "export const x = 1;" });

      const callArg = mockRunner.execute.mock.calls[0]![0] as AgentExecutionRequest;
      expect(callArg.context.instructions).toContain("mod.ts");
      expect(callArg.context.instructions).toContain("export const x = 1;");
    });
  });
});
