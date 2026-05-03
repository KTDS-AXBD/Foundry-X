// ─── F334: TransitionTrigger 테스트 (Sprint 149) ───

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TransitionTrigger } from "../core/harness/services/transition-trigger.js";
import { EventBus } from "../services/event-bus.js";
import { TaskState, createTaskEvent } from "@foundry-x/shared";
import type { TaskStateService } from "../services/agent/task-state-service.js";
import type { TaskStateRecord, HookEventPayload, CIEventPayload, ManualEventPayload } from "@foundry-x/shared";

function makeTaskStateService(currentState: TaskState | null) {
  return {
    getState: vi.fn().mockResolvedValue(
      currentState
        ? {
            id: "state-1",
            taskId: "task-1",
            tenantId: "org-1",
            currentState,
            agentId: null,
            metadata: null,
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
          } as TaskStateRecord
        : null,
    ),
    transition: vi.fn().mockResolvedValue({
      success: true,
      taskId: "task-1",
      fromState: currentState,
      toState: TaskState.FEEDBACK_LOOP,
      timestamp: new Date().toISOString(),
    }),
  } as unknown as TaskStateService;
}

describe("TransitionTrigger", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  afterEach(() => {
    bus.clear();
  });

  it("CODE_GENERATING + hook error → FEEDBACK_LOOP 전이", async () => {
    const svc = makeTaskStateService(TaskState.CODE_GENERATING);
    const trigger = new TransitionTrigger(svc, bus);
    trigger.start();

    const payload: HookEventPayload = {
      type: "hook",
      hookType: "PostToolUse",
      exitCode: 1,
      stderr: "lint failed",
    };
    const event = createTaskEvent("hook", "error", "task-1", "org-1", payload);
    await bus.emit(event);

    expect(svc.transition).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: "task-1",
        toState: TaskState.FEEDBACK_LOOP,
        triggerSource: "hook",
      }),
      "org-1",
      "system:transition-trigger",
    );

    trigger.stop();
  });

  it("TEST_RUNNING + ci error → FEEDBACK_LOOP 전이", async () => {
    const svc = makeTaskStateService(TaskState.TEST_RUNNING);
    const trigger = new TransitionTrigger(svc, bus);
    trigger.start();

    const payload: CIEventPayload = {
      type: "ci",
      provider: "github",
      runId: "run-1",
      status: "failure",
    };
    await bus.emit(createTaskEvent("ci", "error", "task-1", "org-1", payload));

    expect(svc.transition).toHaveBeenCalled();
    trigger.stop();
  });

  it("info severity 이벤트는 무시", async () => {
    const svc = makeTaskStateService(TaskState.CODE_GENERATING);
    const trigger = new TransitionTrigger(svc, bus);
    trigger.start();

    const payload: HookEventPayload = {
      type: "hook",
      hookType: "PostToolUse",
      exitCode: 0,
      stderr: "",
    };
    await bus.emit(createTaskEvent("hook", "info", "task-1", "org-1", payload));

    expect(svc.transition).not.toHaveBeenCalled();
    trigger.stop();
  });

  it("warning severity 이벤트는 무시", async () => {
    const svc = makeTaskStateService(TaskState.CODE_GENERATING);
    const trigger = new TransitionTrigger(svc, bus);
    trigger.start();

    const payload: HookEventPayload = {
      type: "hook",
      hookType: "PostToolUse",
      exitCode: 2,
      stderr: "",
    };
    await bus.emit(createTaskEvent("hook", "warning", "task-1", "org-1", payload));

    expect(svc.transition).not.toHaveBeenCalled();
    trigger.stop();
  });

  it("INTAKE 상태에서 hook error → 전이 안 함 (트리거 매핑 없음)", async () => {
    const svc = makeTaskStateService(TaskState.INTAKE);
    const trigger = new TransitionTrigger(svc, bus);
    trigger.start();

    const payload: HookEventPayload = {
      type: "hook",
      hookType: "PostToolUse",
      exitCode: 1,
      stderr: "error",
    };
    await bus.emit(createTaskEvent("hook", "error", "task-1", "org-1", payload));

    expect(svc.transition).not.toHaveBeenCalled();
    trigger.stop();
  });

  it("태스크 미존재 시 전이 안 함", async () => {
    const svc = makeTaskStateService(null);
    const trigger = new TransitionTrigger(svc, bus);
    trigger.start();

    const payload: HookEventPayload = {
      type: "hook",
      hookType: "PostToolUse",
      exitCode: 1,
      stderr: "error",
    };
    await bus.emit(createTaskEvent("hook", "error", "task-1", "org-1", payload));

    expect(svc.transition).not.toHaveBeenCalled();
    trigger.stop();
  });

  it("SPEC_DRAFTING + discriminator error → FEEDBACK_LOOP", async () => {
    const svc = makeTaskStateService(TaskState.SPEC_DRAFTING);
    const trigger = new TransitionTrigger(svc, bus);
    trigger.start();

    await bus.emit(
      createTaskEvent("discriminator", "error", "task-1", "org-1", {
        type: "discriminator",
        verdict: "FAIL",
        score: 0.3,
        feedback: ["low quality"],
      }),
    );

    expect(svc.transition).toHaveBeenCalled();
    trigger.stop();
  });

  it("SPEC_DRAFTING + hook error → 전이 안 함 (hook은 SPEC_DRAFTING 트리거 아님)", async () => {
    const svc = makeTaskStateService(TaskState.SPEC_DRAFTING);
    const trigger = new TransitionTrigger(svc, bus);
    trigger.start();

    const payload: HookEventPayload = {
      type: "hook",
      hookType: "PostToolUse",
      exitCode: 1,
      stderr: "error",
    };
    await bus.emit(createTaskEvent("hook", "error", "task-1", "org-1", payload));

    expect(svc.transition).not.toHaveBeenCalled();
    trigger.stop();
  });

  it("stop() 후 이벤트 무시", async () => {
    const svc = makeTaskStateService(TaskState.CODE_GENERATING);
    const trigger = new TransitionTrigger(svc, bus);
    trigger.start();
    trigger.stop();

    const payload: HookEventPayload = {
      type: "hook",
      hookType: "PostToolUse",
      exitCode: 1,
      stderr: "error",
    };
    await bus.emit(createTaskEvent("hook", "error", "task-1", "org-1", payload));

    expect(svc.transition).not.toHaveBeenCalled();
  });

  it("PR_OPENED + review error → FEEDBACK_LOOP", async () => {
    const svc = makeTaskStateService(TaskState.PR_OPENED);
    const trigger = new TransitionTrigger(svc, bus);
    trigger.start();

    await bus.emit(
      createTaskEvent("review", "error", "task-1", "org-1", {
        type: "review",
        reviewer: "human",
        action: "changes_requested",
      }),
    );

    expect(svc.transition).toHaveBeenCalled();
    trigger.stop();
  });
});
