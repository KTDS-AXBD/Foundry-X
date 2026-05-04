import type { GitHubService } from "./github.js";
import type { ReviewerAgent, PrReviewContext } from "../../../core/agent/services/reviewer-agent.js";
import type { PrReviewResult } from "@foundry-x/shared";

// ─── Types ───

export interface ExternalReviewResult extends PrReviewResult {
  prNumber: number;
}

export interface FoundryCommand {
  command: "review" | "status" | "approve" | "help";
  args: string;
}

// ─── Errors ───

export class ReviewCooldownError extends Error {
  constructor(public prNumber: number) {
    super(`PR #${prNumber} was recently reviewed. Please wait 5 minutes.`);
  }
}

// ─── Constants ───

export const HELP_COMMENT = `## 🤖 Foundry-X Commands

| Command | Description |
|---------|-------------|
| \`@foundry-x review\` | AI 코드 리뷰 실행 (SDD, Quality, Security 점수) |
| \`@foundry-x status\` | 현재 리뷰 상태 조회 |
| \`@foundry-x approve\` | 리뷰 게이트 강제 통과 (repo admin only) |
| \`@foundry-x help\` | 이 도움말 표시 |

---
_Powered by [Foundry-X](https://fx.minu.best)_`;

const FX_LABEL_PREFIXES = ["fx-", "sdd:", "quality:", "security:"];

// ─── Command Parser ───

export function parseFoundryCommand(body: string): FoundryCommand | null {
  const match = body.match(
    /@foundry-x\s+(review|status|approve|help)(?:\s+(.*))?/i,
  );
  if (!match) return null;
  return {
    command: match[1]!.toLowerCase() as FoundryCommand["command"],
    args: match[2]?.trim() ?? "",
  };
}

// ─── Status Comment Formatter ───

export function formatStatusComment(result: ExternalReviewResult | null): string {
  if (!result) {
    return "## 🤖 Foundry-X Status\n\nNo review found for this PR. Use `@foundry-x review` to start one.";
  }

  const decisionEmoji: Record<string, string> = {
    approve: "✅ Approved",
    request_changes: "🔴 Changes Requested",
    comment: "💬 Comments",
  };

  return `## 🤖 Foundry-X Status

| Metric | Score |
|--------|------:|
| SDD Compliance | ${result.sddScore}/100 |
| Code Quality | ${result.qualityScore}/100 |
| Security Issues | ${result.securityIssues.length} |

**Decision:** ${decisionEmoji[result.decision] ?? result.decision}

**Summary:** ${result.summary}

---
_Powered by [Foundry-X](https://fx.minu.best)_`;
}

// ─── Severity Icon ───

function severityIcon(severity: string): string {
  return { error: "🔴", warning: "⚠️", info: "ℹ️" }[severity] ?? "ℹ️";
}

// ─── GitHubReviewService ───

export class GitHubReviewService {
  constructor(
    private github: GitHubService,
    private reviewer: ReviewerAgent,
    private db: D1Database,
    private orgId: string,
    private repo: string,
  ) {}

  async reviewPr(prNumber: number): Promise<ExternalReviewResult> {
    // 1. Cooldown check (5 min)
    const lastReview = await this.getLastReviewTime(prNumber);
    if (lastReview && Date.now() - lastReview < 5 * 60 * 1000) {
      throw new ReviewCooldownError(prNumber);
    }

    // 2. Get PR diff
    const diff = await this.github.getPrDiff(prNumber);

    // 3. ReviewerAgent call
    const context: PrReviewContext = {
      agentId: "external-reviewer",
      taskId: `external-pr-${prNumber}`,
      taskType: "external-review",
      prNumber,
    };
    const result = await this.reviewer.reviewPullRequest(diff, context);

    // 4. DB upsert
    await this.upsertPrRecord(prNumber, result);

    // 5. Post review to GitHub
    await this.postReviewToGitHub(prNumber, result);

    // 6. Apply labels
    await this.applyReviewLabels(prNumber, result);

    return { prNumber, ...result };
  }

  async getReviewResult(prNumber: number): Promise<ExternalReviewResult | null> {
    const row = await this.db
      .prepare(
        "SELECT pr_number, review_decision, sdd_score, quality_score, security_issues FROM agent_prs WHERE pr_number = ?",
      )
      .bind(prNumber)
      .first<{
        pr_number: number;
        review_decision: string | null;
        sdd_score: number | null;
        quality_score: number | null;
        security_issues: string | null;
      }>();

    if (!row || !row.review_decision) return null;

    return {
      prNumber: row.pr_number,
      decision: row.review_decision as PrReviewResult["decision"],
      summary: "",
      comments: [],
      sddScore: row.sdd_score ?? 0,
      qualityScore: row.quality_score ?? 0,
      securityIssues: row.security_issues ? JSON.parse(row.security_issues) : [],
    };
  }

