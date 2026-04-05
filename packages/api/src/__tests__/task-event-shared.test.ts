// ─── F334: TaskEvent shared 타입 테스트 (Sprint 149) ───

import { describe, it, expect } from "vitest";
import { createTaskEvent } from "@foundry-x/shared";
import type {
  TaskEvent,
  HookEventPayload,
  CIEventPayload,
  ReviewEventPayload,
  DiscriminatorEventPayload,
  SyncEventPayload,
  ManualEventPayload,
} from "@foundry-x/shared";

describe("createTaskEvent", () => {
  it("hook payload로 이벤트 생성", () => {
    const payload: HookEventPayload = {
      type: "hook",
      hookType: "PostToolUse",
      exitCode: 1,
      stderr: "lint error",
      filePath: "src/index.ts",
    };
    const event = createTaskEvent("hook", "error", "task-1", "org-1", payload);

    expect(event.id).toBeTruthy();
    expect(event.source).toBe("hook");
    expect(event.severity).toBe("error");
    expect(event.taskId).toBe("task-1");
    expect(event.tenantId).toBe("org-1");
    expect(event.timestamp).toBeTruthy();
    expect(event.payload).toEqual(payload);
  });

  it("ci payload로 이벤트 생성", () => {
    const payload: CIEventPayload = {
      type: "ci",
      provider: "github-actions",
      runId: "run-123",
      status: "failure",
    };
    const event = createTaskEvent("ci", "error", "task-2", "org-1", payload);
    expect(event.source).toBe("ci");
    expect(event.payload).toEqual(payload);
  });

  it("review payload로 이벤트 생성", () => {
    const payload: ReviewEventPayload = {
      type: "review",
      reviewer: "user-1",
      action: "changes_requested",
      body: "fix the type error",
    };
    const event = createTaskEvent("review", "warning", "task-3", "org-1", payload);
    expect(event.source).toBe("review");
    expect(event.payload).toEqual(payload);
  });

  it("discriminator payload로 이벤트 생성", () => {
    const payload: DiscriminatorEventPayload = {
      type: "discriminator",
      verdict: "FAIL",
      score: 0.42,
      feedback: ["low quality", "missing tests"],
    };
    const event = createTaskEvent("discriminator", "error", "task-4", "org-1", payload);
    expect(event.source).toBe("discriminator");
    expect(event.payload).toEqual(payload);
  });

  it("sync payload로 이벤트 생성", () => {
    const payload: SyncEventPayload = {
      type: "sync",
      syncType: "spec-code",
      driftScore: 0.85,
    };
    const event = createTaskEvent("sync", "warning", "task-5", "org-1", payload);
    expect(event.source).toBe("sync");
  });

  it("manual payload로 이벤트 생성", () => {
    const payload: ManualEventPayload = {
      type: "manual",
      action: "force-transition",
      reason: "debug",
    };
    const event = createTaskEvent("manual", "info", "task-6", "org-1", payload);
    expect(event.source).toBe("manual");
  });

  it("각 이벤트마다 고유한 id 생성", () => {
    const payload: ManualEventPayload = { type: "manual", action: "test" };
    const e1 = createTaskEvent("manual", "info", "t1", "o1", payload);
    const e2 = createTaskEvent("manual", "info", "t1", "o1", payload);
    expect(e1.id).not.toBe(e2.id);
  });
});
