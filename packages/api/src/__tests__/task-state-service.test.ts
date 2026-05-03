// ─── F333: TaskStateService + Route 통합 테스트 (Sprint 148) ───

import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { TaskStateService } from "../services/agent/task-state-service.js";
import { createDefaultGuard } from "../core/harness/services/transition-guard.js";
import { taskStateRoute } from "../services/agent/task-state.js";
import { TaskState } from "@foundry-x/shared";
import { Hono } from "hono";
import type { Env } from "../env.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS task_states (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    current_state TEXT NOT NULL DEFAULT 'INTAKE',
    agent_id TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_task_states_task ON task_states(task_id, tenant_id);
  CREATE INDEX IF NOT EXISTS idx_task_states_tenant ON task_states(tenant_id, current_state);
  CREATE TABLE IF NOT EXISTS task_state_history (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    from_state TEXT NOT NULL,
    to_state TEXT NOT NULL,
    trigger_source TEXT,
    trigger_event TEXT,
    guard_result TEXT,
    transitioned_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_tsh_task ON task_state_history(task_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_tsh_tenant ON task_state_history(tenant_id, created_at DESC);
`;

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", taskStateRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

const exec = (db: D1Database, q: string) =>
  (db as unknown as { exec: (q: string) => Promise<void> }).exec(q);

// ─── Service 단위 테스트 ───

describe("TaskStateService", () => {
  let db: D1Database;
  let svc: TaskStateService;

  beforeEach(async () => {
    db = createMockD1() as unknown as D1Database;
    await exec(db, DDL);
    svc = new TaskStateService(db, createDefaultGuard());
  });

  it("creates task in INTAKE state", async () => {
    const record = await svc.createTask("task-1", "org_test");
    expect(record.currentState).toBe(TaskState.INTAKE);
    expect(record.taskId).toBe("task-1");
    expect(record.tenantId).toBe("org_test");
  });

  it("getState returns created task", async () => {
    await svc.createTask("task-1", "org_test");
    const state = await svc.getState("task-1", "org_test");
    expect(state).not.toBeNull();
    expect(state!.currentState).toBe(TaskState.INTAKE);
  });

  it("getState returns null for missing task", async () => {
    const state = await svc.getState("nonexistent", "org_test");
    expect(state).toBeNull();
  });

  it("transitions INTAKE → SPEC_DRAFTING", async () => {
    await svc.createTask("task-1", "org_test");
    const result = await svc.transition(
      { taskId: "task-1", toState: TaskState.SPEC_DRAFTING },
      "org_test",
    );
    expect(result.success).toBe(true);
    expect(result.fromState).toBe(TaskState.INTAKE);
    expect(result.toState).toBe(TaskState.SPEC_DRAFTING);
  });

  it("updates state after transition", async () => {
    await svc.createTask("task-1", "org_test");
    await svc.transition({ taskId: "task-1", toState: TaskState.SPEC_DRAFTING }, "org_test");
    const state = await svc.getState("task-1", "org_test");
    expect(state!.currentState).toBe(TaskState.SPEC_DRAFTING);
  });

  it("records history after transition", async () => {
    await svc.createTask("task-1", "org_test");
    await svc.transition({ taskId: "task-1", toState: TaskState.SPEC_DRAFTING }, "org_test");
    const history = await svc.getHistory("task-1", "org_test");
    expect(history).toHaveLength(1);
    expect(history[0]!.fromState).toBe(TaskState.INTAKE);
    expect(history[0]!.toState).toBe(TaskState.SPEC_DRAFTING);
  });

  it("rejects invalid transition", async () => {
    await svc.createTask("task-1", "org_test");
    const result = await svc.transition(
      { taskId: "task-1", toState: TaskState.COMPLETED },
      "org_test",
    );
    expect(result.success).toBe(false);
    expect(result.guardMessage).toBeDefined();
  });

  it("rejects transition for missing task", async () => {
    const result = await svc.transition(
      { taskId: "nonexistent", toState: TaskState.SPEC_DRAFTING },
      "org_test",
    );
    expect(result.success).toBe(false);
    expect(result.guardMessage).toContain("not found");
  });

  it("sequential transitions: INTAKE→SPEC→CODE→TEST", async () => {
    await svc.createTask("task-1", "org_test");
    await svc.transition({ taskId: "task-1", toState: TaskState.SPEC_DRAFTING }, "org_test");
    await svc.transition({ taskId: "task-1", toState: TaskState.CODE_GENERATING }, "org_test");
    const result = await svc.transition(
      { taskId: "task-1", toState: TaskState.TEST_RUNNING },
      "org_test",
    );
    expect(result.success).toBe(true);
    const state = await svc.getState("task-1", "org_test");
    expect(state!.currentState).toBe(TaskState.TEST_RUNNING);
  });

  it("FEEDBACK_LOOP entry and exit", async () => {
    await svc.createTask("task-1", "org_test");
    await svc.transition({ taskId: "task-1", toState: TaskState.SPEC_DRAFTING }, "org_test");
    await svc.transition({ taskId: "task-1", toState: TaskState.FEEDBACK_LOOP }, "org_test");
    const state = await svc.getState("task-1", "org_test");
    expect(state!.currentState).toBe(TaskState.FEEDBACK_LOOP);

    // Exit loop back to SPEC_DRAFTING
    const result = await svc.transition(
      { taskId: "task-1", toState: TaskState.SPEC_DRAFTING },
      "org_test",
    );
    expect(result.success).toBe(true);
  });

  it("FAILED → INTAKE restart", async () => {
    await svc.createTask("task-1", "org_test");
    await svc.transition({ taskId: "task-1", toState: TaskState.SPEC_DRAFTING }, "org_test");
    await svc.transition({ taskId: "task-1", toState: TaskState.FEEDBACK_LOOP }, "org_test");
    await svc.transition({ taskId: "task-1", toState: TaskState.FAILED }, "org_test");
    const result = await svc.transition(
      { taskId: "task-1", toState: TaskState.INTAKE },
      "org_test",
    );
    expect(result.success).toBe(true);
  });

  it("createTask with metadata", async () => {
    const record = await svc.createTask("task-1", "org_test", "agent-1", { key: "value" });
    expect(record.agentId).toBe("agent-1");
    expect(record.metadata).toEqual({ key: "value" });
  });

  it("metadata persists in getState", async () => {
    await svc.createTask("task-1", "org_test", undefined, { foo: "bar" });
    const state = await svc.getState("task-1", "org_test");
    expect(state!.metadata).toEqual({ foo: "bar" });
  });

  it("triggerSource is recorded in history", async () => {
    await svc.createTask("task-1", "org_test");
    await svc.transition(
      { taskId: "task-1", toState: TaskState.SPEC_DRAFTING, triggerSource: "manual" },
      "org_test",
    );
    const history = await svc.getHistory("task-1", "org_test");
    expect(history[0]!.triggerSource).toBe("manual");
  });

  it("listByState returns filtered list", async () => {
    await svc.createTask("task-1", "org_test");
    await svc.createTask("task-2", "org_test");
    await svc.transition({ taskId: "task-2", toState: TaskState.SPEC_DRAFTING }, "org_test");
    const result = await svc.listByState("org_test", TaskState.INTAKE);
    expect(result.total).toBe(1);
    expect(result.items[0]!.taskId).toBe("task-1");
  });

  it("listByState without state filter returns all", async () => {
    await svc.createTask("task-1", "org_test");
    await svc.createTask("task-2", "org_test");
    const result = await svc.listByState("org_test");
    expect(result.total).toBe(2);
  });

  it("listByState respects limit and offset", async () => {
    for (let i = 0; i < 5; i++) {
      await svc.createTask(`task-${i}`, "org_test");
    }
    const result = await svc.listByState("org_test", undefined, 2, 1);
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(5);
  });

  it("getDetail returns state + history + available transitions", async () => {
    await svc.createTask("task-1", "org_test");
    await svc.transition({ taskId: "task-1", toState: TaskState.SPEC_DRAFTING }, "org_test");
    const detail = await svc.getDetail("task-1", "org_test");
    expect(detail).not.toBeNull();
    expect(detail!.state.currentState).toBe(TaskState.SPEC_DRAFTING);
    expect(detail!.history).toHaveLength(1);
    expect(detail!.availableTransitions).toContain(TaskState.CODE_GENERATING);
    expect(detail!.availableTransitions).toContain(TaskState.FEEDBACK_LOOP);
  });

  it("getDetail returns null for missing task", async () => {
    const detail = await svc.getDetail("nonexistent", "org_test");
    expect(detail).toBeNull();
  });
});

// ─── Route 통합 테스트 ───

describe("TaskState Routes (F333)", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = createMockD1() as unknown as D1Database;
    await exec(db, DDL);
    app = createApp(db);
  });

  it("POST /task-states → 201", async () => {
    const res = await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, any>;
    expect(body.current_state).toBe("INTAKE");
    expect(body.task_id).toBe("task-1");
  });

  it("POST /task-states duplicate → 409", async () => {
    await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1" }),
    });
    const res = await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1" }),
    });
    expect(res.status).toBe(409);
  });

  it("GET /task-states/:taskId → 200", async () => {
    await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1" }),
    });
    const res = await app.request("/api/task-states/task-1");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, any>;
    expect(body.state.current_state).toBe("INTAKE");
    expect(body.availableTransitions).toContain("SPEC_DRAFTING");
  });

  it("GET /task-states/:taskId missing �� 404", async () => {
    const res = await app.request("/api/task-states/nonexistent");
    expect(res.status).toBe(404);
  });

  it("POST /task-states/:taskId/transition → 200", async () => {
    await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1" }),
    });
    const res = await app.request("/api/task-states/task-1/transition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toState: "SPEC_DRAFTING" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, any>;
    expect(body.success).toBe(true);
    expect(body.fromState).toBe("INTAKE");
    expect(body.toState).toBe("SPEC_DRAFTING");
  });

  it("POST transition invalid → 400", async () => {
    await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1" }),
    });
    const res = await app.request("/api/task-states/task-1/transition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toState: "COMPLETED" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, any>;
    expect(body.success).toBe(false);
  });

  it("POST transition missing task → 404", async () => {
    const res = await app.request("/api/task-states/nonexistent/transition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toState: "SPEC_DRAFTING" }),
    });
    expect(res.status).toBe(404);
  });

  it("POST transition invalid toState value → 400", async () => {
    await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1" }),
    });
    const res = await app.request("/api/task-states/task-1/transition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toState: "INVALID_STATE" }),
    });
    expect(res.status).toBe(400);
  });

  it("GET /task-states → list with total", async () => {
    await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1" }),
    });
    await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-2" }),
    });
    const res = await app.request("/api/task-states");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, any>;
    expect(body.total).toBe(2);
    expect(body.items).toHaveLength(2);
  });

  it("GET /task-states?state=INTAKE → filtered", async () => {
    await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1" }),
    });
    await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-2" }),
    });
    // Transition task-2
    await app.request("/api/task-states/task-2/transition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toState: "SPEC_DRAFTING" }),
    });
    const res = await app.request("/api/task-states?state=INTAKE");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, any>;
    expect(body.total).toBe(1);
  });

  it("POST /task-states with metadata", async () => {
    const res = await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1", metadata: { priority: "high" } }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, any>;
    expect(JSON.parse(body.metadata)).toEqual({ priority: "high" });
  });

  it("transition with triggerSource is recorded in history", async () => {
    await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1" }),
    });
    await app.request("/api/task-states/task-1/transition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toState: "SPEC_DRAFTING", triggerSource: "manual" }),
    });
    const res = await app.request("/api/task-states/task-1");
    const body = await res.json() as Record<string, any>;
    expect(body.history[0].trigger_source).toBe("manual");
  });

  it("history records all transitions", async () => {
    await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1" }),
    });
    await app.request("/api/task-states/task-1/transition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toState: "SPEC_DRAFTING" }),
    });
    await app.request("/api/task-states/task-1/transition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toState: "CODE_GENERATING" }),
    });
    const res = await app.request("/api/task-states/task-1");
    const body = await res.json() as Record<string, any>;
    expect(body.history).toHaveLength(2);
    const toStates = body.history.map((h: any) => h.to_state);
    expect(toStates).toContain("CODE_GENERATING");
    expect(toStates).toContain("SPEC_DRAFTING");
  });

  it("GET /task-states?limit=1&offset=1 → pagination", async () => {
    await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1" }),
    });
    await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-2" }),
    });
    const res = await app.request("/api/task-states?limit=1&offset=1");
    const body = await res.json() as Record<string, any>;
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(2);
  });
});

// ─── F337: getSummary + Route 테스트 (Sprint 152) ───

describe("TaskStateService.getSummary (F337)", () => {
  let db: D1Database;
  let svc: TaskStateService;

  beforeEach(async () => {
    db = createMockD1() as unknown as D1Database;
    await exec(db, DDL);
    svc = new TaskStateService(db, createDefaultGuard());
  });

  it("returns empty counts when no tasks", async () => {
    const summary = await svc.getSummary("org_test");
    expect(summary.counts).toEqual({});
    expect(summary.total).toBe(0);
  });

  it("counts tasks by state", async () => {
    await svc.createTask("task-1", "org_test");
    await svc.createTask("task-2", "org_test");
    await svc.createTask("task-3", "org_test");
    await svc.transition({ taskId: "task-2", toState: TaskState.SPEC_DRAFTING }, "org_test");
    await svc.transition({ taskId: "task-3", toState: TaskState.SPEC_DRAFTING }, "org_test");

    const summary = await svc.getSummary("org_test");
    expect(summary.counts["INTAKE"]).toBe(1);
    expect(summary.counts["SPEC_DRAFTING"]).toBe(2);
    expect(summary.total).toBe(3);
  });

  it("isolates by tenant", async () => {
    await svc.createTask("task-1", "org_test");
    await svc.createTask("task-2", "org_other");
    const summary = await svc.getSummary("org_test");
    expect(summary.total).toBe(1);
  });
});

describe("TaskState Summary Route (F337)", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = createMockD1() as unknown as D1Database;
    await exec(db, DDL);
    app = createApp(db);
  });

  it("GET /task-states/summary → 200 empty", async () => {
    const res = await app.request("/api/task-states/summary");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, any>;
    expect(body.counts).toEqual({});
    expect(body.total).toBe(0);
  });

  it("GET /task-states/summary → counts by state", async () => {
    await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1" }),
    });
    await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-2" }),
    });
    await app.request("/api/task-states/task-2/transition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toState: "SPEC_DRAFTING" }),
    });

    const res = await app.request("/api/task-states/summary");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, any>;
    expect(body.counts["INTAKE"]).toBe(1);
    expect(body.counts["SPEC_DRAFTING"]).toBe(1);
    expect(body.total).toBe(2);
  });
});
