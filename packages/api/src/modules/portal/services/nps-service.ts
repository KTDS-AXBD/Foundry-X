/**
 * NpsService — 주간 NPS 서베이 스케줄링 + 팀 집계 (F254)
 */

export interface NpsOrgSummary {
  averageNps: number;
  totalResponses: number;
  responseRate: number;
  weeklyTrend: { week: string; avgNps: number; count: number }[];
  recentFeedback: { id: string; userId: string; npsScore: number; comment: string | null; createdAt: string }[];
}

export class NpsService {
  constructor(private db: D1Database) {}

  async checkEligibility(
    orgId: string,
    userId: string,
  ): Promise<{ shouldShow: boolean; surveyId: string | null }> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const recent = await this.db
      .prepare(
        "SELECT id FROM nps_surveys WHERE org_id = ? AND user_id = ? AND triggered_at > ? LIMIT 1",
      )
      .bind(orgId, userId, sevenDaysAgo)
      .first<{ id: string }>();

    if (recent) {
      return { shouldShow: false, surveyId: null };
    }

    const surveyId = `nps_${crypto.randomUUID()}`;
    await this.db
      .prepare("INSERT INTO nps_surveys (id, org_id, user_id) VALUES (?, ?, ?)")
      .bind(surveyId, orgId, userId)
      .run();

    return { shouldShow: true, surveyId };
  }

  async completeSurvey(surveyId: string): Promise<void> {
    await this.db
      .prepare("UPDATE nps_surveys SET completed_at = datetime('now') WHERE id = ? AND completed_at IS NULL")
      .bind(surveyId)
      .run();
  }

  async dismissSurvey(surveyId: string): Promise<void> {
    await this.db
      .prepare("UPDATE nps_surveys SET dismissed_at = datetime('now') WHERE id = ? AND dismissed_at IS NULL")
      .bind(surveyId)
      .run();
  }

  async getOrgSummary(orgId: string): Promise<NpsOrgSummary> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Overall stats
    const stats = await this.db
      .prepare(
        "SELECT AVG(nps_score) as avg_nps, COUNT(*) as total FROM onboarding_feedback WHERE tenant_id = ? AND created_at > ?",
      )
      .bind(orgId, thirtyDaysAgo)
      .first<{ avg_nps: number | null; total: number }>();

    // Response rate: feedback count / survey count
    const surveyCount = await this.db
      .prepare(
        "SELECT COUNT(*) as total FROM nps_surveys WHERE org_id = ? AND triggered_at > ?",
      )
      .bind(orgId, thirtyDaysAgo)
      .first<{ total: number }>();

    const completedCount = await this.db
      .prepare(
        "SELECT COUNT(*) as total FROM nps_surveys WHERE org_id = ? AND triggered_at > ? AND completed_at IS NOT NULL",
      )
      .bind(orgId, thirtyDaysAgo)
      .first<{ total: number }>();

    const responseRate =
      surveyCount?.total && surveyCount.total > 0
        ? Math.round((completedCount?.total ?? 0) / surveyCount.total * 100) / 100
        : 0;

    // Weekly trend (last 4 weeks)
    const trendRows = await this.db
      .prepare(
        `SELECT strftime('%Y-W%W', created_at) as week,
                AVG(nps_score) as avg_nps, COUNT(*) as count
         FROM onboarding_feedback
         WHERE tenant_id = ? AND created_at > ?
         GROUP BY week
         ORDER BY week DESC
         LIMIT 4`,
      )
      .bind(orgId, thirtyDaysAgo)
      .all<{ week: string; avg_nps: number; count: number }>();

    // Recent feedback
    const recentRows = await this.db
      .prepare(
        `SELECT id, user_id, nps_score, comment, created_at
         FROM onboarding_feedback
         WHERE tenant_id = ?
         ORDER BY created_at DESC
         LIMIT 5`,
      )
      .bind(orgId)
      .all<{ id: string; user_id: string; nps_score: number; comment: string | null; created_at: string }>();

    return {
      averageNps: stats?.avg_nps ? Math.round(stats.avg_nps * 10) / 10 : 0,
      totalResponses: stats?.total ?? 0,
      responseRate,
      weeklyTrend: (trendRows.results ?? []).map((r) => ({
        week: r.week,
        avgNps: Math.round(r.avg_nps * 10) / 10,
        count: r.count,
      })),
      recentFeedback: (recentRows.results ?? []).map((r) => ({
        id: r.id,
        userId: r.user_id,
        npsScore: r.nps_score,
        comment: r.comment,
        createdAt: r.created_at,
      })),
    };
  }
}
