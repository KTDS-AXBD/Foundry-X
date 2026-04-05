// ─── F333: TaskState shared 로직 단위 테스트 (Sprint 148) ───

import { describe, it, expect } from "vitest";
import {
  TaskState,
  TASK_STATES,
  TRANSITIONS,
  FEEDBACK_LOOP_TRIGGERS,
  isValidTransition,
  getAvailableTransitions,
} from "@foundry-x/shared";

describe("TaskState enum", () => {
  it("has exactly 10 states", () => {
    expect(TASK_STATES).toHaveLength(10);
  });

  it("all states have transition entries", () => {
    for (const state of TASK_STATES) {
      expect(TRANSITIONS).toHaveProperty(state);
    }
  });

  it("transition targets are valid TaskState values", () => {
    for (const [, targets] of Object.entries(TRANSITIONS)) {
      for (const target of targets) {
        expect(TASK_STATES).toContain(target);
      }
    }
  });
});

describe("isValidTransition", () => {
  it("INTAKE → SPEC_DRAFTING is valid", () => {
    expect(isValidTransition(TaskState.INTAKE, TaskState.SPEC_DRAFTING)).toBe(true);
  });

  it("INTAKE → COMPLETED is invalid", () => {
    expect(isValidTransition(TaskState.INTAKE, TaskState.COMPLETED)).toBe(false);
  });

  it("INTAKE → INTAKE is invalid (self-loop)", () => {
    expect(isValidTransition(TaskState.INTAKE, TaskState.INTAKE)).toBe(false);
  });

  it("COMPLETED → any state is invalid (terminal)", () => {
    for (const state of TASK_STATES) {
      expect(isValidTransition(TaskState.COMPLETED, state as TaskState)).toBe(false);
    }
  });

  it("FAILED → INTAKE is valid (restart)", () => {
    expect(isValidTransition(TaskState.FAILED, TaskState.INTAKE)).toBe(true);
  });

  it("FAILED → COMPLETED is invalid", () => {
    expect(isValidTransition(TaskState.FAILED, TaskState.COMPLETED)).toBe(false);
  });

  it("FEEDBACK_LOOP → SPEC_DRAFTING is valid (loop exit)", () => {
    expect(isValidTransition(TaskState.FEEDBACK_LOOP, TaskState.SPEC_DRAFTING)).toBe(true);
  });

  it("FEEDBACK_LOOP → CODE_GENERATING is valid", () => {
    expect(isValidTransition(TaskState.FEEDBACK_LOOP, TaskState.CODE_GENERATING)).toBe(true);
  });

  it("FEEDBACK_LOOP → TEST_RUNNING is valid", () => {
    expect(isValidTransition(TaskState.FEEDBACK_LOOP, TaskState.TEST_RUNNING)).toBe(true);
  });

  it("FEEDBACK_LOOP → FAILED is valid", () => {
    expect(isValidTransition(TaskState.FEEDBACK_LOOP, TaskState.FAILED)).toBe(true);
  });

  it("REVIEW_PENDING → COMPLETED is valid", () => {
    expect(isValidTransition(TaskState.REVIEW_PENDING, TaskState.COMPLETED)).toBe(true);
  });

  it("REVIEW_PENDING → FEEDBACK_LOOP is valid", () => {
    expect(isValidTransition(TaskState.REVIEW_PENDING, TaskState.FEEDBACK_LOOP)).toBe(true);
  });
});

describe("getAvailableTransitions", () => {
  it("INTAKE has 1 transition", () => {
    expect(getAvailableTransitions(TaskState.INTAKE)).toEqual([TaskState.SPEC_DRAFTING]);
  });

  it("COMPLETED has 0 transitions", () => {
    expect(getAvailableTransitions(TaskState.COMPLETED)).toEqual([]);
  });

  it("FEEDBACK_LOOP has 4 exit targets", () => {
    const transitions = getAvailableTransitions(TaskState.FEEDBACK_LOOP);
    expect(transitions).toHaveLength(4);
    expect(transitions).toContain(TaskState.SPEC_DRAFTING);
    expect(transitions).toContain(TaskState.FAILED);
  });

  it("SPEC_DRAFTING → CODE_GENERATING or FEEDBACK_LOOP", () => {
    const transitions = getAvailableTransitions(TaskState.SPEC_DRAFTING);
    expect(transitions).toHaveLength(2);
    expect(transitions).toContain(TaskState.CODE_GENERATING);
    expect(transitions).toContain(TaskState.FEEDBACK_LOOP);
  });
});

describe("FEEDBACK_LOOP_TRIGGERS", () => {
  it("SPEC_DRAFTING triggers from discriminator", () => {
    expect(FEEDBACK_LOOP_TRIGGERS[TaskState.SPEC_DRAFTING]).toEqual(["discriminator"]);
  });

  it("CODE_GENERATING triggers from hook and discriminator", () => {
    expect(FEEDBACK_LOOP_TRIGGERS[TaskState.CODE_GENERATING]).toEqual(["hook", "discriminator"]);
  });

  it("TEST_RUNNING triggers from ci", () => {
    expect(FEEDBACK_LOOP_TRIGGERS[TaskState.TEST_RUNNING]).toEqual(["ci"]);
  });

  it("all trigger keys are valid states that can reach FEEDBACK_LOOP", () => {
    for (const stateKey of Object.keys(FEEDBACK_LOOP_TRIGGERS)) {
      expect(isValidTransition(stateKey as TaskState, TaskState.FEEDBACK_LOOP)).toBe(true);
    }
  });
});

describe("reachability", () => {
  it("INTAKE can reach COMPLETED via happy path", () => {
    const path = [
      TaskState.INTAKE,
      TaskState.SPEC_DRAFTING,
      TaskState.CODE_GENERATING,
      TaskState.TEST_RUNNING,
      TaskState.SYNC_VERIFYING,
      TaskState.PR_OPENED,
      TaskState.REVIEW_PENDING,
      TaskState.COMPLETED,
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(isValidTransition(path[i]!, path[i + 1]!)).toBe(true);
    }
  });

  it("FAILED can restart via INTAKE", () => {
    expect(isValidTransition(TaskState.FAILED, TaskState.INTAKE)).toBe(true);
    expect(isValidTransition(TaskState.INTAKE, TaskState.SPEC_DRAFTING)).toBe(true);
  });
});
