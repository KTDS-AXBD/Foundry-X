// ─── F335: Orchestration E2E API 통합 테스트 (Sprint 150) ───

import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { taskStateRoute } from "../core/agent/routes/task-state.js";
import { orchestrationRoute } from "../core/agent/routes/orchestration.js";
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
  CREATE TABLE IF NOT EXISTS loop_contexts (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    entry_state TEXT NOT NULL,
    trigger_event_id TEXT,
    loop_mode TEXT NOT NULL,
    current_round INTEGER NOT NULL DEFAULT 0,
    max_rounds INTEGER NOT NULL DEFAULT 3,
    exit_target TEXT NOT NULL,
    convergence TEXT,
    history TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", taskStateRoute);
  app.route("/api", orchestrationRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

const exec = (db: D1Database, q: string) =>
  (db as unknown as { exec: (q: string) => Promise<void> }).exec(q);

/** 태스크를 FEEDBACK_LOOP 상태로 만들기 */
async function setupTaskInFeedbackLoop(app: ReturnType<typeof createApp>, taskId: string) {
  // 생성
  await app.request("/api/task-states", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, metadata: { entryState: "CODE_GENERATING" } }),
  });
  // INTAKE → SPEC_DRAFTING → CODE_GENERATING → FEEDBACK_LOOP
  for (const toState of ["SPEC_DRAFTING", "CODE_GENERATING", "FEEDBACK_LOOP"]) {
    await app.request(`/api/task-states/${taskId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toState }),
    });
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyJson = any;

describe("Orchestration E2E API", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = createMockD1() as unknown as D1Database;
    await exec(db, DDL);
    app = createApp(db);
  });

  it("POST /task-states/:id/loop — retry 성공", async () => {
    await setupTaskInFeedbackLoop(app, "e2e-1");

    const res = await app.request("/api/task-states/e2e-1/loop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loopMode: "retry",
        agentNames: ["mock-gen"],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as AnyJson;
    expect(body.outcome.status).toBe("resolved");
    expect(body.outcome.rounds).toBeGreaterThanOrEqual(1);
  });

  it("POST /task-states/:id/loop — adversarial 수렴", async () => {
    await setupTaskInFeedbackLoop(app, "e2e-2");

    const res = await app.request("/api/task-states/e2e-2/loop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loopMode: "adversarial",
        agentNames: ["gen-1", "disc-1"],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as AnyJson;
    expect(body.outcome.status).toBe("resolved");
  });

  it("POST /task-states/:id/loop — exhausted", async () => {
    await setupTaskInFeedbackLoop(app, "e2e-3");

    // maxRounds=1, MockAdapter의 첫 라운드는 score 0.7 → 통과
    // 하지만 기본 MockAdapter는 round 1에서 0.5+0.2=0.7 → pass
    // 그래서 maxRounds=1, minQualityScore=0.95로 설정
    const res = await app.request("/api/task-states/e2e-3/loop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loopMode: "retry",
        agentNames: ["mock-gen"],
        convergence: { maxRounds: 1, minQualityScore: 0.95 },
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as AnyJson;
    expect(body.outcome.status).toBe("exhausted");
  });

  it("POST /task-states/:id/loop — 잘못된 상태 (INTAKE)", async () => {
    // INTAKE 상태로 생성만
    await app.request("/api/task-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "e2e-4" }),
    });

    const res = await app.request("/api/task-states/e2e-4/loop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loopMode: "retry",
        agentNames: ["mock-gen"],
      }),
    });

    // escalated → 400 with error message
    expect(res.status).toBe(400);
    const body = await res.json() as AnyJson;
    expect(body.error).toContain("not FEEDBACK_LOOP");
  });

  it("POST /task-states/:id/loop — 존재하지 않는 태스크", async () => {
    const res = await app.request("/api/task-states/nonexistent/loop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loopMode: "retry",
        agentNames: ["mock-gen"],
      }),
    });

    expect(res.status).toBe(404);
  });

  it("GET /task-states/:id/loop-history", async () => {
    await setupTaskInFeedbackLoop(app, "e2e-5");
    await app.request("/api/task-states/e2e-5/loop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loopMode: "retry",
        agentNames: ["mock-gen"],
      }),
    });

    const res = await app.request("/api/task-states/e2e-5/loop-history");
    expect(res.status).toBe(200);
    const body = await res.json() as AnyJson;
    expect(body.items).toHaveLength(1);
    expect(body.items[0].loopMode).toBe("retry");
  });

  it("GET /telemetry/events — 이벤트 조회", async () => {
    await setupTaskInFeedbackLoop(app, "e2e-6");
    await app.request("/api/task-states/e2e-6/loop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loopMode: "retry",
        agentNames: ["mock-gen"],
      }),
    });

    const res = await app.request("/api/telemetry/events?taskId=e2e-6");
    expect(res.status).toBe(200);
    const body = await res.json() as AnyJson;
    expect(body.items.length).toBeGreaterThan(0);
  });

  it("GET /telemetry/counts — 소스별 집계", async () => {
    await setupTaskInFeedbackLoop(app, "e2e-7");
    await app.request("/api/task-states/e2e-7/loop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loopMode: "retry",
        agentNames: ["mock-gen"],
      }),
    });

    const res = await app.request("/api/telemetry/counts");
    expect(res.status).toBe(200);
    const body = await res.json() as AnyJson;
    expect(typeof body).toBe("object");
  });

  it("전체 흐름: 생성→FEEDBACK_LOOP→루프→resolved→상태 확인", async () => {
    await setupTaskInFeedbackLoop(app, "e2e-flow");

    // 루프 실행
    const loopRes = await app.request("/api/task-states/e2e-flow/loop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loopMode: "retry",
        agentNames: ["mock-gen"],
      }),
    });

    const loopBody = await loopRes.json() as { outcome: { status: string } };
    expect(loopBody.outcome.status).toBe("resolved");

    // 상태 확인 — TEST_RUNNING으로 전이
    const stateRes = await app.request("/api/task-states/e2e-flow");
    expect(stateRes.status).toBe(200);
    const stateBody = await stateRes.json() as { state: { current_state: string }; history: unknown[] };
    expect(stateBody.state.current_state).toBe("TEST_RUNNING");

    // 이력 확인
    expect(stateBody.history.length).toBeGreaterThan(0);
  });

  it("fix 모드 동작 확인", async () => {
    await setupTaskInFeedbackLoop(app, "e2e-fix");

    const res = await app.request("/api/task-states/e2e-fix/loop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loopMode: "fix",
        agentNames: ["auto-fixer"],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as AnyJson as { outcome: { status: string } };
    expect(body.outcome.status).toBe("resolved");
  });
});