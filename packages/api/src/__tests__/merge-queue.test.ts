import { describe, it, expect, vi, beforeEach } from "vitest";
import { MergeQueueService } from "../services/merge-queue.js";
import { createMockD1 } from "./helpers/mock-d1.js";

function createMockGitHub() {
  return {
    getModifiedFiles: vi.fn().mockResolvedValue(["src/a.ts", "src/b.ts"]),
    updateBranch: vi.fn().mockResolvedValue({ updated: true, sha: "newsha" }),
    getPrStatuses: vi.fn().mockResolvedValue([{ number: 1, mergeable: true, state: "open" }]),
    mergePullRequest: vi.fn().mockResolvedValue({ sha: "merge-sha", merged: true }),
  };
}

function createMockSSE() {
  return { pushEvent: vi.fn() };
}

describe("MergeQueueService (F68)", () => {
  let db: ReturnType<typeof createMockD1>;
  let github: ReturnType<typeof createMockGitHub>;
  let sse: ReturnType<typeof createMockSSE>;
  let queue: MergeQueueService;

  beforeEach(() => {
    db = createMockD1();
    github = createMockGitHub();
    sse = createMockSSE();
    queue = new MergeQueueService(github as any, db as any, sse as any);
  });

  it("enqueue adds entry to queue", async () => {
    const entry = await queue.enqueue("pr-1", 10, "agent-1", 5);
    expect(entry.prNumber).toBe(10);
    expect(entry.agentId).toBe("agent-1");
    expect(entry.priority).toBe(5);
    expect(entry.position).toBe(1);
    expect(entry.status).toBe("queued");
    expect(entry.modifiedFiles).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("enqueue assigns sequential positions", async () => {
    const e1 = await queue.enqueue("pr-1", 10, "agent-1");
    const e2 = await queue.enqueue("pr-2", 20, "agent-2");
    expect(e1.position).toBe(1);
    expect(e2.position).toBe(2);
  });

  it("detectConflicts finds overlapping files", async () => {
    github.getModifiedFiles
      .mockResolvedValueOnce(["src/shared.ts", "src/a.ts"])
      .mockResolvedValueOnce(["src/shared.ts", "src/b.ts"]);

    await queue.enqueue("pr-1", 10, "agent-1");
    await queue.enqueue("pr-2", 20, "agent-2");

    const report = await queue.detectConflicts();
    expect(report.conflicting).toHaveLength(1);
    expect(report.conflicting[0]!.files).toContain("src/shared.ts");
    expect(report.autoResolvable).toBe(true); // files.length <= 3 → rebase로 해결 가능
  });

  it("detectConflicts returns empty when no overlaps", async () => {
    github.getModifiedFiles
      .mockResolvedValueOnce(["src/a.ts"])
      .mockResolvedValueOnce(["src/b.ts"]);

    await queue.enqueue("pr-1", 10, "agent-1");
    await queue.enqueue("pr-2", 20, "agent-2");

    const report = await queue.detectConflicts();
    expect(report.conflicting).toHaveLength(0);
    expect(report.autoResolvable).toBe(true);
  });

  it("processNext merges the first entry", async () => {
    github.getModifiedFiles.mockResolvedValue(["src/a.ts"]);
    await queue.enqueue("pr-1", 10, "agent-1");

    const result = await queue.processNext();
    expect(result.merged).toBe(true);
    expect(result.prNumber).toBe(10);
    expect(result.commitSha).toBe("merge-sha");
    expect(github.mergePullRequest).toHaveBeenCalledWith(10, { mergeMethod: "squash" });
  });

  it("processNext attempts rebase when not mergeable", async () => {
    github.getModifiedFiles.mockResolvedValue(["src/a.ts"]);
    github.getPrStatuses.mockResolvedValue([{ number: 10, mergeable: false, state: "open" }]);
    await queue.enqueue("pr-1", 10, "agent-1");

    const result = await queue.processNext();
    expect(result.merged).toBe(true);
    expect(github.updateBranch).toHaveBeenCalledWith(10);

    // SSE rebase event
    const rebaseEvents = sse.pushEvent.mock.calls.filter(
      (c: any) => c[0].event === "agent.queue.rebase",
    );
    expect(rebaseEvents.length).toBeGreaterThan(0);
  });

  it("processNext returns error when rebase fails", async () => {
    github.getModifiedFiles.mockResolvedValue(["src/a.ts"]);
    github.getPrStatuses.mockResolvedValue([{ number: 10, mergeable: false, state: "open" }]);
    github.updateBranch.mockResolvedValue({ updated: false });
    await queue.enqueue("pr-1", 10, "agent-1");

    const result = await queue.processNext();
    expect(result.merged).toBe(false);
    expect(result.error).toBe("Rebase failed");
  });

  it("getQueueStatus returns active entries", async () => {
    github.getModifiedFiles.mockResolvedValue(["src/a.ts"]);
    await queue.enqueue("pr-1", 10, "agent-1");
    await queue.enqueue("pr-2", 20, "agent-2");

    const entries = await queue.getQueueStatus();
    expect(entries).toHaveLength(2);
    expect(entries[0]!.position).toBe(1);
  });

  it("updatePriority changes entry priority and reorders", async () => {
    github.getModifiedFiles.mockResolvedValue(["src/a.ts"]);
    const e1 = await queue.enqueue("pr-1", 10, "agent-1", 1);
    await queue.enqueue("pr-2", 20, "agent-2", 1);

    await queue.updatePriority(e1.id, 10);

    const entries = await queue.getQueueStatus();
    // Higher priority should be first
    const first = entries[0]!;
    expect(first.id).toBe(e1.id);
  });

  it("processNext returns error on empty queue", async () => {
    const result = await queue.processNext();
    expect(result.merged).toBe(false);
    expect(result.error).toBe("Queue is empty");
  });
});
