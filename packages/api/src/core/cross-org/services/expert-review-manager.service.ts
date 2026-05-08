// F620 CO-I04: ExpertReviewManager — Cross-Org 분류 결정 HITL 라이프사이클
// SME가 자동 분류 결과(특히 core_differentiator)를 검토 → approve/reject/reclassify
// F605 HITL Console UI는 외부 — 본 service는 escalation 큐 contract만 제공
import { generateTraceId, generateSpanId } from "../../infra/audit-bus.js";
import type { AuditBus } from "../../infra/types.js";

export type ReviewStatus = "pending" | "in_review" | "signed_off";
export type ReviewDecision = "approve" | "reject" | "reclassify";

export interface ReviewQueueEntry {
  reviewId: string;
  assignmentId: string;
  orgId: string;
  status: ReviewStatus;
  decision: ReviewDecision | null;
  reclassifiedTo: string | null;
  expertId: string | null;
  notes: string | null;
  enqueuedAt: number;
  signedOffAt: number | null;
}

interface ReviewRow {
  review_id: string;
  assignment_id: string;
  org_id: string;
  status: ReviewStatus;
  decision: ReviewDecision | null;
  reclassified_to: string | null;
  expert_id: string | null;
  notes: string | null;
  enqueued_at: number;
  signed_off_at: number | null;
}

const ROW_TO_ENTRY = (r: ReviewRow): ReviewQueueEntry => ({
  reviewId: r.review_id,
  assignmentId: r.assignment_id,
  orgId: r.org_id,
  status: r.status,
  decision: r.decision,
  reclassifiedTo: r.reclassified_to,
  expertId: r.expert_id,
  notes: r.notes,
  enqueuedAt: r.enqueued_at,
  signedOffAt: r.signed_off_at,
});

export class ExpertReviewManager {
  constructor(
    private readonly db: D1Database,
    private readonly auditBus: AuditBus,
  ) {}

  async enqueueReview(input: { assignmentId: string; orgId: string }): Promise<ReviewQueueEntry> {
    const reviewId = crypto.randomUUID();
    const now = Date.now();
    await this.db
      .prepare(
        `INSERT INTO cross_org_review_queue
         (review_id, assignment_id, org_id, status, enqueued_at)
         VALUES (?, ?, ?, 'pending', ?)`,
      )
      .bind(reviewId, input.assignmentId, input.orgId, now)
      .run();

    await this.auditBus.emit(
      "cross_org.review_enqueued",
      { reviewId, assignmentId: input.assignmentId, orgId: input.orgId },
      { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true },
      undefined,
      input.orgId,
    );

    return {
      reviewId,
      assignmentId: input.assignmentId,
      orgId: input.orgId,
      status: "pending",
      decision: null,
      reclassifiedTo: null,
      expertId: null,
      notes: null,
      enqueuedAt: now,
      signedOffAt: null,
    };
  }

  async getQueue(orgId: string, status?: ReviewStatus): Promise<ReviewQueueEntry[]> {
    const stmt = status
      ? this.db.prepare(
          "SELECT * FROM cross_org_review_queue WHERE org_id = ? AND status = ? ORDER BY enqueued_at ASC",
        ).bind(orgId, status)
      : this.db.prepare(
          "SELECT * FROM cross_org_review_queue WHERE org_id = ? ORDER BY enqueued_at ASC",
        ).bind(orgId);

    const result = await stmt.all<ReviewRow>();
    return (result.results ?? []).map(ROW_TO_ENTRY);
  }

  async signOff(input: {
    reviewId: string;
    expertId: string;
    decision: ReviewDecision;
    reclassifiedTo?: string;
    notes?: string;
  }): Promise<ReviewQueueEntry | null> {
    const now = Date.now();
    await this.db
      .prepare(
        `UPDATE cross_org_review_queue
         SET status = 'signed_off',
             decision = ?,
             reclassified_to = ?,
             expert_id = ?,
             notes = ?,
             signed_off_at = ?
         WHERE review_id = ? AND status != 'signed_off'`,
      )
      .bind(
        input.decision,
        input.reclassifiedTo ?? null,
        input.expertId,
        input.notes ?? null,
        now,
        input.reviewId,
      )
      .run();

    const row = await this.db
      .prepare("SELECT * FROM cross_org_review_queue WHERE review_id = ?")
      .bind(input.reviewId)
      .first<ReviewRow>();
    if (!row) return null;

    await this.auditBus.emit(
      "cross_org.review_signed_off",
      {
        reviewId: input.reviewId,
        expertId: input.expertId,
        decision: input.decision,
        reclassifiedTo: input.reclassifiedTo ?? null,
        assignmentId: row.assignment_id,
      },
      { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true },
      input.expertId,
      row.org_id,
    );

    return ROW_TO_ENTRY(row);
  }
}
