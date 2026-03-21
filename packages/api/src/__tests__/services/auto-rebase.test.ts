import { describe, it, expect, vi, beforeEach } from "vitest";
import { AutoRebaseService, MAX_REBASE_ATTEMPTS, MAX_CONFLICT_FILES } from "../../services/auto-rebase.js";
import { WorktreeManager } from "../../services/worktree-manager.js";
import { MergeQueueService } from "../../services/merge-queue.js";
import { createMockD1 } from "../helpers/mock-d1.js";

// ─── Mock factories ───

function createMockWorktreeManager(gitExecutor = vi.fn()) {
  const manager = new WorktreeManager({ gitExecutor });
  // Pre-register a worktree for the test agent
  manager.create("agent-1", "feat/test", "master");
  return manager;
}

function createMockFixRunner(success = true) {
  return {
    type: "claude-api" as const,
    execute: vi.fn().mockResolvedValue({
      status: success ? "success" : "failed",
      output: {
        generatedCode: success ? [{ path: "file.ts", content: "resolved" }] : [],
        analysis: success ? null : "Failed to resolve",
      },
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
    supportsTaskType: vi.fn().mockReturnValue(true),
  };
}

function createMockInbox() {
  return {
    send: vi.fn().mockResolvedValue({
      id: "msg-test",
      fromAgentId: "auto-rebase",
      toAgentId: "human",
      type: "escalation",
      subject: "Rebase failed",
      payload: {},
      acknowledged: false,
      createdAt: new Date().toISOString(),
    }),
    deps: {},
  };
}

function createMockSSE() {
  return { pushEvent: vi.fn() };
}

function createMockGitHub() {
  return {
    getModifiedFiles: vi.fn().mockResolvedValue(["src/a.ts"]),
    updateBranch: vi.fn().mockResolvedValue({ updated: true, sha: "newsha" }),
    getPrStatuses: vi.fn().mockResolvedValue([{ number: 1, mergeable: true, state: "open" }]),
    mergePullRequest: vi.fn().mockResolvedValue({ sha: "merge-sha", merged: true }),
  };
}

// ─── AutoRebaseService Tests ───

describe("AutoRebaseService (F102)", () => {
  let db: ReturnType<typeof createMockD1>;
  let gitExecutor: ReturnType<typeof vi.fn>;
  let worktreeManager: WorktreeManager;
  let fixRunner: ReturnType<typeof createMockFixRunner>;
  let inbox: ReturnType<typeof createMockInbox>;
  let sse: ReturnType<typeof createMockSSE>;
  let service: AutoRebaseService;

  beforeEach(async () => {
    db = createMockD1();
    gitExecutor = vi.fn().mockResolvedValue({ stdout: "", exitCode: 0 });
    worktreeManager = new WorktreeManager({ gitExecutor });
    await worktreeManager.create("agent-1", "feat/test", "master");
    fixRunner = createMockFixRunner();
    inbox = createMockInbox();
    sse = createMockSSE();
    service = new AutoRebaseService(
      worktreeManager,
      fixRunner as any,
      inbox as any,
      db as any,
      sse as any,
    );
  });

  // 1. simple success
  it("rebaseWithRetry — simple success (Attempt 1)", async () => {
    // gitExecutor returns exitCode 0 → rebase succeeds on first attempt
    const result = await service.rebaseWithRetry("agent-1", "master", "task-1");

    expect(result.success).toBe(true);
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0]!.strategy).toBe("simple");
    expect(result.escalated).toBe(false);
    expect(result.restoredToOriginal).toBe(false);
  });

  // 2. simple fail, llm success
  it("rebaseWithRetry — simple fail, llm success (Attempt 2)", async () => {
    // First rebase fails with conflict, second succeeds after LLM
    gitExecutor
      .mockResolvedValueOnce({ stdout: "", exitCode: 0 }) // fetch
      .mockResolvedValueOnce({ stdout: "CONFLICT (content): Merge conflict in src/a.ts", exitCode: 1 }) // rebase attempt 1
      .mockResolvedValueOnce({ stdout: "", exitCode: 0 }) // abort
      .mockResolvedValueOnce({ stdout: "", exitCode: 0 }) // fetch attempt 2
      .mockResolvedValueOnce({ stdout: "CONFLICT (content): Merge conflict in src/a.ts", exitCode: 1 }) // rebase attempt 2
      .mockResolvedValueOnce({ stdout: "", exitCode: 0 }) // stage
      .mockResolvedValueOnce({ stdout: "", exitCode: 0 }); // continue

    const result = await service.rebaseWithRetry("agent-1", "master", "task-1");

    expect(result.success).toBe(true);
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0]!.strategy).toBe("simple");
    expect(result.attempts[0]!.success).toBe(false);
    expect(result.attempts[1]!.strategy).toBe("llm-resolve");
    expect(result.attempts[1]!.success).toBe(true);
  });

  // 3. all 3 fail → escalation
  it("rebaseWithRetry — all 3 fail → escalation", async () => {
    // Every rebase attempt fails with conflicts
    gitExecutor.mockResolvedValue({ stdout: "CONFLICT (content): Merge conflict in src/a.ts", exitCode: 1 });
    fixRunner.execute.mockResolvedValue({
      status: "failed",
      output: { generatedCode: [], analysis: "Cannot resolve" },
    });

    const result = await service.rebaseWithRetry("agent-1", "master", "task-1");

    expect(result.success).toBe(false);
    expect(result.attempts).toHaveLength(3);
    expect(result.escalated).toBe(true);
    expect(result.restoredToOriginal).toBe(true);
    expect(inbox.send).toHaveBeenCalledOnce();
  });

  // 4. maxAttempts hard limit
  it("rebaseWithRetry — maxAttempts=3 hard limit (no 4th attempt)", async () => {
    gitExecutor.mockResolvedValue({ stdout: "CONFLICT (content): Merge conflict in src/a.ts", exitCode: 1 });
    fixRunner.execute.mockResolvedValue({
      status: "failed",
      output: { generatedCode: [], analysis: "Cannot resolve" },
    });

    const result = await service.rebaseWithRetry("agent-1", "master", "task-1");

    expect(result.attempts).toHaveLength(MAX_REBASE_ATTEMPTS);
    // fixRunner should be called for attempts 2 and 3 (llm-resolve, llm-extended)
    // but they fail, so no more than 3 attempts total
    expect(result.attempts.length).toBeLessThanOrEqual(3);
  });

  // 5. abortAndRestore
  it("abortAndRestore — calls git rebase --abort", async () => {
    await service.abortAndRestore("agent-1");

    const abortCall = gitExecutor.mock.calls.find(
      (c: string[][]) => c[0]?.includes("--abort"),
    );
    expect(abortCall).toBeTruthy();
  });

  // 6. escalateToHuman
  it("escalateToHuman — inbox send + SSE pushEvent", async () => {
    const attempts = [
      { attempt: 1, strategy: "simple" as const, conflictFiles: ["src/a.ts"], success: false, durationMs: 100 },
    ];

    await service.escalateToHuman("agent-1", "task-1", "master", attempts);

    expect(inbox.send).toHaveBeenCalledWith(
      "auto-rebase",
      "human",
      "escalation",
      expect.stringContaining("Rebase failed"),
      expect.objectContaining({ type: "rebase_escalation" }),
    );

    const escalateEvents = sse.pushEvent.mock.calls.filter(
      (c: any[]) => c[0].event === "agent.rebase.escalated",
    );
    expect(escalateEvents).toHaveLength(1);
  });

  // 7. resolveConflicts — LLM success + stage
  it("resolveConflicts — LLM response applied + staged", async () => {
    const result = await service.resolveConflicts("agent-1", "master", ["src/a.ts"], false);

    expect(result).toBe(true);
    expect(fixRunner.execute).toHaveBeenCalledOnce();
    const stageCall = gitExecutor.mock.calls.find(
      (c: string[][]) => c[0]?.[0] === "add",
    );
    expect(stageCall).toBeTruthy();
  });

  // 8. resolveConflicts — MAX_CONFLICT_FILES exceeded → abort (tested via attemptRebase)
  it("resolveConflicts — MAX_CONFLICT_FILES(10) exceeded → immediate abort", async () => {
    const manyFiles = Array.from({ length: 11 }, (_, i) => `src/file${i}.ts`);
    const conflictStdout = manyFiles.map((f) => `CONFLICT (content): Merge conflict in ${f}`).join("\n");

    gitExecutor
      .mockResolvedValueOnce({ stdout: "", exitCode: 0 }) // fetch
      .mockResolvedValueOnce({ stdout: conflictStdout, exitCode: 1 }) // rebase
      .mockResolvedValueOnce({ stdout: "", exitCode: 0 }) // abort
      .mockResolvedValueOnce({ stdout: "", exitCode: 0 }) // fetch
      .mockResolvedValueOnce({ stdout: conflictStdout, exitCode: 1 }) // rebase
      .mockResolvedValueOnce({ stdout: "", exitCode: 0 }) // abort
      .mockResolvedValueOnce({ stdout: "", exitCode: 0 }) // fetch
      .mockResolvedValueOnce({ stdout: conflictStdout, exitCode: 1 }) // rebase
      .mockResolvedValueOnce({ stdout: "", exitCode: 0 }) // abort
      .mockResolvedValueOnce({ stdout: "", exitCode: 0 }); // final abort

    const result = await service.rebaseWithRetry("agent-1", "master", "task-1");

    expect(result.success).toBe(false);
    // LLM should NOT be called because conflict count exceeds MAX_CONFLICT_FILES
    expect(fixRunner.execute).not.toHaveBeenCalled();
  });
});

