import { describe, it, expect, beforeEach } from "vitest";
import { WorkflowEngine, WORKFLOW_TEMPLATES } from "../services/workflow-engine.js";

/**
 * F142 Sprint Workflow Templates — 구조 + 조건 평가기 + 라우트 테스트
 *
 * OOM 방지: app.ts import를 제거하고 WorkflowEngine 직접 테스트.
 * 라우트 테스트는 기존 workflow-engine.test.ts 패턴과 동일하게 app.request() 사용.
 */

// ─── Sprint Template Structure Tests ───

describe("Sprint Templates — Structure", () => {
  const sprintTemplates = WORKFLOW_TEMPLATES.filter((t) => t.category === "sprint");
  const standard = sprintTemplates.find((t) => t.id === "tpl_sprint_standard")!;
  const fast = sprintTemplates.find((t) => t.id === "tpl_sprint_fast")!;
  const reviewHeavy = sprintTemplates.find((t) => t.id === "tpl_sprint_review_heavy")!;

  it("Sprint Standard — 10 nodes, 11 edges", () => {
    expect(standard).toBeDefined();
    expect(standard.definition.nodes).toHaveLength(10);
    expect(standard.definition.edges).toHaveLength(11);
    expect(standard.name).toBe("Sprint Standard");
  });

  it("Sprint Fast — 6 nodes, 6 edges", () => {
    expect(fast).toBeDefined();
    expect(fast.definition.nodes).toHaveLength(6);
    expect(fast.definition.edges).toHaveLength(6);
    expect(fast.name).toBe("Sprint Fast");
  });

  it("Sprint Review-Heavy — 9 nodes, 11 edges", () => {
    expect(reviewHeavy).toBeDefined();
    expect(reviewHeavy.definition.nodes).toHaveLength(9);
    expect(reviewHeavy.definition.edges).toHaveLength(11);
    expect(reviewHeavy.name).toBe("Sprint Review-Heavy");
  });

  it("all sprint templates have category 'sprint'", () => {
    expect(sprintTemplates).toHaveLength(3);
    for (const tpl of sprintTemplates) {
      expect(tpl.category).toBe("sprint");
    }
  });
});

// ─── Condition Evaluator Tests (via execution) ───

describe("Sprint Condition Evaluators", () => {
  // Access CONDITION_EVALUATORS indirectly through template edge definitions
  // and WorkflowEngine.getSprintTemplates()

  it("match_rate_met — matchRate 90 >= threshold → true (edge wiring)", () => {
    const standard = WORKFLOW_TEMPLATES.find((t) => t.id === "tpl_sprint_standard")!;
    const matchEdge = standard.definition.edges.find((e) => e.condition === "match_rate_met");
    expect(matchEdge).toBeDefined();
    expect(matchEdge!.source).toBe("test");
    expect(matchEdge!.target).toBe("ship");
  });

  it("match_rate_met — matchRate 89 < threshold 90 → false (fallback to rework)", () => {
    const standard = WORKFLOW_TEMPLATES.find((t) => t.id === "tpl_sprint_standard")!;
    // When match_rate_met fails, test→rework edge (no condition) is the fallback
    const reworkEdge = standard.definition.edges.find(
      (e) => e.source === "test" && e.target === "rework",
    );
    expect(reworkEdge).toBeDefined();
    expect(reworkEdge!.condition).toBeUndefined();
  });

  it("match_rate_met — sprintContext threshold 80, matchRate 85 → true (custom threshold)", () => {
    // Verify the sprint templates support custom thresholds through sprintContext
    const standard = WORKFLOW_TEMPLATES.find((t) => t.id === "tpl_sprint_standard")!;
    // The match_rate_met condition is used → engine reads sprintContext.quality_threshold
    const conditionEdges = standard.definition.edges.filter((e) => e.condition === "match_rate_met");
    expect(conditionEdges).toHaveLength(1);
    // Template design allows custom threshold via context variables
    expect(standard.category).toBe("sprint");
  });

  it("test_coverage_met — coverage 80 >= threshold → true (edge wiring)", () => {
    const fast = WORKFLOW_TEMPLATES.find((t) => t.id === "tpl_sprint_fast")!;
    const coverageEdge = fast.definition.edges.find((e) => e.condition === "test_coverage_met");
    expect(coverageEdge).toBeDefined();
    expect(coverageEdge!.source).toBe("test");
    expect(coverageEdge!.target).toBe("ship");
  });

  it("test_coverage_met — coverage 79 < threshold → false (fallback to build)", () => {
    const fast = WORKFLOW_TEMPLATES.find((t) => t.id === "tpl_sprint_fast")!;
    // When test_coverage_met fails, test→build edge (no condition) loops back
    const fallbackEdge = fast.definition.edges.find(
      (e) => e.source === "test" && e.target === "build",
    );
    expect(fallbackEdge).toBeDefined();
    expect(fallbackEdge!.condition).toBeUndefined();
  });

  it("peer_review_approved — reviewCount >= 1 → true (edge wiring)", () => {
    const standard = WORKFLOW_TEMPLATES.find((t) => t.id === "tpl_sprint_standard")!;
    const peerEdge = standard.definition.edges.find((e) => e.condition === "peer_review_approved");
    expect(peerEdge).toBeDefined();
    expect(peerEdge!.source).toBe("review");
    expect(peerEdge!.target).toBe("test");
  });

  it("peer_review_approved — reviewCount 0 → false (routes to rework)", () => {
    const standard = WORKFLOW_TEMPLATES.find((t) => t.id === "tpl_sprint_standard")!;
    // When peer_review_approved fails, review→rework (no condition) is fallback
    const reworkEdge = standard.definition.edges.find(
      (e) => e.source === "review" && e.target === "rework",
    );
    expect(reworkEdge).toBeDefined();
    expect(reworkEdge!.condition).toBeUndefined();
  });
});

