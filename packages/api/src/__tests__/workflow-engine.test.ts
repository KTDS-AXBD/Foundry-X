import { describe, it, expect, beforeEach } from "vitest";
import { createTestEnv } from "./helpers/test-app.js";
import { WorkflowEngine, WORKFLOW_TEMPLATES } from "../agent/services/workflow-engine.js";

let env: ReturnType<typeof createTestEnv>;

function seedDb(sql: string) {
  (env.DB as any).prepare(sql).run();
}

function createSprint24Tables() {
  (env.DB as any).db.exec(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      description TEXT,
      definition TEXT NOT NULL,
      template_id TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS workflow_executions (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      org_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      current_step TEXT,
      context TEXT,
      result TEXT,
      error TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

const sampleDefinition = {
  nodes: [
    { id: "trigger", type: "trigger" as const, label: "Start", position: { x: 0, y: 0 }, data: {} },
    { id: "action1", type: "action" as const, label: "Run Agent", position: { x: 200, y: 0 }, data: { actionType: "run_agent" as const } },
    { id: "end", type: "end" as const, label: "End", position: { x: 400, y: 0 }, data: {} },
  ],
  edges: [
    { id: "e1", source: "trigger", target: "action1" },
    { id: "e2", source: "action1", target: "end" },
  ],
};

beforeEach(() => {
  env = createTestEnv();
  createSprint24Tables();
  seedDb(
    "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test User', 'admin', datetime('now'), datetime('now'))"
  );
  seedDb(
    "INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')"
  );
});

describe("WorkflowEngine", () => {
  it("creates and lists workflows", async () => {
    const engine = new WorkflowEngine(env.DB as unknown as D1Database);
    const workflow = await engine.create("org_test", "test-user", {
      name: "Test Workflow",
      description: "A test workflow",
      definition: sampleDefinition,
    });
    expect(workflow.id).toBeTruthy();
    expect(workflow.name).toBe("Test Workflow");
    expect(workflow.enabled).toBe(true);

    const list = await engine.list("org_test");
    expect(list).toHaveLength(1);
  });

  it("gets workflow by id", async () => {
    const engine = new WorkflowEngine(env.DB as unknown as D1Database);
    const created = await engine.create("org_test", "test-user", {
      name: "Get Test",
      definition: sampleDefinition,
    });

    const workflow = await engine.get("org_test", created.id);
    expect(workflow).not.toBeNull();
    expect(workflow!.name).toBe("Get Test");
  });

  it("returns null for non-existent workflow", async () => {
    const engine = new WorkflowEngine(env.DB as unknown as D1Database);
    const workflow = await engine.get("org_test", "nonexistent");
    expect(workflow).toBeNull();
  });

  it("updates workflow", async () => {
    const engine = new WorkflowEngine(env.DB as unknown as D1Database);
    const created = await engine.create("org_test", "test-user", {
      name: "Before Update",
      definition: sampleDefinition,
    });

    const updated = await engine.update("org_test", created.id, { name: "After Update" });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("After Update");
  });

  it("deletes workflow", async () => {
    const engine = new WorkflowEngine(env.DB as unknown as D1Database);
    const created = await engine.create("org_test", "test-user", {
      name: "Delete Me",
      definition: sampleDefinition,
    });

    const deleted = await engine.delete("org_test", created.id);
    expect(deleted).toBe(true);

    const list = await engine.list("org_test");
    expect(list).toHaveLength(0);
  });

  it("executes a simple workflow", async () => {
    const engine = new WorkflowEngine(env.DB as unknown as D1Database);
    const created = await engine.create("org_test", "test-user", {
      name: "Execute Test",
      definition: sampleDefinition,
    });

    const execution = await engine.execute("org_test", created.id);
    expect(execution.workflow_id).toBe(created.id);
    expect(execution.status).toBe("completed");
    expect(execution.started_at).toBeTruthy();
  });

  it("marks execution as failed when no trigger node", async () => {
    const engine = new WorkflowEngine(env.DB as unknown as D1Database);
    const noTriggerDef = {
      nodes: [{ id: "end", type: "end" as const, label: "End", position: { x: 0, y: 0 }, data: {} }],
      edges: [],
    };

    const created = await engine.create("org_test", "test-user", {
      name: "No Trigger",
      definition: noTriggerDef,
    });

    const execution = await engine.execute("org_test", created.id);
    expect(execution.status).toBe("failed");
    expect(execution.error).toContain("No trigger node");
  });
});

describe("WORKFLOW_TEMPLATES", () => {
  it("includes 6 templates (3 general + 3 sprint)", () => {
    expect(WORKFLOW_TEMPLATES).toHaveLength(6);
    expect(WORKFLOW_TEMPLATES[0]!.id).toBe("tpl_pr_review");
    expect(WORKFLOW_TEMPLATES[1]!.id).toBe("tpl_analysis");
    expect(WORKFLOW_TEMPLATES[2]!.id).toBe("tpl_auto_pr");
    expect(WORKFLOW_TEMPLATES[3]!.id).toBe("tpl_sprint_standard");
    expect(WORKFLOW_TEMPLATES[4]!.id).toBe("tpl_sprint_fast");
    expect(WORKFLOW_TEMPLATES[5]!.id).toBe("tpl_sprint_review_heavy");
  });
});
