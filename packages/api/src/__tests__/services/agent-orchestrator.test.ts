import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "../helpers/mock-d1.js";
import { AgentOrchestrator } from "../../services/agent-orchestrator.js";
import { PlannerAgent } from "../../services/planner-agent.js";
import { MockRunner } from "../../services/claude-api-runner.js";

describe("AgentOrchestrator", () => {
  let db: ReturnType<typeof createMockD1>;
  let orchestrator: AgentOrchestrator;

  beforeEach(async () => {
    db = createMockD1();
    orchestrator = new AgentOrchestrator(db as any);

    // Seed constraints
    await db
      .prepare("INSERT INTO agent_constraints (id, tier, action, description, enforcement_mode) VALUES (?, ?, ?, ?, ?)")
      .bind("c-01", "always", "read-specs", "Must read specs", "log")
      .run();
    await db
      .prepare("INSERT INTO agent_constraints (id, tier, action, description, enforcement_mode) VALUES (?, ?, ?, ?, ?)")
      .bind("c-02", "ask", "add-dependency", "Requires approval", "block")
      .run();
    await db
      .prepare("INSERT INTO agent_constraints (id, tier, action, description, enforcement_mode) VALUES (?, ?, ?, ?, ?)")
      .bind("c-03", "never", "push-to-main", "Forbidden", "block")
      .run();
    await db
      .prepare("INSERT INTO agent_constraints (id, tier, action, description, enforcement_mode) VALUES (?, ?, ?, ?, ?)")
      .bind("c-04", "ask", "schema-change", "Requires approval", "warn")
      .run();
  });

  it("checkConstraint returns allowed for 'always' tier", async () => {
    const result = await orchestrator.checkConstraint("read-specs");
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe("always");
    expect(result.reason).toContain("always allowed");
  });

  it("checkConstraint returns allowed with reason for 'ask' tier", async () => {
    const result = await orchestrator.checkConstraint("add-dependency");
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe("ask");
    expect(result.reason).toContain("requires human approval");
  });

  it("checkConstraint returns not allowed for 'never' tier", async () => {
    const result = await orchestrator.checkConstraint("push-to-main");
    expect(result.allowed).toBe(false);
    expect(result.tier).toBe("never");
    expect(result.reason).toContain("forbidden");
  });

  it("checkConstraint returns default allow for unknown action", async () => {
    const result = await orchestrator.checkConstraint("unknown-action");
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe("always");
    expect(result.reason).toContain("No constraint defined");
  });

  it("listAgents returns active agents", async () => {
    const now = new Date().toISOString();
    await db
      .prepare("INSERT INTO agents (id, name, description, status, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind("agent-1", "Code Review", "Reviews code", "active", now)
      .run();
    await db
      .prepare("INSERT INTO agents (id, name, description, status, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind("agent-2", "Inactive Agent", "Disabled", "inactive", now)
      .run();

    const agents = await orchestrator.listAgents();
    expect(agents).toHaveLength(1);
    expect(agents[0]!.id).toBe("agent-1");
    expect(agents[0]!.name).toBe("Code Review");
    expect(agents[0]!.status).toBe("active");
  });

  it("getCapabilities returns capabilities for agent", async () => {
    const now = new Date().toISOString();
    await db
      .prepare("INSERT INTO agents (id, name, status, created_at) VALUES (?, ?, ?, ?)")
      .bind("agent-1", "Code Review", "active", now)
      .run();
    await db
      .prepare(
        "INSERT INTO agent_capabilities (id, agent_id, name, description, tools, allowed_paths, max_concurrency, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind("cap-1", "agent-1", "lint", "Run linter", '["eslint"]', '["src/"]', 2, now)
      .run();

    const caps = await orchestrator.getCapabilities("agent-1");
    expect(caps).toHaveLength(1);
    expect(caps[0]!.name).toBe("lint");
    expect(caps[0]!.tools).toEqual(["eslint"]);
    expect(caps[0]!.allowedPaths).toEqual(["src/"]);
    expect(caps[0]!.maxConcurrency).toBe(2);
  });

  it("createTask creates and returns task", async () => {
    const now = new Date().toISOString();
    await db
      .prepare("INSERT INTO agent_sessions (id, project_id, agent_name, branch, status, started_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind("sess-1", "proj-1", "agent-1", "feat/test", "active", now)
      .run();

    const task = await orchestrator.createTask("sess-1", "feat/orchestration");
    expect(task.id).toMatch(/^task-/);
    expect(task.agentSessionId).toBe("sess-1");
    expect(task.branch).toBe("feat/orchestration");
    expect(task.prStatus).toBe("draft");
    expect(task.sddVerified).toBe(false);
  });

  it("listTasks returns tasks for agent", async () => {
    const now = new Date().toISOString();
    await db
      .prepare("INSERT INTO agent_sessions (id, project_id, agent_name, branch, status, started_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind("sess-1", "proj-1", "agent-code-review", "feat/test", "active", now)
      .run();
    await db
      .prepare("INSERT INTO agent_tasks (id, agent_session_id, branch, pr_status, sdd_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind("task-1", "sess-1", "feat/review", "open", 1, now, now)
      .run();

    const tasks = await orchestrator.listTasks("agent-code-review");
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.branch).toBe("feat/review");
    expect(tasks[0]!.prStatus).toBe("open");
    expect(tasks[0]!.sddVerified).toBe(true);
  });

  // ─── Sprint 10: executeTask / getTaskResult tests ───

  it("executeTask creates session + task, runs runner, and records result", async () => {
    const runner = new MockRunner();

    const result = await orchestrator.executeTask(
      "agent-code-review",
      "code-review",
      {
        repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
        branch: "feat/test",
        targetFiles: ["src/index.ts"],
      },
      runner,
    );

    expect(result.status).toBe("success");
    expect(result.output.analysis).toContain("[Mock]");
    expect(result.model).toBe("mock");

    // Verify session was created
    const { results: sessions } = await db
      .prepare("SELECT * FROM agent_sessions WHERE agent_name = ?")
      .bind("agent-code-review")
      .all();
    expect(sessions.length).toBeGreaterThanOrEqual(1);
    const session = sessions[sessions.length - 1] as any;
    expect(session.status).toBe("completed");

    // Verify task was created with result
    const { results: tasks } = await db
      .prepare("SELECT * FROM agent_tasks WHERE agent_session_id = ?")
      .bind(session.id)
      .all();
    expect(tasks).toHaveLength(1);
    const task = tasks[0] as any;
    expect(task.task_type).toBe("code-review");
    expect(task.runner_type).toBe("mock");
    expect(task.result).toBeTruthy();
  });

  it("executeTask records failed status on runner failure", async () => {
    const failRunner = new MockRunner();
    // Override execute to simulate failure
    failRunner.execute = async () => ({
      status: "failed" as const,
      output: { analysis: "Error occurred" },
      tokensUsed: 0,
      model: "mock",
      duration: 50,
    });

    const result = await orchestrator.executeTask(
      "agent-broken",
      "code-review",
      {
        repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
        branch: "feat/fail",
      },
      failRunner,
    );

    expect(result.status).toBe("failed");

    // Verify session status is "failed"
    const { results: sessions } = await db
      .prepare("SELECT * FROM agent_sessions WHERE agent_name = ?")
      .bind("agent-broken")
      .all();
    const session = sessions[sessions.length - 1] as any;
    expect(session.status).toBe("failed");
  });

  it("getTaskResult returns task and result for existing task", async () => {
    const runner = new MockRunner();
    await orchestrator.executeTask(
      "agent-result-test",
      "spec-analysis",
      {
        repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
        branch: "feat/result",
      },
      runner,
    );

    // Find the created task
    const { results: tasks } = await db
      .prepare("SELECT id FROM agent_tasks ORDER BY created_at DESC LIMIT 1")
      .all();
    const taskId = (tasks[0] as any).id;

    const taskResult = await orchestrator.getTaskResult(taskId);
    expect(taskResult).not.toBeNull();
    expect(taskResult!.task.id).toBe(taskId);
    expect(taskResult!.task.prStatus).toBe("draft");
    expect(taskResult!.result).toBeTruthy();
    expect((taskResult!.result as any).analysis).toContain("[Mock]");
  });

  it("getTaskResult returns null for non-existent task", async () => {
    const taskResult = await orchestrator.getTaskResult("non-existent-task");
    expect(taskResult).toBeNull();
  });

  describe("executePlan repoUrl", () => {
    let planner: PlannerAgent;

    beforeEach(() => {
      planner = new PlannerAgent({ db: db as any });
      orchestrator.setPlannerAgent(planner);
    });

    async function seedApprovedPlan(planId: string, agentId: string) {
      const now = new Date().toISOString();
      await db.prepare(
        `INSERT INTO agent_plans (id, task_id, agent_id, codebase_analysis, proposed_steps, estimated_files, risks, estimated_tokens, status, created_at, approved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)`,
      ).bind(
        planId, "task-1", agentId, "analysis",
        JSON.stringify([{ type: "create", description: "Create file", targetFile: "src/foo.ts" }]),
        1, "[]", 500, now, now,
      ).run();
    }

    it("passes repoUrl from options to execution context", async () => {
      await seedApprovedPlan("plan-url-1", "agent-url-1");
      const runner = new MockRunner();
      const result = await orchestrator.executePlan("plan-url-1", runner, {
        repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
        branch: "feat/test",
      });
      expect(result.status).toBe("success");
      // Verify plan status updated
      const plan = await planner.getPlan("plan-url-1");
      expect(plan?.status).toBe("completed");
    });

    it("uses empty repoUrl when options not provided (backward compat)", async () => {
      await seedApprovedPlan("plan-url-2", "agent-url-2");
      const runner = new MockRunner();
      const result = await orchestrator.executePlan("plan-url-2", runner);
      expect(result.status).toBe("success");
    });

    it("uses provided branch from options", async () => {
      await seedApprovedPlan("plan-url-3", "agent-url-3");
      const runner = new MockRunner();
      const result = await orchestrator.executePlan("plan-url-3", runner, {
        branch: "develop",
      });
      expect(result.status).toBe("success");
    });
  });
});
