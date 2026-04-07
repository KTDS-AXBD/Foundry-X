/**
 * Sprint 118: F292 — BDP 섹션별 HITL 리뷰 서비스
 */

import type { SectionReviewInput } from "../../shaping/schemas/hitl-section.schema.js";

export interface BdpSectionReview {
  id: string;
  orgId: string;
  bdpId: string;
  sectionId: string;
  status: string;
  reviewerId: string;
  comment: string | null;
  createdAt: string;
}

export interface BdpReviewSummary {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  revisionRequested: number;
}

export class BdpReviewService {
  constructor(private db: D1Database) {}

  async reviewSection(
    orgId: string,
    bdpId: string,
    input: SectionReviewInput,
    reviewerId: string,
  ): Promise<BdpSectionReview> {
    const id = crypto.randomUUID();

    await this.db
      .prepare(
        `INSERT INTO bdp_section_reviews (id, org_id, bdp_id, section_id, status, reviewer_id, comment)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, orgId, bdpId, input.sectionId, input.action, reviewerId, input.comment ?? null)
      .run();

    return {
      id,
      orgId,
      bdpId,
      sectionId: input.sectionId,
      status: input.action,
      reviewerId,
      comment: input.comment ?? null,
      createdAt: new Date().toISOString(),
    };
  }

  async listReviews(orgId: string, bdpId: string): Promise<BdpSectionReview[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, org_id, bdp_id, section_id, status, reviewer_id, comment, created_at
         FROM bdp_section_reviews WHERE org_id = ? AND bdp_id = ?
         ORDER BY created_at DESC`,
      )
      .bind(orgId, bdpId)
      .all<Record<string, unknown>>();

    return results.map((r) => this.mapRow(r));
  }

  async getSummary(orgId: string, bdpId: string): Promise<BdpReviewSummary> {
    const { results } = await this.db
      .prepare(
        `SELECT status, COUNT(*) as cnt
         FROM bdp_section_reviews WHERE org_id = ? AND bdp_id = ?
         GROUP BY status`,
      )
      .bind(orgId, bdpId)
      .all<{ status: string; cnt: number }>();

    const summary: BdpReviewSummary = { total: 0, approved: 0, pending: 0, rejected: 0, revisionRequested: 0 };
    for (const row of results) {
      const count = row.cnt;
      summary.total += count;
      if (row.status === "approved") summary.approved = count;
      else if (row.status === "pending") summary.pending = count;
      else if (row.status === "rejected") summary.rejected = count;
      else if (row.status === "revision_requested") summary.revisionRequested = count;
    }
    return summary;
  }

  private mapRow(r: Record<string, unknown>): BdpSectionReview {
    return {
      id: r.id as string,
      orgId: r.org_id as string,
      bdpId: r.bdp_id as string,
      sectionId: r.section_id as string,
      status: r.status as string,
      reviewerId: r.reviewer_id as string,
      comment: (r.comment as string) ?? null,
      createdAt: r.created_at as string,
    };
  }
}
