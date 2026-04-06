/**
 * FeedbackService — NPS 피드백 수집 + 요약 (F121)
 */

export interface FeedbackRecord {
  id: string;
  userId: string;
  npsScore: number;
  comment: string | null;
  createdAt: string;
}

export class FeedbackService {
  constructor(private db: D1Database) {}

  async submit(
    tenantId: string,
    userId: string,
    npsScore: number,
    comment?: string,
    context?: { pagePath?: string; sessionSeconds?: number; feedbackType?: string },
  ): Promise<{ id: string; npsScore: number }> {
    const id = `fb-${crypto.randomUUID()}`;
    const hasContext = context?.pagePath != null || context?.sessionSeconds != null || (context?.feedbackType && context.feedbackType !== "nps");

    if (hasContext) {
      await this.db
        .prepare(
          "INSERT INTO onboarding_feedback (id, tenant_id, user_id, nps_score, comment, page_path, session_seconds, feedback_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          id,
          tenantId,
          userId,
          npsScore,
          comment ?? null,
          context?.pagePath ?? null,
          context?.sessionSeconds ?? null,
          context?.feedbackType ?? "nps",
        )
        .run();
    } else {
      await this.db
        .prepare(
          "INSERT INTO onboarding_feedback (id, tenant_id, user_id, nps_score, comment) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(id, tenantId, userId, npsScore, comment ?? null)
        .run();
    }

    return { id, npsScore };
  }

  async getSummary(tenantId: string): Promise<{
    averageNps: number;
    totalResponses: number;
    recentFeedback: FeedbackRecord[];
  }> {
    const aggResult = await this.db
      .prepare(
        "SELECT AVG(nps_score) as avg_nps, COUNT(*) as total FROM onboarding_feedback WHERE tenant_id = ?",
      )
      .bind(tenantId)
      .first<{ avg_nps: number | null; total: number }>();

    const recentRows = await this.db
      .prepare(
        "SELECT id, user_id, nps_score, comment, created_at FROM onboarding_feedback WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 5",
      )
      .bind(tenantId)
      .all<{ id: string; user_id: string; nps_score: number; comment: string | null; created_at: string }>();

    const recentFeedback: FeedbackRecord[] = (recentRows.results ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      npsScore: r.nps_score,
      comment: r.comment,
      createdAt: r.created_at,
    }));

    return {
      averageNps: aggResult?.avg_nps ? Math.round(aggResult.avg_nps * 10) / 10 : 0,
      totalResponses: aggResult?.total ?? 0,
      recentFeedback,
    };
  }
}
