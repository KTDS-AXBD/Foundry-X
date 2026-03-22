import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { InfraAgent } from "../services/infra-agent.js";
import type { AgentExecutionRequest, AgentExecutionResult } from "../services/execution-types.js";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

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

vi.mock("../services/agent-runner.js", () => ({
  createRoutedRunner: vi.fn().mockResolvedValue(mockRunner),
  createAgentRunner: vi.fn().mockReturnValue(mockRunner),
}));

function makeRequest(overrides?: Partial<AgentExecutionRequest>): AgentExecutionRequest {
  return {
    taskId: "task-infra-001",
    agentId: "infra-agent",
    taskType: "infra-analysis",
    context: {
      repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
      branch: "master",
      targetFiles: ["wrangler.toml"],
      fileContents: { "wrangler.toml": 'name = "foundry-x-api"\ncompatibility_date = "2024-01-01"' },
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

const VALID_ANALYSIS = JSON.stringify({
  healthScore: 85,
  resources: [
    { type: "workers", name: "foundry-x-api", status: "healthy", details: "Properly configured" },
    { type: "d1", name: "foundry-x-db", status: "healthy", details: "37 tables" },
  ],
  optimizations: [
    { category: "performance", suggestion: "Enable smart placement", impact: "medium" },
  ],
  compatibilityFlags: ["nodejs_compat"],
});

const VALID_SIMULATION = JSON.stringify({
  riskLevel: "medium",
  affectedResources: [
    { type: "d1", name: "foundry-x-db", impact: "Schema change in 3 tables" },
  ],
  rollbackPlan: {
    steps: ["Revert migration 0024", "Redeploy previous worker version"],
    estimatedTime: "5 minutes",
    automated: true,
  },
  estimatedDowntime: "seconds",
  wranglerDiff: "Added new D1 binding",
});

const VALID_MIGRATION = JSON.stringify({
  safe: true,
  riskScore: 15,
  issues: [
    {
      severity: "low",
      type: "missing-index",
      description: "No index on frequently queried column",
      suggestion: "Add CREATE INDEX on created_at",
      line: 5,
    },
  ],
  schemaChanges: [
    { operation: "CREATE TABLE", target: "infra_checks", details: "New table for infra monitoring" },
  ],
});

const UNSAFE_MIGRATION = JSON.stringify({
  safe: false,
  riskScore: 90,
  issues: [
    {
      severity: "critical",
      type: "destructive",
      description: "DROP COLUMN will lose data",
      suggestion: "Create new table and migrate data instead",
      line: 3,
    },
    {
      severity: "high",
      type: "fk-violation",
      description: "Foreign key references non-existent table",
      suggestion: "Ensure referenced table exists before this migration",
      line: 7,
    },
  ],
  schemaChanges: [
    { operation: "ALTER TABLE", target: "agents", details: "DROP COLUMN description" },
  ],
});

describe("InfraAgent", () => {
  let agent: InfraAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new InfraAgent({
      env: { ANTHROPIC_API_KEY: "test-key" },
    });
  });

  describe("analyzeInfra", () => {
    it("returns parsed analysis result on success", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_ANALYSIS));

      const result = await agent.analyzeInfra(makeRequest());

      expect(result.healthScore).toBe(85);
      expect(result.resources).toHaveLength(2);
      expect(result.resources[0]!.type).toBe("workers");
      expect(result.resources[0]!.status).toBe("healthy");
      expect(result.optimizations).toHaveLength(1);
      expect(result.optimizations[0]!.category).toBe("performance");
      expect(result.compatibilityFlags).toContain("nodejs_compat");
      expect(result.tokensUsed).toBe(200);
      expect(result.model).toBe("test-model");
    });

    it("clamps healthScore to 0-100 range", async () => {
      const overScore = JSON.stringify({ ...JSON.parse(VALID_ANALYSIS), healthScore: 150 });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(overScore));

      const result = await agent.analyzeInfra(makeRequest());
      expect(result.healthScore).toBe(100);
    });

    it("clamps negative healthScore to 0", async () => {
      const underScore = JSON.stringify({ ...JSON.parse(VALID_ANALYSIS), healthScore: -10 });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(underScore));

      const result = await agent.analyzeInfra(makeRequest());
      expect(result.healthScore).toBe(0);
    });

    it("returns default on failed result", async () => {
      mockRunner.execute.mockResolvedValue({
        status: "failed",
        output: { analysis: "error" },
        tokensUsed: 10,
        model: "test-model",
        duration: 100,
      });

      const result = await agent.analyzeInfra(makeRequest());
      expect(result.healthScore).toBe(0);
      expect(result.resources).toEqual([]);
      expect(result.optimizations).toEqual([]);
      expect(result.compatibilityFlags).toEqual([]);
    });

    it("returns default on non-JSON response", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult("not valid json"));

      const result = await agent.analyzeInfra(makeRequest());
      expect(result.healthScore).toBe(0);
      expect(result.resources).toEqual([]);
    });

    it("handles missing resources array", async () => {
      const noResources = JSON.stringify({ healthScore: 50, optimizations: [] });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(noResources));

      const result = await agent.analyzeInfra(makeRequest());
      expect(result.healthScore).toBe(50);
      expect(result.resources).toEqual([]);
    });

    it("includes duration from elapsed time", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_ANALYSIS));

      const result = await agent.analyzeInfra(makeRequest());
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("simulateChange", () => {
    it("returns parsed simulation result on success", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_SIMULATION));

      const result = await agent.simulateChange("Add new D1 binding", "name = 'foundry-x-api'");

      expect(result.riskLevel).toBe("medium");
      expect(result.affectedResources).toHaveLength(1);
      expect(result.affectedResources[0]!.type).toBe("d1");
      expect(result.rollbackPlan.steps).toHaveLength(2);
      expect(result.rollbackPlan.automated).toBe(true);
      expect(result.estimatedDowntime).toBe("seconds");
      expect(result.wranglerDiff).toContain("D1 binding");
    });

    it("defaults riskLevel to safe on invalid value", async () => {
      const invalidLevel = JSON.stringify({ ...JSON.parse(VALID_SIMULATION), riskLevel: "unknown" });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(invalidLevel));

      const result = await agent.simulateChange("test");
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

      const result = await agent.simulateChange("test");
      expect(result.riskLevel).toBe("safe");
      expect(result.affectedResources).toEqual([]);
      expect(result.rollbackPlan.steps).toEqual([]);
    });

    it("returns default on non-JSON response", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult("bad json"));

      const result = await agent.simulateChange("test");
      expect(result.riskLevel).toBe("safe");
    });

    it("handles null rollbackPlan gracefully", async () => {
      const noRollback = JSON.stringify({ riskLevel: "low", rollbackPlan: null });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(noRollback));

      const result = await agent.simulateChange("test");
      expect(result.rollbackPlan.steps).toEqual([]);
      expect(result.rollbackPlan.estimatedTime).toBe("unknown");
    });

    it("defaults estimatedDowntime to none on invalid value", async () => {
      const badDowntime = JSON.stringify({ ...JSON.parse(VALID_SIMULATION), estimatedDowntime: "forever" });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(badDowntime));

      const result = await agent.simulateChange("test");
      expect(result.estimatedDowntime).toBe("none");
    });
  });

  describe("validateMigration", () => {
    it("returns parsed safe migration result", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_MIGRATION));

      const result = await agent.validateMigration("CREATE TABLE infra_checks (id TEXT PRIMARY KEY);");

      expect(result.safe).toBe(true);
      expect(result.riskScore).toBe(15);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]!.severity).toBe("low");
      expect(result.schemaChanges).toHaveLength(1);
      expect(result.schemaChanges[0]!.operation).toBe("CREATE TABLE");
    });

    it("detects FK violation and DROP COLUMN warnings", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(UNSAFE_MIGRATION));

      const result = await agent.validateMigration("ALTER TABLE agents DROP COLUMN description;");

      expect(result.safe).toBe(false);
      expect(result.riskScore).toBe(90);
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0]!.type).toBe("destructive");
      expect(result.issues[0]!.severity).toBe("critical");
      expect(result.issues[1]!.type).toBe("fk-violation");
    });

    it("clamps riskScore to 0-100 range", async () => {
      const overScore = JSON.stringify({ ...JSON.parse(VALID_MIGRATION), riskScore: 200 });
      mockRunner.execute.mockResolvedValue(makeSuccessResult(overScore));

      const result = await agent.validateMigration("CREATE TABLE t (id TEXT);");
      expect(result.riskScore).toBe(100);
    });

    it("returns default on failure (safe=false, riskScore=100)", async () => {
      mockRunner.execute.mockResolvedValue({
        status: "failed",
        output: { analysis: "error" },
        tokensUsed: 10,
        model: "test-model",
        duration: 100,
      });

      const result = await agent.validateMigration("SELECT 1;");
      expect(result.safe).toBe(false);
      expect(result.riskScore).toBe(100);
      expect(result.issues).toEqual([]);
    });

    it("returns default on non-JSON response", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult("not json"));

      const result = await agent.validateMigration("SELECT 1;");
      expect(result.safe).toBe(false);
      expect(result.riskScore).toBe(100);
    });

    it("handles empty SQL with existing schema context", async () => {
      mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_MIGRATION));

      const result = await agent.validateMigration(
        "CREATE INDEX idx_ts ON events(created_at);",
        "CREATE TABLE events (id TEXT PRIMARY KEY, created_at TEXT);",
      );

      expect(result.safe).toBe(true);
      expect(result.tokensUsed).toBe(200);
    });
  });
});

