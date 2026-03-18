import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "../helpers/mock-d1.js";
import { AgentOrchestrator } from "../../services/agent-orchestrator.js";

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
});
