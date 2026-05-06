import type { LLMService } from "../../infra/types.js";
import type { PrReviewResult, PrReviewComment } from "@foundry-x/shared";

const MAX_DIFF_LENGTH = 15000;

interface PrReviewContext {
  agentId: string;
  taskId: string;
  taskType: string;
  prNumber: number;
}

const REVIEW_SYSTEM_PROMPT = `You are a code reviewer for the Foundry-X platform.
Review the given pull request diff and return a structured JSON response.

Evaluate against these criteria:
1. SDD (Spec-Driven Development) compliance: Does the code match specifications?
2. Code quality: readability, maintainability, patterns
3. Security: injection, XSS, secrets, unsafe operations

OUTPUT FORMAT (JSON only, no markdown wrapping):
{
  "decision": "approve" | "request_changes" | "comment",
  "summary": "Brief review summary (1-3 sentences)",
  "comments": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "comment": "Description of issue or suggestion",
      "severity": "error" | "warning" | "info"
    }
  ],
  "sddScore": 0-100,
  "qualityScore": 0-100,
  "securityIssues": ["description of security concern if any"]
}

RULES:
- sddScore: 100 = perfect spec alignment, 0 = no alignment
- qualityScore: 100 = excellent code quality, 0 = poor
- "approve" if sddScore >= 80 AND qualityScore >= 70 AND no critical security issues
- "request_changes" if any score < 60 or critical security issues exist
- "comment" otherwise
- Output ONLY valid JSON, no explanation`;

function buildReviewPrompt(diff: string, context: PrReviewContext): string {
  const truncatedDiff = diff.length > MAX_DIFF_LENGTH
    ? diff.slice(0, MAX_DIFF_LENGTH) + "\n... (truncated)"
    : diff;

  return `Review this pull request diff.

Agent: ${context.agentId}
Task: ${context.taskId} (${context.taskType})
PR: #${context.prNumber}

--- DIFF ---
${truncatedDiff}`;
}

function clampScore(value: unknown): number {
  const num = typeof value === "number" ? value : 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

const DEFAULT_REVIEW: PrReviewResult = {
  decision: "comment",
  summary: "Review could not be completed — manual review recommended.",
  comments: [],
  sddScore: 50,
  qualityScore: 50,
  securityIssues: [],
};

export class ReviewerAgent {
  constructor(private llmService: LLMService) {}

  async reviewPullRequest(diff: string, context: PrReviewContext): Promise<PrReviewResult> {
    const userPrompt = buildReviewPrompt(diff, context);

    let response: { content: string };
    try {
      response = await this.llmService.generate(REVIEW_SYSTEM_PROMPT, userPrompt);
    } catch {
      return DEFAULT_REVIEW;
    }

    return this.parseReviewResponse(response.content);
  }

  private parseReviewResponse(content: string): PrReviewResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return DEFAULT_REVIEW;

      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

      const validDecisions = ["approve", "request_changes", "comment"] as const;
      const decision = validDecisions.includes(parsed.decision as typeof validDecisions[number])
        ? (parsed.decision as PrReviewResult["decision"])
        : "comment";

      const comments: PrReviewComment[] = Array.isArray(parsed.comments)
        ? (parsed.comments as Record<string, unknown>[]).map((c) => ({
            file: String(c.file ?? ""),
            line: typeof c.line === "number" ? c.line : 0,
            comment: String(c.comment ?? ""),
            severity: (["error", "warning", "info"] as const).includes(c.severity as "error" | "warning" | "info")
              ? (c.severity as PrReviewComment["severity"])
              : "info",
          }))
        : [];

      const securityIssues: string[] = Array.isArray(parsed.securityIssues)
        ? (parsed.securityIssues as unknown[]).map(String)
        : [];

      return {
        decision,
        summary: typeof parsed.summary === "string" ? parsed.summary : DEFAULT_REVIEW.summary,
        comments,
        sddScore: clampScore(parsed.sddScore),
        qualityScore: clampScore(parsed.qualityScore),
        securityIssues,
      };
    } catch {
      return DEFAULT_REVIEW;
    }
  }
}

export type { PrReviewContext };
