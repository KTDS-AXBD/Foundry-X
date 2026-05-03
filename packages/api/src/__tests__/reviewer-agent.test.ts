import { describe, it, expect, vi } from "vitest";
import { ReviewerAgent } from "../agent/services/reviewer-agent.js";

function createMockLLM(response: string) {
  return {
    generate: vi.fn().mockResolvedValue({ content: response, model: "mock", tokensUsed: 100 }),
  } as any;
}

const VALID_REVIEW_JSON = JSON.stringify({
  decision: "approve",
  summary: "Code looks good. Well-structured implementation.",
  comments: [
    { file: "src/index.ts", line: 10, comment: "Consider adding error handling", severity: "warning" },
  ],
  sddScore: 85,
  qualityScore: 90,
  securityIssues: [],
});

describe("ReviewerAgent", () => {
  it("returns parsed review result on valid JSON response", async () => {
    const llm = createMockLLM(VALID_REVIEW_JSON);
    const reviewer = new ReviewerAgent(llm);

    const result = await reviewer.reviewPullRequest("diff content", {
      agentId: "test-agent",
      taskId: "task-1",
      taskType: "code-generation",
      prNumber: 42,
    });

    expect(result.decision).toBe("approve");
    expect(result.summary).toContain("Code looks good");
    expect(result.comments).toHaveLength(1);
    expect(result.sddScore).toBe(85);
    expect(result.qualityScore).toBe(90);
    expect(result.securityIssues).toHaveLength(0);
  });

  it("returns approve decision when LLM approves", async () => {
    const json = JSON.stringify({
      decision: "approve",
      summary: "All good",
      comments: [],
      sddScore: 95,
      qualityScore: 92,
      securityIssues: [],
    });
    const reviewer = new ReviewerAgent(createMockLLM(json));
    const result = await reviewer.reviewPullRequest("diff", {
      agentId: "a", taskId: "t", taskType: "code-review", prNumber: 1,
    });

    expect(result.decision).toBe("approve");
    expect(result.sddScore).toBe(95);
  });

  it("returns request_changes decision", async () => {
    const json = JSON.stringify({
      decision: "request_changes",
      summary: "Several issues found",
      comments: [
        { file: "a.ts", line: 5, comment: "Bug here", severity: "error" },
      ],
      sddScore: 40,
      qualityScore: 35,
      securityIssues: ["SQL injection risk"],
    });
    const reviewer = new ReviewerAgent(createMockLLM(json));
    const result = await reviewer.reviewPullRequest("diff", {
      agentId: "a", taskId: "t", taskType: "code-review", prNumber: 1,
    });

    expect(result.decision).toBe("request_changes");
    expect(result.securityIssues).toContain("SQL injection risk");
  });

  it("returns safe defaults on JSON parse failure", async () => {
    const reviewer = new ReviewerAgent(createMockLLM("not valid json at all"));
    const result = await reviewer.reviewPullRequest("diff", {
      agentId: "a", taskId: "t", taskType: "code-review", prNumber: 1,
    });

    expect(result.decision).toBe("comment");
    expect(result.summary).toContain("manual review");
    expect(result.sddScore).toBe(50);
    expect(result.qualityScore).toBe(50);
  });

  it("truncates diff to 15000 chars", async () => {
    const llm = createMockLLM(VALID_REVIEW_JSON);
    const reviewer = new ReviewerAgent(llm);
    const longDiff = "a".repeat(20000);

    await reviewer.reviewPullRequest(longDiff, {
      agentId: "a", taskId: "t", taskType: "code-review", prNumber: 1,
    });

    const callArgs = llm.generate.mock.calls[0];
    const userPrompt = callArgs[1] as string;
    expect(userPrompt).toContain("(truncated)");
    // The prompt should be shorter than the original diff
    expect(userPrompt.length).toBeLessThan(longDiff.length);
  });

  it("clamps scores to 0-100 range", async () => {
    const json = JSON.stringify({
      decision: "comment",
      summary: "Test",
      comments: [],
      sddScore: 150,
      qualityScore: -20,
      securityIssues: [],
    });
    const reviewer = new ReviewerAgent(createMockLLM(json));
    const result = await reviewer.reviewPullRequest("diff", {
      agentId: "a", taskId: "t", taskType: "code-review", prNumber: 1,
    });

    expect(result.sddScore).toBe(100);
    expect(result.qualityScore).toBe(0);
  });
});
