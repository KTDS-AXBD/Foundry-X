// ─── F333: TransitionGuard 단위 테스트 (Sprint 148) ───

import { describe, it, expect } from "vitest";
import { TaskState } from "@foundry-x/shared";
import { TransitionGuard, createDefaultGuard } from "../services/transition-guard.js";
import type { GuardContext } from "../services/transition-guard.js";

function makeCtx(from: TaskState, to: TaskState): GuardContext {
  return {
    taskId: "task-1",
    fromState: from,
    toState: to,
    tenantId: "org_test",
  };
}

describe("TransitionGuard", () => {
  it("allows valid transition with no custom guards", async () => {
    const guard = createDefaultGuard();
    const result = await guard.check(makeCtx(TaskState.INTAKE, TaskState.SPEC_DRAFTING));
    expect(result.allowed).toBe(true);
  });

  it("rejects invalid transition", async () => {
    const guard = createDefaultGuard();
    const result = await guard.check(makeCtx(TaskState.INTAKE, TaskState.COMPLETED));
    expect(result.allowed).toBe(false);
    expect(result.message).toContain("INTAKE");
    expect(result.message).toContain("COMPLETED");
  });

  it("rejects all transitions from COMPLETED", async () => {
    const guard = createDefaultGuard();
    for (const state of Object.values(TaskState)) {
      const result = await guard.check(makeCtx(TaskState.COMPLETED, state));
      expect(result.allowed).toBe(false);
    }
  });

  it("calls registered custom guard", async () => {
    const guard = new TransitionGuard();
    let called = false;
    guard.register((ctx) => {
      called = true;
      return { allowed: true };
    });
    await guard.check(makeCtx(TaskState.INTAKE, TaskState.SPEC_DRAFTING));
    expect(called).toBe(true);
  });

  it("custom guard can reject transition", async () => {
    const guard = new TransitionGuard();
    guard.register(() => ({ allowed: false, message: "Custom rejection" }));
    const result = await guard.check(makeCtx(TaskState.INTAKE, TaskState.SPEC_DRAFTING));
    expect(result.allowed).toBe(false);
    expect(result.message).toBe("Custom rejection");
  });

  it("stops at first rejecting guard (short-circuit)", async () => {
    const guard = new TransitionGuard();
    let secondCalled = false;
    guard.register(() => ({ allowed: false, message: "First rejects" }));
    guard.register(() => {
      secondCalled = true;
      return { allowed: true };
    });
    const result = await guard.check(makeCtx(TaskState.INTAKE, TaskState.SPEC_DRAFTING));
    expect(result.allowed).toBe(false);
    expect(secondCalled).toBe(false);
  });

  it("supports async guards", async () => {
    const guard = new TransitionGuard();
    guard.register(async () => {
      await new Promise((r) => setTimeout(r, 1));
      return { allowed: true };
    });
    const result = await guard.check(makeCtx(TaskState.INTAKE, TaskState.SPEC_DRAFTING));
    expect(result.allowed).toBe(true);
  });

  it("passes through all guards when all allow", async () => {
    const guard = new TransitionGuard();
    const calls: number[] = [];
    guard.register(() => { calls.push(1); return { allowed: true }; });
    guard.register(() => { calls.push(2); return { allowed: true }; });
    guard.register(() => { calls.push(3); return { allowed: true }; });
    const result = await guard.check(makeCtx(TaskState.INTAKE, TaskState.SPEC_DRAFTING));
    expect(result.allowed).toBe(true);
    expect(calls).toEqual([1, 2, 3]);
  });

  it("invalid transition is checked before custom guards", async () => {
    const guard = new TransitionGuard();
    let guardCalled = false;
    guard.register(() => { guardCalled = true; return { allowed: true }; });
    const result = await guard.check(makeCtx(TaskState.INTAKE, TaskState.COMPLETED));
    expect(result.allowed).toBe(false);
    expect(guardCalled).toBe(false);
  });
});
