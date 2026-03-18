import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrPipelineService } from "../services/pr-pipeline.js";
import { createMockD1 } from "./helpers/mock-d1.js";
import type { AgentExecutionResult, PrReviewResult } from "@foundry-x/shared";

function createMockGitHub() {
  return {
    createBranch: vi.fn().mockResolvedValue("abc123"),
    deleteBranch: vi.fn().mockResolvedValue(true),
    createCommitWithFiles: vi.fn().mockResolvedValue({ sha: "commit-sha", url: "https://github.com/commit" }),
    createPullRequest: vi.fn().mockResolvedValue({ number: 42, url: "https://api.github.com/pulls/42", htmlUrl: "https://github.com/pulls/42" }),
    getPrDiff: vi.fn().mockResolvedValue("diff content"),
    mergePullRequest: vi.fn().mockResolvedValue({ sha: "merge-sha", merged: true }),
    createPrReview: vi.fn().mockResolvedValue({ id: 1 }),
    getCheckRuns: vi.fn().mockResolvedValue({ total: 1, conclusion: "success", checks: [] }),
  };
}

function createMockReviewer(overrides?: Partial<PrReviewResult>) {
  const defaultResult: PrReviewResult = {
    decision: "approve",
    summary: "Looks good",
    comments: [],
    sddScore: 90,
    qualityScore: 85,
    securityIssues: [],
    ...overrides,
  };
  return {
    reviewPullRequest: vi.fn().mockResolvedValue(defaultResult),
  };
}

function createMockSSE() {
  return { pushEvent: vi.fn() };
}

const TASK_RESULT: AgentExecutionResult = {
  status: "success",
  output: {
    analysis: "Generated code for feature",
    generatedCode: [
      { path: "src/new-file.ts", content: "export const x = 1;", action: "create" },
    ],
  },
  tokensUsed: 500,
  model: "claude-haiku",
  duration: 1200,
};

describe("PrPipelineService", () => {
  let db: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    db = createMockD1();
  });

  it("full pipeline success — creates branch, PR, reviews, and merges", async () => {
    const github = createMockGitHub();
    const reviewer = createMockReviewer();
    const sse = createMockSSE();
    const pipeline = new PrPipelineService(
      github as any, reviewer as any, db as any, sse as any,
    );

    const result = await pipeline.createAgentPr("agent-1", "task-1", TASK_RESULT);

    expect(result.prNumber).toBe(42);
    expect(result.merged).toBe(true);
    expect(result.status).toBe("merged");
    expect(github.createBranch).toHaveBeenCalled();
    expect(github.createCommitWithFiles).toHaveBeenCalled();
    expect(github.createPullRequest).toHaveBeenCalled();
    expect(github.createPrReview).toHaveBeenCalled();
    expect(github.mergePullRequest).toHaveBeenCalled();
    expect(github.deleteBranch).toHaveBeenCalled();

    // Check SSE events
    const events = sse.pushEvent.mock.calls.map((c: any) => c[0].event);
    expect(events).toContain("agent.pr.created");
    expect(events).toContain("agent.pr.reviewed");
    expect(events).toContain("agent.pr.merged");
  });

  it("throws error when no generatedCode in task result", async () => {
    const pipeline = new PrPipelineService(
      createMockGitHub() as any,
      createMockReviewer() as any,
      db as any,
    );

    const emptyResult: AgentExecutionResult = {
      ...TASK_RESULT,
      output: { analysis: "No code" },
    };

    await expect(pipeline.createAgentPr("agent-1", "task-1", emptyResult))
      .rejects.toThrow("No generated code");
  });

  it("returns needs_human when review decision is request_changes", async () => {
    const github = createMockGitHub();
    const reviewer = createMockReviewer({ decision: "request_changes" });
    const sse = createMockSSE();
    const pipeline = new PrPipelineService(
      github as any, reviewer as any, db as any, sse as any,
    );

    const result = await pipeline.createAgentPr("agent-1", "task-1", TASK_RESULT);

    expect(result.merged).toBe(false);
    expect(result.status).toBe("needs_human");
    expect(github.mergePullRequest).not.toHaveBeenCalled();
  });

  it("returns needs_human when sddScore is below threshold", async () => {
    const reviewer = createMockReviewer({ sddScore: 50 });
    const pipeline = new PrPipelineService(
      createMockGitHub() as any, reviewer as any, db as any, createMockSSE() as any,
    );

    const result = await pipeline.createAgentPr("agent-1", "task-1", TASK_RESULT);

    expect(result.merged).toBe(false);
    expect(result.status).toBe("needs_human");
  });

  it("returns needs_human when security issues exist", async () => {
    const reviewer = createMockReviewer({ securityIssues: ["XSS vulnerability"] });
    const pipeline = new PrPipelineService(
      createMockGitHub() as any, reviewer as any, db as any, createMockSSE() as any,
    );

    const result = await pipeline.createAgentPr("agent-1", "task-1", TASK_RESULT);

    expect(result.merged).toBe(false);
    expect(result.status).toBe("needs_human");
  });

  it("returns needs_human when CI fails", async () => {
    const github = createMockGitHub();
    github.getCheckRuns.mockResolvedValue({ total: 2, conclusion: "failure", checks: [] });
    const pipeline = new PrPipelineService(
      github as any, createMockReviewer() as any, db as any, createMockSSE() as any,
    );

    const result = await pipeline.createAgentPr("agent-1", "task-1", TASK_RESULT);

    expect(result.merged).toBe(false);
    expect(result.status).toBe("needs_human");
  });

  it("returns needs_human when daily limit is reached", async () => {
    // Insert 10 merged PRs for today
    for (let i = 0; i < 10; i++) {
      await db.prepare(
        `INSERT INTO agent_prs (id, agent_id, task_id, repo, branch, status, merged_at)
         VALUES (?, 'a', 't', 'r', 'b', 'merged', datetime('now'))`,
      ).bind(`pr-limit-${i}`).run();
    }

    const pipeline = new PrPipelineService(
      createMockGitHub() as any, createMockReviewer() as any, db as any, createMockSSE() as any,
    );

    const result = await pipeline.createAgentPr("agent-1", "task-1", TASK_RESULT);

    expect(result.merged).toBe(false);
    expect(result.status).toBe("needs_human");
  });

  it("returns needs_human when requireHumanApproval is enabled", async () => {
    const pipeline = new PrPipelineService(
      createMockGitHub() as any,
      createMockReviewer() as any,
      db as any,
      createMockSSE() as any,
      { requireHumanApproval: true },
    );

    const result = await pipeline.createAgentPr("agent-1", "task-1", TASK_RESULT);

    expect(result.merged).toBe(false);
    expect(result.status).toBe("needs_human");
  });

  it("returns needs_human when qualityScore is below threshold", async () => {
    const reviewer = createMockReviewer({ qualityScore: 40 });
    const pipeline = new PrPipelineService(
      createMockGitHub() as any, reviewer as any, db as any, createMockSSE() as any,
    );

    const result = await pipeline.createAgentPr("agent-1", "task-1", TASK_RESULT);

    expect(result.merged).toBe(false);
    expect(result.status).toBe("needs_human");
  });
});