// ─── WorktreeManager rebase method tests ───

describe("WorktreeManager rebase methods (F102)", () => {
  // 9. rebase
  it("rebase — calls gitExecutor with correct args", async () => {
    const gitExecutor = vi.fn().mockResolvedValue({ stdout: "", exitCode: 0 });
    const manager = new WorktreeManager({ gitExecutor });
    await manager.create("agent-1", "feat/test", "master");

    const result = await manager.rebase("agent-1", "master");

    expect(gitExecutor).toHaveBeenCalledWith(["rebase", "origin/master"]);
    expect(result.exitCode).toBe(0);
  });

  // 10. abortRebase
  it("abortRebase — calls gitExecutor abort", async () => {
    const gitExecutor = vi.fn().mockResolvedValue({ stdout: "", exitCode: 0 });
    const manager = new WorktreeManager({ gitExecutor });
    await manager.create("agent-1", "feat/test", "master");

    await manager.abortRebase("agent-1");

    expect(gitExecutor).toHaveBeenCalledWith(["rebase", "--abort"]);
  });

  // 11. fetchBase
  it("fetchBase — calls gitExecutor fetch", async () => {
    const gitExecutor = vi.fn().mockResolvedValue({ stdout: "", exitCode: 0 });
    const manager = new WorktreeManager({ gitExecutor });
    await manager.create("agent-1", "feat/test", "master");

    await manager.fetchBase("agent-1");

    expect(gitExecutor).toHaveBeenCalledWith(["fetch", "origin", "master"]);
  });

  // 12. continueRebase
  it("continueRebase — calls gitExecutor continue", async () => {
    const gitExecutor = vi.fn().mockResolvedValue({ stdout: "", exitCode: 0 });
    const manager = new WorktreeManager({ gitExecutor });
    await manager.create("agent-1", "feat/test", "master");

    const result = await manager.continueRebase("agent-1");

    expect(gitExecutor).toHaveBeenCalledWith(["rebase", "--continue"]);
    expect(result.exitCode).toBe(0);
  });
});