// ─── API Endpoint Tests ───

describe("InfraAgent API Endpoints", () => {
  let env: ReturnType<typeof createTestEnv>;
  let authHeader: Record<string, string>;

  beforeAll(async () => {
    authHeader = await createAuthHeaders({ role: "admin" });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    env = createTestEnv();
    mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_ANALYSIS));
  });

  it("POST /agents/infra/analyze returns 200", async () => {
    const res = await app.request(
      "/api/agents/infra/analyze",
      {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: "infra-analysis",
          context: {
            repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
            branch: "master",
            fileContents: { "wrangler.toml": "name = 'test'" },
          },
        }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.healthScore).toBeDefined();
    expect(data.resources).toBeDefined();
    expect(data.tokensUsed).toBeDefined();
  });

  it("POST /agents/infra/simulate returns 200", async () => {
    mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_SIMULATION));

    const res = await app.request(
      "/api/agents/infra/simulate",
      {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "Add new KV namespace binding",
        }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.riskLevel).toBeDefined();
    expect(data.rollbackPlan).toBeDefined();
    expect(data.tokensUsed).toBeDefined();
  });

  it("POST /agents/infra/validate-migration returns 200", async () => {
    mockRunner.execute.mockResolvedValue(makeSuccessResult(VALID_MIGRATION));

    const res = await app.request(
      "/api/agents/infra/validate-migration",
      {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          sql: "CREATE TABLE test_table (id TEXT PRIMARY KEY, name TEXT NOT NULL);",
        }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.safe).toBeDefined();
    expect(data.riskScore).toBeDefined();
    expect(data.issues).toBeDefined();
    expect(data.schemaChanges).toBeDefined();
  });
});
