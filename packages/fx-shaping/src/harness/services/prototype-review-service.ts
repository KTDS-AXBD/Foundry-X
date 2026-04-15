/**
 * Sprint 118: F297 — Prototype 섹션별 HITL 리뷰 서비스
 * Sprint 230: F470 — revision_requested → 피드백 자동 생성 연결
 */

import type { SectionReviewInput } from "../../schemas/hitl-section.schema.js";

export interface PrototypeSectionReview {
  id: string;
  orgId: string;
  prototypeId: string;
  sectionId: string;
  status: string;
  reviewerId: string;
  comment: string | null;
  framework: string;
  createdAt: string;
}

export interface PrototypeReviewSummary {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  revisionRequested: number;
}

// F470: revision_requested 시 피드백 자동 생성을 위한 콜백 타입
export type OnRevisionRequestedFn = (
  orgId: string,
  prototypeId: string,
  sectionId: string,
  comment: string,
) => Promise<void>;

export class PrototypeReviewService {
  private onRevisionRequested: OnRevisionRequestedFn | null = null;

  constructor(private db: D1Database) {}

  /** F470: revision_requested 발생 시 호출될 콜백 등록 */
  setOnRevisionRequested(fn: OnRevisionRequestedFn): void {
    this.onRevisionRequested = fn;
  }

  async reviewSection(
    orgId: string,
    prototypeId: string,
    input: SectionReviewInput,
    reviewerId: string,
    framework: string = "react",
  ): Promise<PrototypeSectionReview> {
    const id = crypto.randomUUID();

    await this.db
      .prepare(
        `INSERT INTO prototype_section_reviews (id, org_id, prototype_id, section_id, status, reviewer_id, comment, framework)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, orgId, prototypeId, input.sectionId, input.action, reviewerId, input.comment ?? null, framework)
      .run();

    // F470: revision_requested 시 자동으로 피드백 생성
    if (input.action === "revision_requested" && input.comment && this.onRevisionRequested) {
      await this.onRevisionRequested(orgId, prototypeId, input.sectionId, input.comment);
    }

    return {
      id,
      orgId,
      prototypeId,
      sectionId: input.sectionId,
      status: input.action,
      reviewerId,
      comment: input.comment ?? null,
      framework,
      createdAt: new Date().toISOString(),
    };
  }

  async listReviews(orgId: string, prototypeId: string): Promise<PrototypeSectionReview[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, org_id, prototype_id, section_id, status, reviewer_id, comment, framework, created_at
         FROM prototype_section_reviews WHERE org_id = ? AND prototype_id = ?
         ORDER BY created_at DESC`,
      )
      .bind(orgId, prototypeId)
      .all<Record<string, unknown>>();

    return results.map((r) => this.mapRow(r));
  }

  async getSummary(orgId: string, prototypeId: string): Promise<PrototypeReviewSummary> {
    const { results } = await this.db
      .prepare(
        `SELECT status, COUNT(*) as cnt
         FROM prototype_section_reviews WHERE org_id = ? AND prototype_id = ?
         GROUP BY status`,
      )
      .bind(orgId, prototypeId)
      .all<{ status: string; cnt: number }>();

    const summary: PrototypeReviewSummary = { total: 0, approved: 0, pending: 0, rejected: 0, revisionRequested: 0 };
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

  private mapRow(r: Record<string, unknown>): PrototypeSectionReview {
    return {
      id: r.id as string,
      orgId: r.org_id as string,
      prototypeId: r.prototype_id as string,
      sectionId: r.section_id as string,
      status: r.status as string,
      reviewerId: r.reviewer_id as string,
      comment: (r.comment as string) ?? null,
      framework: r.framework as string,
      createdAt: r.created_at as string,
    };
  }
}
