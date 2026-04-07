import { describe, it, expect, vi, beforeEach } from "vitest";
import { QAAgent } from "../core/agent/services/qa-agent.js";
import type { AgentExecutionRequest, AgentExecutionResult } from "../core/agent/services/execution-types.js";

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

vi.mock("../core/agent/services/agent-runner.js", () => ({
  createRoutedRunner: vi.fn().mockResolvedValue(mockRunner),
  createAgentRunner: vi.fn().mockReturnValue(mockRunner),
}));

function makeRequest(overrides?: Partial<AgentExecutionRequest>): AgentExecutionRequest {
  return {
    taskId: "task-qa-001",
    agentId: "qa-agent",
    taskType: "qa-testing",
    context: {
      repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
      branch: "master",
      targetFiles: ["src/routes/auth.ts"],
      spec: {
        title: "Login Feature",
        description: "User can login with email/password",
        acceptanceCriteria: ["User sees login form", "Invalid credentials show error"],
      },
      fileContents: { "src/routes/auth.ts": "app.post('/login', handler);" },
    },
    constraints: [],
    ...overrides,
  };
}

function makeSuccessResult(analysis: string): AgentExecutionResult {
  return {
    status: "success",
    output: { analysis },
    tokensUsed: 180,
    model: "test-model",
    duration: 700,
  };
}

const VALID_BROWSER_TEST = JSON.stringify({
  scenarios: [
    {
      name: "Login happy path",
      description: "User logs in with valid credentials",
      steps: [
        { action: "navigate", selector: "/login", expected: "Login page loads" },
        { action: "fill", selector: "#email", expected: "Email field filled" },
        { action: "fill", selector: "#password", expected: "Password field filled" },
        { action: "click", selector: "button[type=submit]", expected: "Form submitted" },
        { action: "assert", selector: ".dashboard", expected: "Redirected to dashboard" },
      ],
      playwrightCode: "import { test, expect } from '@playwright/test';\ntest('login', async ({ page }) => { await page.goto('/login'); });",
      priority: "critical",
    },
    {
      name: "Login error handling",
      description: "User sees error on invalid credentials",
      steps: [
        { action: "fill", selector: "#email", expected: "Email filled" },
        { action: "click", selector: "button[type=submit]", expected: "Submit clicked" },
        { action: "assert", selector: ".error", expected: "Error message shown" },
      ],
      playwrightCode: "test('login error', async ({ page }) => { /* ... */ });",
      priority: "high",
    },
  ],
  coverageEstimate: 65,
});

const VALID_ACCEPTANCE = JSON.stringify({
  overallStatus: "partial",
  criteria: [
    {
      criterion: "User sees login form",
      status: "met",
      evidence: "Login route renders form component",
      gaps: [],
    },
    {
      criterion: "Invalid credentials show error",
      status: "partial",
      evidence: "Error handling exists",
      gaps: ["No specific error message for invalid password vs non-existent user"],
    },
  ],
  completenessScore: 75,
});

const VALID_REGRESSION = JSON.stringify({
  riskScore: 40,
  affectedTests: [
    {
      testFile: "auth.test.ts",
      riskLevel: "medium",
      reason: "Auth handler signature changed",
    },
  ],
  suggestedTests: ["Test rate limiting on login endpoint", "Test session expiry"],
});

