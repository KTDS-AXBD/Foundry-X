import { describe, it, expect, vi, beforeEach } from "vitest";
import { SecurityAgent } from "../src/services/security-agent.js";
import type { AgentExecutionRequest, AgentExecutionResult } from "../src/services/execution-types.js";

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

vi.mock("../src/services/agent-runner.js", () => ({
  createRoutedRunner: vi.fn().mockResolvedValue(mockRunner),
  createAgentRunner: vi.fn().mockReturnValue(mockRunner),
}));

function makeRequest(overrides?: Partial<AgentExecutionRequest>): AgentExecutionRequest {
  return {
    taskId: "task-sec-001",
    agentId: "security-agent",
    taskType: "security-review",
    context: {
      repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
      branch: "master",
      targetFiles: ["src/routes/auth.ts"],
      fileContents: { "src/routes/auth.ts": "const query = `SELECT * FROM users WHERE id = ${id}`;" },
    },
    constraints: [],
    ...overrides,
  };
}

function makeSuccessResult(analysis: string): AgentExecutionResult {
  return {
    status: "success",
    output: { analysis },
    tokensUsed: 200,
    model: "test-model",
    duration: 600,
  };
}

const VALID_SCAN = JSON.stringify({
  riskScore: 75,
  vulnerabilities: [
    {
      type: "injection",
      severity: "critical",
      location: "src/routes/auth.ts:1",
      description: "SQL injection via string interpolation",
      remediation: "Use parameterized queries",
    },
  ],
  securePatterns: ["JWT token validation present"],
  recommendations: [
    {
      category: "input-validation",
      suggestion: "Add input sanitization for user-provided IDs",
      priority: "high",
    },
  ],
});

const VALID_PR_DIFF = JSON.stringify({
  riskLevel: "high",
  findings: [
    {
      file: "auth.ts",
      line: 15,
      type: "injection",
      description: "New SQL concatenation",
      severity: "high",
    },
  ],
  summary: "PR introduces SQL injection risk in auth module",
});

const VALID_OWASP = JSON.stringify({
  complianceScore: 70,
  categories: {
    "A01-broken-access-control": { status: "pass", details: "RBAC middleware applied" },
    "A03-injection": { status: "fail", details: "String interpolation in SQL" },
    "A07-auth-failures": { status: "warn", details: "Weak password policy" },
  },
});

describe("SecurityAgent", () => {
  let agent: SecurityAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new SecurityAgent({
      env: { ANTHROPIC_API_KEY: "test-key" },
    });
  });

  describe("scanVulnerabilities", () => {
    it("returns parsed scan result on success", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_SCAN));

      const result = await agent.scanVulnerabilities(makeRequest());

      expect(result.riskScore).toBe(75);
      expect(result.vulnerabilities).toHaveLength(1);
      expect(result.vulnerabilities[0]!.type).toBe("injection");
      expect(result.vulnerabilities[0]!.severity).toBe("critical");
      expect(result.securePatterns).toContain("JWT token validation present");
      expect(result.recommendations).toHaveLength(1);
      expect(result.tokensUsed).toBe(200);
      expect(result.model).toBe("test-model");
    });

    it("clamps riskScore to 0-100 range", async () => {
      const overScore = JSON.stringify({ ...JSON.parse(VALID_SCAN), riskScore: 150 });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(overScore));

      const result = await agent.scanVulnerabilities(makeRequest());
      expect(result.riskScore).toBe(100);
    });

    it("clamps negative riskScore to 0", async () => {
      const underScore = JSON.stringify({ ...JSON.parse(VALID_SCAN), riskScore: -10 });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(underScore));

      const result = await agent.scanVulnerabilities(makeRequest());
      expect(result.riskScore).toBe(0);
    });

    it("returns default on failed result", async () => {
      mockRunner.execute.mockResolvedValue({
        status: "failed",
        output: { analysis: "error" },
        tokensUsed: 10,
        model: "test-model",
        duration: 100,
      });

      const result = await agent.scanVulnerabilities(makeRequest());
      expect(result.riskScore).toBe(0);
      expect(result.vulnerabilities).toEqual([]);
    });

    it("returns default on non-JSON response", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult("not valid json"));

      const result = await agent.scanVulnerabilities(makeRequest());
      expect(result.riskScore).toBe(0);
      expect(result.vulnerabilities).toEqual([]);
    });

    it("handles missing vulnerabilities array", async () => {
      const noVulns = JSON.stringify({ riskScore: 0, securePatterns: ["all good"] });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(noVulns));

      const result = await agent.scanVulnerabilities(makeRequest());
      expect(result.riskScore).toBe(0);
      expect(result.vulnerabilities).toEqual([]);
      expect(result.securePatterns).toContain("all good");
    });

    it("includes duration from elapsed time", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_SCAN));

      const result = await agent.scanVulnerabilities(makeRequest());
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("analyzePRDiff", () => {
    it("returns parsed PR diff result on success", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_PR_DIFF));

      const result = await agent.analyzePRDiff("+ const q = `SELECT ${id}`;", "auth module");

      expect(result.riskLevel).toBe("high");
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]!.type).toBe("injection");
      expect(result.summary).toContain("SQL injection");
    });

    it("defaults riskLevel to safe on invalid value", async () => {
      const invalidLevel = JSON.stringify({ ...JSON.parse(VALID_PR_DIFF), riskLevel: "unknown" });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(invalidLevel));

      const result = await agent.analyzePRDiff("diff");
      expect(result.riskLevel).toBe("safe");
    });

    it("returns default on failure", async () => {
      mockRunner.execute.mockResolvedValue({
        status: "failed",
        output: { analysis: "error" },
        tokensUsed: 5,
        model: "test-model",
        duration: 50,
      });

      const result = await agent.analyzePRDiff("diff");
      expect(result.riskLevel).toBe("safe");
      expect(result.findings).toEqual([]);
    });

    it("returns default on non-JSON response", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult("bad json"));

      const result = await agent.analyzePRDiff("diff");
      expect(result.riskLevel).toBe("safe");
    });
  });

  describe("checkOWASPCompliance", () => {
    it("returns parsed OWASP compliance result", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_OWASP));

      const result = await agent.checkOWASPCompliance({
        "auth.ts": "export function login() {}",
      });

      expect(result.complianceScore).toBe(70);
      expect(result.categories["A01-broken-access-control"]!.status).toBe("pass");
      expect(result.categories["A03-injection"]!.status).toBe("fail");
    });

    it("clamps complianceScore", async () => {
      const over = JSON.stringify({ ...JSON.parse(VALID_OWASP), complianceScore: 200 });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(over));

      const result = await agent.checkOWASPCompliance({ "a.ts": "" });
      expect(result.complianceScore).toBe(100);
    });

    it("returns default on failure", async () => {
      mockRunner.execute.mockResolvedValue({
        status: "failed",
        output: { analysis: "fail" },
        tokensUsed: 10,
        model: "test-model",
        duration: 100,
      });

      const result = await agent.checkOWASPCompliance({ "a.ts": "" });
      expect(result.complianceScore).toBe(0);
      expect(result.categories).toEqual({});
    });

    it("handles null categories gracefully", async () => {
      const nullCats = JSON.stringify({ complianceScore: 50, categories: null });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(nullCats));

      const result = await agent.checkOWASPCompliance({ "a.ts": "" });
      expect(result.categories).toEqual({});
    });
  });
});
