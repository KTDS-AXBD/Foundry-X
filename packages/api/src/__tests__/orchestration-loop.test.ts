// ─── F335: OrchestrationLoop 단위 테스트 (Sprint 150) ───

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { OrchestrationLoop } from "../core/agent/services/orchestration-loop.js";
import { TaskStateService } from "../core/agent/services/task-state-service.js";
import { EventBus } from "../services/event-bus.js";
import { createDefaultGuard } from "../core/harness/services/transition-guard.js";
import { TaskState, type AgentAdapter, type AgentResult, type AgentExecutionContext } from "@foundry-x/shared";

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

const TENANT = "org_test";

const exec = (db: D1Database, q: string) =>
  (db as unknown as { exec: (q: string) => Promise<void> }).exec(q);

// ─── Mock Agent Factories ───

function createPassAgent(name = "mock-gen", role: "generator" | "discriminator" = "generator"): AgentAdapter {
  return {
    name,
    role,
    async execute() {
      return { success: true, qualityScore: 0.9, feedback: [] };
    },
  };
}

function createFailAgent(name = "mock-gen"): AgentAdapter {
  return {
    name,
    role: "generator",
    async execute() {
      return { success: false, qualityScore: 0.3, feedback: ["Quality below threshold"] };
    },
  };
}

function createImprovingAgent(name = "improving"): AgentAdapter {
  let round = 0;
  return {
    name,
    role: "generator",
    async execute() {
      round++;
      const score = Math.min(0.3 + round * 0.25, 1.0);
      return {
        success: score >= 0.7,
        qualityScore: score,
        feedback: score >= 0.7 ? [] : [`Score ${score.toFixed(2)} < 0.7`],
      };
    },
  };
}

function createErrorAgent(name = "error-agent"): AgentAdapter {
  return {
    name,
    role: "generator",
    async execute() {
      throw new Error("Agent execution failed");
    },
  };
}

// ─── Helper: 태스크를 FEEDBACK_LOOP 상태로 만들기 ───

async function setupTaskInFeedbackLoop(
  svc: TaskStateService,
  taskId: string,
  entryState: TaskState = TaskState.CODE_GENERATING,
) {
  await svc.createTask(taskId, TENANT, undefined, { entryState });
  // INTAKE → SPEC_DRAFTING → CODE_GENERATING → FEEDBACK_LOOP
  await svc.transition({ taskId, toState: TaskState.SPEC_DRAFTING }, TENANT);
  await svc.transition({ taskId, toState: TaskState.CODE_GENERATING }, TENANT);
  await svc.transition({ taskId, toState: TaskState.FEEDBACK_LOOP }, TENANT);
}