describe("QAAgent", () => {
  let agent: QAAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new QAAgent({
      env: { ANTHROPIC_API_KEY: "test-key" },
    });
  });

  describe("runBrowserTest", () => {
    it("returns parsed browser test scenarios on success", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_BROWSER_TEST));

      const result = await agent.runBrowserTest(makeRequest());

      expect(result.scenarios).toHaveLength(2);
      expect(result.scenarios[0]!.name).toBe("Login happy path");
      expect(result.scenarios[0]!.priority).toBe("critical");
      expect(result.scenarios[0]!.steps).toHaveLength(5);
      expect(result.scenarios[0]!.playwrightCode).toContain("@playwright/test");
      expect(result.coverageEstimate).toBe(65);
      expect(result.tokensUsed).toBe(180);
    });

    it("clamps coverageEstimate to 0-100", async () => {
      const over = JSON.stringify({ ...JSON.parse(VALID_BROWSER_TEST), coverageEstimate: 150 });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(over));

      const result = await agent.runBrowserTest(makeRequest());
      expect(result.coverageEstimate).toBe(100);
    });

    it("returns default on failed result", async () => {
      mockRunner.execute.mockResolvedValue({
        status: "failed",
        output: { analysis: "error" },
        tokensUsed: 10,
        model: "test-model",
        duration: 100,
      });

      const result = await agent.runBrowserTest(makeRequest());
      expect(result.scenarios).toEqual([]);
      expect(result.coverageEstimate).toBe(0);
    });

    it("returns default on non-JSON response", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult("invalid json"));

      const result = await agent.runBrowserTest(makeRequest());
      expect(result.scenarios).toEqual([]);
    });

    it("handles missing scenarios array", async () => {
      const noScenarios = JSON.stringify({ coverageEstimate: 50 });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(noScenarios));

      const result = await agent.runBrowserTest(makeRequest());
      expect(result.scenarios).toEqual([]);
      expect(result.coverageEstimate).toBe(50);
    });

    it("includes duration from elapsed time", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_BROWSER_TEST));

      const result = await agent.runBrowserTest(makeRequest());
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("validateAcceptanceCriteria", () => {
    it("returns parsed acceptance result on success", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_ACCEPTANCE));

      const result = await agent.validateAcceptanceCriteria(
        {
          title: "Login",
          description: "Login feature",
          acceptanceCriteria: ["User sees form", "Error on invalid"],
        },
        { "auth.ts": "export function login() {}" },
      );

      expect(result.overallStatus).toBe("partial");
      expect(result.criteria).toHaveLength(2);
      expect(result.criteria[0]!.status).toBe("met");
      expect(result.criteria[1]!.gaps).toHaveLength(1);
      expect(result.completenessScore).toBe(75);
    });

    it("defaults overallStatus to fail on invalid value", async () => {
      const invalid = JSON.stringify({ ...JSON.parse(VALID_ACCEPTANCE), overallStatus: "unknown" });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(invalid));

      const result = await agent.validateAcceptanceCriteria(
        { title: "T", description: "D", acceptanceCriteria: [] },
        {},
      );
      expect(result.overallStatus).toBe("fail");
    });

    it("returns default on failure", async () => {
      mockRunner.execute.mockResolvedValue({
        status: "failed",
        output: { analysis: "fail" },
        tokensUsed: 5,
        model: "test-model",
        duration: 50,
      });

      const result = await agent.validateAcceptanceCriteria(
        { title: "T", description: "D", acceptanceCriteria: [] },
        {},
      );
      expect(result.overallStatus).toBe("fail");
      expect(result.criteria).toEqual([]);
    });

    it("clamps completenessScore", async () => {
      const over = JSON.stringify({ ...JSON.parse(VALID_ACCEPTANCE), completenessScore: -5 });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(over));

      const result = await agent.validateAcceptanceCriteria(
        { title: "T", description: "D", acceptanceCriteria: [] },
        {},
      );
      expect(result.completenessScore).toBe(0);
    });
  });

  describe("detectRegressions", () => {
    it("returns parsed regression analysis on success", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_REGRESSION));

      const result = await agent.detectRegressions(
        { "auth.ts": "new code" },
        { "auth.test.ts": "existing tests" },
      );

      expect(result.riskScore).toBe(40);
      expect(result.affectedTests).toHaveLength(1);
      expect(result.affectedTests[0]!.testFile).toBe("auth.test.ts");
      expect(result.suggestedTests).toHaveLength(2);
    });

    it("clamps riskScore", async () => {
      const over = JSON.stringify({ ...JSON.parse(VALID_REGRESSION), riskScore: 200 });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(over));

      const result = await agent.detectRegressions({}, {});
      expect(result.riskScore).toBe(100);
    });

    it("returns default on failure", async () => {
      mockRunner.execute.mockResolvedValue({
        status: "failed",
        output: { analysis: "fail" },
        tokensUsed: 5,
        model: "test-model",
        duration: 50,
      });

      const result = await agent.detectRegressions({}, {});
      expect(result.riskScore).toBe(0);
      expect(result.affectedTests).toEqual([]);
    });

    it("returns default on non-JSON response", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult("not json"));

      const result = await agent.detectRegressions({}, {});
      expect(result.riskScore).toBe(0);
    });

    it("handles empty existing tests", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_REGRESSION));

      const result = await agent.detectRegressions(
        { "new.ts": "new code" },
        {},
      );
      expect(result.riskScore).toBe(40);
    });

    it("handles missing suggestedTests array", async () => {
      const noSuggestions = JSON.stringify({ riskScore: 20, affectedTests: [] });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(noSuggestions));

      const result = await agent.detectRegressions({ "a.ts": "code" }, {});
      expect(result.riskScore).toBe(20);
      expect(result.suggestedTests).toEqual([]);
    });
  });
});