// ─── MergeQueue + AutoRebase integration ───

describe("MergeQueueService + AutoRebase (F102)", () => {
  let db: ReturnType<typeof createMockD1>;
  let github: ReturnType<typeof createMockGitHub>;
  let sse: ReturnType<typeof createMockSSE>;

  beforeEach(() => {
    db = createMockD1();
    github = createMockGitHub();
    sse = createMockSSE();
  });

  // 13. processNext calls rebaseWithRetry
  it("processNext — calls rebaseWithRetry when autoRebase provided", async () => {
    const autoRebase = {
      rebaseWithRetry: vi.fn().mockResolvedValue({
        success: true,
        attempts: [{ attempt: 1, strategy: "simple", conflictFiles: [], success: true, durationMs: 50 }],
        escalated: false,
        restoredToOriginal: false,
      }),
    };

    github.getPrStatuses.mockResolvedValue([{ number: 10, mergeable: false, state: "open" }]);

    const queue = new MergeQueueService(github as any, db as any, sse as any, autoRebase as any);
    await queue.enqueue("pr-1", 10, "agent-1");
    const result = await queue.processNext();

    expect(result.merged).toBe(true);
    expect(autoRebase.rebaseWithRetry).toHaveBeenCalledWith("agent-1", "master", expect.any(String));
    // Legacy github.updateBranch should NOT be called
    expect(github.updateBranch).not.toHaveBeenCalled();
  });

  // 14. rebase fail → status=conflict
  it("processNext — rebase fail sets status=conflict", async () => {
    const autoRebase = {
      rebaseWithRetry: vi.fn().mockResolvedValue({
        success: false,
        attempts: [],
        escalated: true,
        restoredToOriginal: true,
      }),
    };

    github.getPrStatuses.mockResolvedValue([{ number: 10, mergeable: false, state: "open" }]);

    const queue = new MergeQueueService(github as any, db as any, sse as any, autoRebase as any);
    await queue.enqueue("pr-1", 10, "agent-1");
    const result = await queue.processNext();

    expect(result.merged).toBe(false);
    expect(result.error).toContain("escalated");
  });

  // 15. no autoRebase → legacy behavior
  it("processNext — no autoRebase → legacy github.updateBranch", async () => {
    github.getPrStatuses.mockResolvedValue([{ number: 10, mergeable: false, state: "open" }]);

    const queue = new MergeQueueService(github as any, db as any, sse as any);
    await queue.enqueue("pr-1", 10, "agent-1");
    const result = await queue.processNext();

    expect(result.merged).toBe(true);
    expect(github.updateBranch).toHaveBeenCalledWith(10);
  });
});
