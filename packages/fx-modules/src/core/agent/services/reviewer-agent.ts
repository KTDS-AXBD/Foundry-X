import type { PrReviewResult } from "@foundry-x/shared";

export interface PrReviewContext {
  agentId: string;
  taskId: string;
  taskType: string;
  prNumber: number;
}

export class ReviewerAgent {
  constructor(_llm?: unknown) {}

  async reviewPr(_prNumber: number, _diff: string, _context: PrReviewContext): Promise<PrReviewResult> {
    return { decision: "comment", summary: "stub", comments: [], sddScore: 0, qualityScore: 0, securityIssues: [] };
  }

  async reviewPullRequest(_diff: string, _context: PrReviewContext): Promise<PrReviewResult> {
    return { decision: "comment", summary: "stub", comments: [], sddScore: 0, qualityScore: 0, securityIssues: [] };
  }
}