describe("OrchestrationLoop", () => {
  let db: D1Database;
  let svc: TaskStateService;
  let loop: OrchestrationLoop;
  let eventBus: EventBus;

  beforeEach(async () => {
    db = createMockD1() as unknown as D1Database;
    await exec(db, DDL);
    const guard = createDefaultGuard();
    svc = new TaskStateService(db, guard);
    eventBus = new EventBus();
    loop = new OrchestrationLoop(svc, eventBus, db);
  });

  // ─── retry mode ───

  it("retry: 1라운드 성공 → resolved", async () => {
    await setupTaskInFeedbackLoop(svc, "task-1");
    const outcome = await loop.run({
      taskId: "task-1",
      tenantId: TENANT,
      loopMode: "retry",
      agents: [createPassAgent()],
    });

    expect(outcome.status).toBe("resolved");
    if (outcome.status === "resolved") {
      expect(outcome.rounds).toBe(1);
      expect(outcome.finalScore).toBeGreaterThanOrEqual(0.7);
    }

    // 상태가 exitTarget으로 전이되었는지 확인
    const state = await svc.getState("task-1", TENANT);
    expect(state?.currentState).toBe(TaskState.TEST_RUNNING);
  });

  it("retry: 3라운드 실패 → exhausted → FAILED", async () => {
    await setupTaskInFeedbackLoop(svc, "task-2");
    const outcome = await loop.run({
      taskId: "task-2",
      tenantId: TENANT,
      loopMode: "retry",
      agents: [createFailAgent()],
      convergence: { maxRounds: 3 },
    });

    expect(outcome.status).toBe("exhausted");
    if (outcome.status === "exhausted") {
      expect(outcome.rounds).toBe(3);
      expect(outcome.residualIssues).toContain("Quality below threshold");
    }

    const state = await svc.getState("task-2", TENANT);
    expect(state?.currentState).toBe(TaskState.FAILED);
  });

  it("retry: 개선하는 에이전트 → 2라운드에서 수렴", async () => {
    await setupTaskInFeedbackLoop(svc, "task-3");
    const outcome = await loop.run({
      taskId: "task-3",
      tenantId: TENANT,
      loopMode: "retry",
      agents: [createImprovingAgent()],
      convergence: { maxRounds: 5 },
    });

    expect(outcome.status).toBe("resolved");
    if (outcome.status === "resolved") {
      expect(outcome.rounds).toBeLessThanOrEqual(3);
    }
  });

  // ─── adversarial mode ───

  it("adversarial: Generator-Discriminator 성공", async () => {
    await setupTaskInFeedbackLoop(svc, "task-4");
    const outcome = await loop.run({
      taskId: "task-4",
      tenantId: TENANT,
      loopMode: "adversarial",
      agents: [createPassAgent("gen", "generator"), createPassAgent("disc", "discriminator")],
    });

    expect(outcome.status).toBe("resolved");
    if (outcome.status === "resolved") {
      expect(outcome.rounds).toBe(1);
    }
  });

  it("adversarial: Generator 없으면 escalated", async () => {
    await setupTaskInFeedbackLoop(svc, "task-5");
    const outcome = await loop.run({
      taskId: "task-5",
      tenantId: TENANT,
      loopMode: "adversarial",
      agents: [createPassAgent("only-disc", "discriminator")],
    });

    expect(outcome.status).toBe("escalated");
  });

  // ─── fix mode ───

  it("fix: 수정 성공", async () => {
    await setupTaskInFeedbackLoop(svc, "task-6");
    const outcome = await loop.run({
      taskId: "task-6",
      tenantId: TENANT,
      loopMode: "fix",
      agents: [createPassAgent("fixer")],
    });

    expect(outcome.status).toBe("resolved");
  });

  // ─── error handling ───

  it("에이전트 에러 → escalated", async () => {
    await setupTaskInFeedbackLoop(svc, "task-7");
    const outcome = await loop.run({
      taskId: "task-7",
      tenantId: TENANT,
      loopMode: "retry",
      agents: [createErrorAgent()],
    });

    expect(outcome.status).toBe("escalated");
    if (outcome.status === "escalated") {
      expect(outcome.reason).toContain("Agent execution failed");
    }
  });

  it("존재하지 않는 태스크 → escalated", async () => {
    const outcome = await loop.run({
      taskId: "nonexistent",
      tenantId: TENANT,
      loopMode: "retry",
      agents: [createPassAgent()],
    });

    expect(outcome.status).toBe("escalated");
    if (outcome.status === "escalated") {
      expect(outcome.reason).toContain("not found");
    }
  });

  it("FEEDBACK_LOOP 아닌 상태 → escalated", async () => {
    await svc.createTask("task-8", TENANT);
    // INTAKE 상태에서 루프 시도
    const outcome = await loop.run({
      taskId: "task-8",
      tenantId: TENANT,
      loopMode: "retry",
      agents: [createPassAgent()],
    });

    expect(outcome.status).toBe("escalated");
    if (outcome.status === "escalated") {
      expect(outcome.reason).toContain("not FEEDBACK_LOOP");
    }
  });

  it("에이전트 없이 시작 → escalated", async () => {
    await setupTaskInFeedbackLoop(svc, "task-9");
    const outcome = await loop.run({
      taskId: "task-9",
      tenantId: TENANT,
      loopMode: "retry",
      agents: [],
    });

    expect(outcome.status).toBe("escalated");
  });

  // ─── convergence ───

  it("수렴 기준: qualityScore 커스텀 임계값", async () => {
    await setupTaskInFeedbackLoop(svc, "task-10");
    // 0.5를 매번 반환하는 에이전트, 0.4 임계값이면 pass
    const agent: AgentAdapter = {
      name: "mid-quality",
      role: "generator",
      async execute() {
        return { success: true, qualityScore: 0.5, feedback: [] };
      },
    };

    const outcome = await loop.run({
      taskId: "task-10",
      tenantId: TENANT,
      loopMode: "retry",
      agents: [agent],
      convergence: { minQualityScore: 0.4 },
    });

    expect(outcome.status).toBe("resolved");
  });

  // ─── loop history ───

  it("루프 이력 조회", async () => {
    await setupTaskInFeedbackLoop(svc, "task-11");
    await loop.run({
      taskId: "task-11",
      tenantId: TENANT,
      loopMode: "retry",
      agents: [createPassAgent()],
    });

    const history = await loop.getHistory("task-11", TENANT);
    expect(history).toHaveLength(1);
    expect(history[0]!.status).toBe("resolved");
    expect(history[0]!.history).toHaveLength(1);
  });

  // ─── EventBus events ───

  it("루프 중 이벤트 발행", async () => {
    const events: string[] = [];
    eventBus.subscribe("*", async (e) => {
      const payload = e.payload;
      if (payload.type === "manual") {
        events.push((payload as { action: string }).action);
      }
    });

    await setupTaskInFeedbackLoop(svc, "task-12");
    await loop.run({
      taskId: "task-12",
      tenantId: TENANT,
      loopMode: "retry",
      agents: [createPassAgent()],
    });

    expect(events).toContain("loop_started");
    expect(events).toContain("loop_resolved");
  });

  // F538: F531 graphDiscovery 분기 제거 (dead code — production orchestration.ts 미사용)
});
