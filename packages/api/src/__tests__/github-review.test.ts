import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GitHubReviewService,
  ReviewCooldownError,
  parseFoundryCommand,
  formatStatusComment,
  HELP_COMMENT,
} from "../modules/portal/services/github-review.js";
import { createMockD1 } from "./helpers/mock-d1.js";

// ─── Mock GitHubService ───

function createMockGitHub() {
  return {
    getPrDiff: vi.fn().mockResolvedValue("diff --git a/file.ts b/file.ts\n+added line"),
    createPrReview: vi.fn().mockResolvedValue({ id: 1 }),
    addLabels: vi.fn().mockResolvedValue(undefined),
    removeLabel: vi.fn().mockResolvedValue(undefined),
    addIssueComment: vi.fn().mockResolvedValue({ id: 1 }),
  } as any;
}

// ─── Mock ReviewerAgent ───

function createMockReviewer(overrides: Record<string, unknown> = {}) {
  return {
    reviewPullRequest: vi.fn().mockResolvedValue({
      decision: "approve",
      summary: "Looks good",
      comments: [],
      sddScore: 85,
      qualityScore: 80,
      securityIssues: [],
      ...overrides,
    }),
  } as any;
}

describe("GitHubReviewService", () => {
  let db: ReturnType<typeof createMockD1>;
  let github: ReturnType<typeof createMockGitHub>;
  let reviewer: ReturnType<typeof createMockReviewer>;
  let service: GitHubReviewService;

  beforeEach(async () => {
    db = createMockD1();
    github = createMockGitHub();
    reviewer = createMockReviewer();
    service = new GitHubReviewService(github, reviewer, db as any, "org_test", "KTDS-AXBD/Foundry-X");
  });

  describe("reviewPr", () => {
    it("should review external PR and post result to GitHub", async () => {
      const result = await service.reviewPr(42);

      expect(result.prNumber).toBe(42);
      expect(result.decision).toBe("approve");
      expect(github.getPrDiff).toHaveBeenCalledWith(42);
      expect(reviewer.reviewPullRequest).toHaveBeenCalled();
      expect(github.createPrReview).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ event: "APPROVE" }),
      );
    });

    it("should create agent_prs record for external PR", async () => {
      const result = await service.reviewPr(42);

      const row = await (db as any)
        .prepare("SELECT * FROM agent_prs WHERE pr_number = ?")
        .bind(42)
        .first();
      expect(row).not.toBeNull();
      expect(row.agent_id).toBe("external");
      expect(row.review_decision).toBe("approve");
      expect(row.sdd_score).toBe(85);
      expect(row.quality_score).toBe(80);
      expect(row.review_agent_id).toBe("external-reviewer");
    });

    it("should update existing agent_prs record on re-review", async () => {
      // First review creates the record
      await service.reviewPr(42);

      // Simulate time passing beyond cooldown
      await (db as any).exec(
        "UPDATE agent_prs SET updated_at = datetime('now', '-10 minutes') WHERE pr_number = 42"
      );

      // Re-review with different scores
      reviewer.reviewPullRequest.mockResolvedValueOnce({
        decision: "request_changes",
        summary: "Needs work",
        comments: [],
        sddScore: 60,
        qualityScore: 55,
        securityIssues: ["XSS risk"],
      });

      const result = await service.reviewPr(42);

      expect(result.decision).toBe("request_changes");

      const row = await (db as any)
        .prepare("SELECT * FROM agent_prs WHERE pr_number = ?")
        .bind(42)
        .first();
      expect(row.review_decision).toBe("request_changes");
      expect(row.sdd_score).toBe(60);
    });

    it("should throw cooldown error within 5 minutes", async () => {
      // First review
      await service.reviewPr(42);

      // Second review immediately — should throw
      await expect(service.reviewPr(42)).rejects.toThrow(ReviewCooldownError);
    });

    it("should add sdd:pass label when score >= 80", async () => {
      await service.reviewPr(42);

      expect(github.addLabels).toHaveBeenCalledWith(
        42,
        expect.arrayContaining(["sdd:pass"]),
      );
    });

    it("should add sdd:needs-work label when score < 80", async () => {
      reviewer = createMockReviewer({ sddScore: 60 });
      service = new GitHubReviewService(github, reviewer, db as any, "org_test", "KTDS-AXBD/Foundry-X");

      await service.reviewPr(42);

      expect(github.addLabels).toHaveBeenCalledWith(
        42,
        expect.arrayContaining(["sdd:needs-work"]),
      );
    });
  });

  describe("getReviewResult", () => {
    it("should return review result by PR number", async () => {
      // Create a review first
      await service.reviewPr(42);

      const result = await service.getReviewResult(42);

      expect(result).not.toBeNull();
      expect(result!.prNumber).toBe(42);
      expect(result!.decision).toBe("approve");
      expect(result!.sddScore).toBe(85);
    });

    it("should return null for unreviewed PR", async () => {
      const result = await service.getReviewResult(999);
      expect(result).toBeNull();
    });
  });

  describe("forceApprove", () => {
    it("should update status and post comment", async () => {
      // Create a review first
      await service.reviewPr(42);

      await service.forceApprove(42, "admin-user");

      const row = await (db as any)
        .prepare("SELECT status, review_decision FROM agent_prs WHERE pr_number = ?")
        .bind(42)
        .first();
      expect(row.status).toBe("approved");
      expect(row.review_decision).toBe("approve");

      expect(github.addIssueComment).toHaveBeenCalledWith(
        42,
        expect.stringContaining("admin-user"),
      );
    });
  });
});

describe("parseFoundryCommand", () => {
  it("parses '@foundry-x review'", () => {
    const cmd = parseFoundryCommand("@foundry-x review");
    expect(cmd).toEqual({ command: "review", args: "" });
  });

  it("parses '@foundry-x status'", () => {
    const cmd = parseFoundryCommand("@foundry-x status");
    expect(cmd).toEqual({ command: "status", args: "" });
  });

  it("parses '@foundry-x approve'", () => {
    const cmd = parseFoundryCommand("@foundry-x approve");
    expect(cmd).toEqual({ command: "approve", args: "" });
  });

  it("parses '@foundry-x help'", () => {
    const cmd = parseFoundryCommand("@foundry-x help");
    expect(cmd).toEqual({ command: "help", args: "" });
  });

  it("ignores non-foundry comments", () => {
    expect(parseFoundryCommand("LGTM!")).toBeNull();
    expect(parseFoundryCommand("@other-bot review")).toBeNull();
    expect(parseFoundryCommand("plain text")).toBeNull();
  });

  it("is case-insensitive", () => {
    const cmd = parseFoundryCommand("@Foundry-X REVIEW");
    expect(cmd).toEqual({ command: "review", args: "" });
  });

  it("extracts args after command", () => {
    const cmd = parseFoundryCommand("@foundry-x review --force --verbose");
    expect(cmd).toEqual({ command: "review", args: "--force --verbose" });
  });
});
