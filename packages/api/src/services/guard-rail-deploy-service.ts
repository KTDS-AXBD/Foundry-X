// ─── F359: GuardRailDeployService — Rule 파일 생성 + 배치 (Sprint 162, Phase 17) ───

import type { GuardRailProposal, DeployResult } from "@foundry-x/shared";

export class GuardRailDeployService {
  constructor(private db: D1Database) {}

  /** 승인된 proposal → Rule 파일 컨텐츠 생성 */
  async generateRuleFile(
    proposalId: string,
    tenantId: string,
  ): Promise<DeployResult> {
    const proposal = await this.getApprovedProposal(proposalId, tenantId);
    const ruleNumber = await this.nextRuleNumber(tenantId);
    const filename = `auto-guard-${String(ruleNumber).padStart(3, "0")}.md`;
    const content = this.formatRuleContent(proposal, ruleNumber);

    return {
      filename,
      content,
      proposalId: proposal.id,
      patternId: proposal.patternId,
    };
  }

  /** proposal 조회 + approved 상태 검증 */
  private async getApprovedProposal(
    proposalId: string,
    tenantId: string,
  ): Promise<GuardRailProposal> {
    const row = await this.db
      .prepare(
        "SELECT * FROM guard_rail_proposals WHERE id = ? AND tenant_id = ?",
      )
      .bind(proposalId, tenantId)
      .first();

    if (!row) {
      throw new DeployError("Proposal not found", 404);
    }

    if (row.status !== "approved") {
      throw new DeployError(
        "Only approved proposals can be deployed",
        400,
      );
    }

    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      patternId: row.pattern_id as string,
      ruleContent: row.rule_content as string,
      ruleFilename: row.rule_filename as string,
      rationale: row.rationale as string,
      llmModel: row.llm_model as string,
      status: row.status as GuardRailProposal["status"],
      reviewedAt: (row.reviewed_at as string) || null,
      reviewedBy: (row.reviewed_by as string) || null,
      createdAt: row.created_at as string,
    };
  }

  /** 기존 approved proposals 수 기반 다음 Rule 번호 */
  private async nextRuleNumber(tenantId: string): Promise<number> {
    const row = await this.db
      .prepare(
        "SELECT COUNT(*) as cnt FROM guard_rail_proposals WHERE tenant_id = ? AND status = 'approved'",
      )
      .bind(tenantId)
      .first<{ cnt: number }>();

    return (row?.cnt ?? 0);
  }

  /** YAML frontmatter + Rule 본문 + 근거 조합 */
  private formatRuleContent(
    proposal: GuardRailProposal,
    _ruleNumber: number,
  ): string {
    const frontmatter = [
      "---",
      "source: auto-generated",
      `pattern_id: ${proposal.patternId}`,
      `generated_at: ${proposal.createdAt}`,
      `approved_at: ${proposal.reviewedAt ?? new Date().toISOString()}`,
      `llm_model: ${proposal.llmModel}`,
      "---",
    ].join("\n");

    const body = proposal.ruleContent.trim();
    const rationale = `## 근거\n\n${proposal.rationale}`;

    return `${frontmatter}\n\n${body}\n\n${rationale}\n`;
  }
}

/** Deploy 전용 에러 (HTTP status 포함) */
export class DeployError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "DeployError";
  }
}