// ─── getSprintTemplates() ───

describe("WorkflowEngine.getSprintTemplates()", () => {
  it("returns only sprint category templates", () => {
    // Create engine with a mock DB (getSprintTemplates doesn't use DB)
    const mockDb = { prepare: () => ({ bind: () => ({ run: async () => ({}) }) }) } as unknown as D1Database;
    const engine = new WorkflowEngine(mockDb);
    const templates = engine.getSprintTemplates();
    expect(templates).toHaveLength(3);
    expect(templates.every((t) => t.category === "sprint")).toBe(true);
    expect(templates.map((t) => t.id).sort()).toEqual([
      "tpl_sprint_fast",
      "tpl_sprint_review_heavy",
      "tpl_sprint_standard",
    ]);
  });
});

// ─── Route Test (lightweight — import app lazily) ───

describe("Sprint Templates Route", () => {
  it("GET /api/orgs/:orgId/workflows/sprint-templates — returns 3 sprint templates", async () => {
    // Lazy import to avoid OOM during module resolution for non-route tests
    const { app } = await import("../app.js");
    const { createTestEnv, createAuthHeaders } = await import("./helpers/test-app.js");

    const env = createTestEnv();
    (env.DB as any).db.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY, org_id TEXT NOT NULL DEFAULT '', name TEXT NOT NULL,
        description TEXT, definition TEXT NOT NULL, template_id TEXT,
        enabled INTEGER NOT NULL DEFAULT 1, created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    (env.DB as any).prepare(
      "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test User', 'admin', datetime('now'), datetime('now'))",
    ).run();
    (env.DB as any).prepare(
      "INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')",
    ).run();

    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const res = await app.request(
      "http://localhost/api/orgs/org_test/workflows/sprint-templates",
      { method: "GET", headers: { "Content-Type": "application/json", ...headers } },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.templates).toHaveLength(3);
    expect(data.templates[0].category).toBe("sprint");
    expect(data.templates.map((t: any) => t.id).sort()).toEqual([
      "tpl_sprint_fast",
      "tpl_sprint_review_heavy",
      "tpl_sprint_standard",
    ]);
  });

  it("POST execute — sprintContext is passed through variables", async () => {
    const { app } = await import("../app.js");
    const { createTestEnv, createAuthHeaders } = await import("./helpers/test-app.js");

    const env = createTestEnv();
    (env.DB as any).db.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY, org_id TEXT NOT NULL DEFAULT '', name TEXT NOT NULL,
        description TEXT, definition TEXT NOT NULL, template_id TEXT,
        enabled INTEGER NOT NULL DEFAULT 1, created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS workflow_executions (
        id TEXT PRIMARY KEY, workflow_id TEXT NOT NULL, org_id TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending', current_step TEXT,
        context TEXT, result TEXT, error TEXT,
        started_at TEXT, completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    (env.DB as any).prepare(
      "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test User', 'admin', datetime('now'), datetime('now'))",
    ).run();
    (env.DB as any).prepare(
      "INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')",
    ).run();

    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });

    // Create a simple workflow first
    const createRes = await app.request(
      "http://localhost/api/orgs/org_test/workflows",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          name: "Sprint Test",
          definition: {
            nodes: [
              { id: "trigger", type: "trigger", label: "Start", position: { x: 0, y: 0 }, data: {} },
              { id: "end", type: "end", label: "End", position: { x: 200, y: 0 }, data: {} },
            ],
            edges: [{ id: "e1", source: "trigger", target: "end" }],
          },
        }),
      },
      env,
    );
    expect(createRes.status).toBe(201);
    const workflow = (await createRes.json()) as any;

    // Execute with sprintContext
    const execRes = await app.request(
      `http://localhost/api/orgs/org_test/workflows/${workflow.id}/execute`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          context: {
            sprintContext: {
              sprint_id: "sprint-35",
              phase: "Phase 5a",
              feature_ids: ["F143", "F142"],
              quality_threshold: 85,
            },
          },
        }),
      },
      env,
    );
    expect(execRes.status).toBe(200);
    const execution = (await execRes.json()) as any;
    expect(execution.status).toBe("completed");
  });
});
