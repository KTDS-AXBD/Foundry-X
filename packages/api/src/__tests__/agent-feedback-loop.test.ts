import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentFeedbackLoopService } from "../core/agent/services/agent-feedback-loop.js";
import type { AgentExecutionResult } from "../core/agent/services/execution-types.js";

function createMockDb() {
  return {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [] }),
  } as any;
}

function makeResult(status: "success" | "partial" | "failed", analysis?: string): AgentExecutionResult {
  return {
    status,
    output: { analysis },
    tokensUsed: 100,
    model: "test-model",
    duration: 300,
  };
}

describe("AgentFeedbackLoopService", () => {
  let db: ReturnType<typeof createMockDb>;
  let svc: AgentFeedbackLoopService;

  beforeEach(() => {
    db = createMockDb();
    svc = new AgentFeedbackLoopService(db);
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn().mockReturnValue("aaaa-bbbb-cccc-dddd"),
    });
  });

  // ─── captureFailure ───

  it("captures failed result with status pending", async () => {
    const result = makeResult("failed", "Model timeout after 30s");
    const record = await svc.captureFailure("exec-001", "code-review", result);

    expect(record.id).toMatch(/^afb-/);
    expect(record.executionId).toBe("exec-001");
    expect(record.taskType).toBe("code-review");
    expect(record.failureReason).toBe("Model timeout after 30s");
    expect(record.status).toBe("pending");
    expect(record.humanFeedback).toBeNull();
    expect(db.prepare).toHaveBeenCalled();
  });

  it("captures partial result with 'Partial result' message", async () => {
    const result = makeResult("partial");
    const record = await svc.captureFailure("exec-002", "spec-analysis", result);

    expect(record.failureReason).toBe("Partial result — incomplete output");
    expect(record.status).toBe("pending");
  });

  it("captures success result with null failureReason", async () => {
    const result = makeResult("success", "All checks passed");
    const record = await svc.captureFailure("exec-003", "test-generation", result);

    expect(record.failureReason).toBeNull();
    expect(record.status).toBe("pending");
  });

  // ─── submitHumanFeedback ───

  it("updates status to reviewed on human feedback", async () => {
    db.first.mockResolvedValueOnce({
      id: "afb-001",
      execution_id: "exec-001",
      task_type: "code-review",
      failure_reason: "Timeout",
      human_feedback: "Use a smaller context window",
      prompt_hint: null,
      status: "reviewed",
      created_at: "2026-03-22T00:00:00Z",
      updated_at: "2026-03-22T01:00:00Z",
    });

    const record = await svc.submitHumanFeedback(
      "afb-001",
      "Use a smaller context window",
    );

    expect(record.status).toBe("reviewed");
    expect(record.humanFeedback).toBe("Use a smaller context window");
    expect(db.prepare).toHaveBeenCalled();
  });

  // ─── applyLearning ───

  it("generates promptHint and sets status to applied", async () => {
    db.first.mockResolvedValueOnce({
      id: "afb-002",
      execution_id: "exec-001",
      task_type: "code-review",
      failure_reason: "Timeout",
      human_feedback: "Limit file scan to 50 files max",
      prompt_hint: null,
      status: "reviewed",
      created_at: "2026-03-22T00:00:00Z",
      updated_at: "2026-03-22T01:00:00Z",
    });

    const learning = await svc.applyLearning("afb-002");

    expect(learning.feedbackId).toBe("afb-002");
    expect(learning.promptHint).toContain("When performing code-review, note:");
    expect(learning.promptHint).toContain("Limit file scan to 50 files max");
    expect(learning.appliedTo).toBe("code-review");
  });

  it("throws when applying learning without human feedback", async () => {
    db.first.mockResolvedValueOnce({
      id: "afb-003",
      execution_id: "exec-001",
      task_type: "code-review",
      failure_reason: "Timeout",
      human_feedback: null,
      prompt_hint: null,
      status: "pending",
      created_at: "2026-03-22T00:00:00Z",
      updated_at: "2026-03-22T00:00:00Z",
    });

    await expect(svc.applyLearning("afb-003")).rejects.toThrow(
      "No human feedback to apply",
    );
  });

  // ─── getAppliedHints ───

  it("returns most recent 5 hints for a task type", async () => {
    db.all.mockResolvedValueOnce({
      results: [
        { prompt_hint: "hint-1" },
        { prompt_hint: "hint-2" },
        { prompt_hint: "hint-3" },
      ],
    });

    const hints = await svc.getAppliedHints("code-review");
    expect(hints).toEqual(["hint-1", "hint-2", "hint-3"]);
    expect(db.bind).toHaveBeenCalledWith("code-review");
  });

  it("returns empty array when no hints exist", async () => {
    db.all.mockResolvedValueOnce({ results: [] });

    const hints = await svc.getAppliedHints("spec-analysis");
    expect(hints).toEqual([]);
  });

  // ─── extractPromptHint ───

  it("formats hint as 'When performing {taskType}, note: ...'", () => {
    const hint = svc.extractPromptHint("Always validate input first", "code-review");
    expect(hint).toBe("When performing code-review, note: Always validate input first");
  });

  it("truncates feedback at 200 characters", () => {
    const longFeedback = "A".repeat(300);
    const hint = svc.extractPromptHint(longFeedback, "spec-analysis");

    const expectedNote = "A".repeat(200);
    expect(hint).toBe(`When performing spec-analysis, note: ${expectedNote}`);
    expect(hint.length).toBeLessThan(300);
  });

  // ─── listByExecution ───

  it("filters records by executionId", async () => {
    db.all.mockResolvedValueOnce({
      results: [
        {
          id: "afb-010",
          execution_id: "exec-100",
          task_type: "code-review",
          failure_reason: "Timeout",
          human_feedback: null,
          prompt_hint: null,
          status: "pending",
          created_at: "2026-03-22T00:00:00Z",
          updated_at: "2026-03-22T00:00:00Z",
        },
      ],
    });

    const records = await svc.listByExecution("exec-100");
    expect(records.length).toBe(1);
    expect(records[0]!.executionId).toBe("exec-100");
    expect(records[0]!.taskType).toBe("code-review");
    expect(db.bind).toHaveBeenCalledWith("exec-100");
  });

  // ─── getById ───

  it("returns record when ID exists", async () => {
    db.first.mockResolvedValueOnce({
      id: "afb-020",
      execution_id: "exec-200",
      task_type: "test-generation",
      failure_reason: "Parse error",
      human_feedback: "Fix JSON format",
      prompt_hint: null,
      status: "reviewed",
      created_at: "2026-03-22T00:00:00Z",
      updated_at: "2026-03-22T01:00:00Z",
    });

    const record = await svc.getById("afb-020");
    expect(record).not.toBeNull();
    expect(record!.id).toBe("afb-020");
    expect(record!.taskType).toBe("test-generation");
  });

  it("returns null when ID does not exist", async () => {
    db.first.mockResolvedValueOnce(null);

    const record = await svc.getById("afb-nonexistent");
    expect(record).toBeNull();
  });
});