  async forceApprove(prNumber: number, approvedBy: string): Promise<void> {
    await this.db
      .prepare(
        "UPDATE agent_prs SET status = 'approved', review_decision = 'approve', updated_at = datetime('now') WHERE pr_number = ?",
      )
      .bind(prNumber)
      .run();

    await this.github.addIssueComment(
      prNumber,
      `## 🤖 Foundry-X Force Approved\n\nPR force-approved by **@${approvedBy}**.\n\n---\n_Powered by [Foundry-X](https://fx.minu.best)_`,
    );
  }

  // ─── Private methods ───

  private async postReviewToGitHub(
    prNumber: number,
    result: PrReviewResult,
  ): Promise<void> {
    const decisionEmoji: Record<string, string> = {
      approve: "✅ Approved",
      request_changes: "🔴 Changes Requested",
      comment: "💬 Comments",
    };

    const commentLines = result.comments
      .map((c) => `- \`${c.file}:${c.line}\` ${severityIcon(c.severity)} ${c.comment}`)
      .join("\n");

    const body = `## 🤖 Foundry-X AI Review

| Metric | Score |
|--------|------:|
| SDD Compliance | ${result.sddScore}/100 |
| Code Quality | ${result.qualityScore}/100 |
| Security Issues | ${result.securityIssues.length} |

**Decision:** ${decisionEmoji[result.decision] ?? result.decision}

**Summary:** ${result.summary}

${commentLines ? `### Comments\n${commentLines}` : ""}

---
_Reviewed by [Foundry-X](https://fx.minu.best) AI Reviewer_`;

    const ghEvent =
      result.decision === "approve"
        ? ("APPROVE" as const)
        : result.decision === "request_changes"
          ? ("REQUEST_CHANGES" as const)
          : ("COMMENT" as const);

    await this.github.createPrReview(prNumber, { body, event: ghEvent });
  }

  private async applyReviewLabels(
    prNumber: number,
    result: PrReviewResult,
  ): Promise<string[]> {
    const labels: string[] = [];

    // SDD score label
    labels.push(result.sddScore >= 80 ? "sdd:pass" : "sdd:needs-work");

    // Quality score label
    labels.push(result.qualityScore >= 70 ? "quality:good" : "quality:needs-work");

    // Security label
    if (result.securityIssues.length > 0) {
      labels.push("security:review-needed");
    }

    // Decision label
    if (result.decision === "approve") {
      labels.push("fx-approved");
    }

    // Clean previous labels then add new
    await this.cleanPreviousLabels(prNumber);
    await this.github.addLabels(prNumber, labels);

    return labels;
  }

  private async cleanPreviousLabels(prNumber: number): Promise<void> {
    // Remove known fx-* prefixed labels
    const knownLabels = [
      "fx-approved",
      "sdd:pass",
      "sdd:needs-work",
      "quality:good",
      "quality:needs-work",
      "security:review-needed",
    ];
    for (const label of knownLabels) {
      await this.github.removeLabel(prNumber, label);
    }
  }

  private async upsertPrRecord(
    prNumber: number,
    result: PrReviewResult,
  ): Promise<string> {
    const existing = await this.db
      .prepare("SELECT id FROM agent_prs WHERE pr_number = ?")
      .bind(prNumber)
      .first<{ id: string }>();

    if (existing) {
      await this.db
        .prepare(
          `UPDATE agent_prs
           SET review_decision = ?, sdd_score = ?, quality_score = ?,
               security_issues = ?, review_agent_id = 'external-reviewer',
               status = 'reviewing', updated_at = datetime('now')
           WHERE id = ?`,
        )
        .bind(
          result.decision,
          result.sddScore,
          result.qualityScore,
          JSON.stringify(result.securityIssues),
          existing.id,
        )
        .run();
      return existing.id;
    }

    // INSERT — external PR with no task
    const id = `pr-ext-${prNumber}-${Date.now()}`;
    await this.db
      .prepare(
        `INSERT INTO agent_prs
          (id, agent_id, task_id, repo, branch, pr_number, status,
           review_decision, sdd_score, quality_score, security_issues,
           review_agent_id, merge_strategy)
         VALUES (?, 'external', NULL, ?, ?, ?, 'reviewing',
                 ?, ?, ?, ?, 'external-reviewer', 'squash')`,
      )
      .bind(
        id,
        this.repo,
        `external-pr-${prNumber}`,
        prNumber,
        result.decision,
        result.sddScore,
        result.qualityScore,
        JSON.stringify(result.securityIssues),
      )
      .run();
    return id;
  }

  async getLastReviewTime(prNumber: number): Promise<number | null> {
    const row = await this.db
      .prepare(
        "SELECT updated_at FROM agent_prs WHERE pr_number = ? AND review_decision IS NOT NULL",
      )
      .bind(prNumber)
      .first<{ updated_at: string }>();

    if (!row) return null;
    return new Date(row.updated_at + 'Z').getTime();
  }
}
