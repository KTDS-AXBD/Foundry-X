// ─── F334: Execution Events Route 테스트 (Sprint 149) ───

import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { executionEventsRoute } from "../agent/routes/execution-events.js";
import { ExecutionEventService } from "../agent/services/execution-event-service.js";
import { createTaskEvent } from "@foundry-x/shared";
import type { HookEventPayload } from "@foundry-x/shared";
import { Hono } from "hono";
import type { Env } from "../env.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS execution_events (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    source TEXT NOT NULL,
    severity TEXT NOT NULL,
    payload TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_ee_task ON execution_events(task_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_ee_tenant_source ON execution_events(tenant_id, source, created_at DESC);
`;

const exec = (db: D1Database, q: string) =>
  (db as unknown as { exec: (q: string) => Promise<void> }).exec(q);

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", executionEventsRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

describe("GET /api/execution-events", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = createMockD1() as unknown as D1Database;
    await exec(db, DDL);
    app = createApp(db);

    // seed data
    const svc = new ExecutionEventService(db);
    const payload: HookEventPayload = {
      type: "hook",
      hookType: "PostToolUse",
      exitCode: 1,
      stderr: "error",
    };
    await svc.record(createTaskEvent("hook", "error", "task-1", "org_test", payload));
    await svc.record(createTaskEvent("hook", "info", "task-1", "org_test", payload));
  });

  it("taskId로 조회 → 200", async () => {
    const res = await app.request("/api/execution-events?taskId=task-1");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, any>;
    expect(body.total).toBe(2);
    expect(body.items.length).toBe(2);
  });

  it("source로 조회 → 200", async () => {
    const res = await app.request("/api/execution-events?source=hook");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, any>;
    expect(body.total).toBe(2);
  });

  it("taskId도 source도 없으면 → 400", async () => {
    const res = await app.request("/api/execution-events");
    expect(res.status).toBe(400);
  });

  it("빈 결과 → 200 with empty items", async () => {
    const res = await app.request("/api/execution-events?taskId=nonexistent");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, any>;
    expect(body.total).toBe(0);
    expect(body.items).toEqual([]);
  });

  it("limit/offset 적용", async () => {
    const res = await app.request(
      "/api/execution-events?taskId=task-1&limit=1&offset=0",
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, any>;
    expect(body.items.length).toBe(1);
    expect(body.total).toBe(2);
  });
});
