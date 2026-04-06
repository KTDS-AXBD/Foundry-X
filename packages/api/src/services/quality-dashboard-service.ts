// ─── F390: Quality Dashboard Service (Sprint 178) ───

import type { QualityDashboardSummary, DimensionAverage, QualityTrend } from "../schemas/quality-dashboard-schema.js";

export class QualityDashboardService {
  constructor(private db: D1Database) {}

  async getSummary(): Promise<QualityDashboardSummary> {
    // 각 job의 최신 라운드만 집계
    const scoreRow = await this.db
      .prepare(
        `SELECT
           COUNT(DISTINCT job_id) AS total,
           AVG(total_score) AS avg_score,
           SUM(CASE WHEN total_score >= 80 THEN 1 ELSE 0 END) AS above_80
         FROM prototype_quality pq
         WHERE pq.round = (
           SELECT MAX(pq2.round) FROM prototype_quality pq2 WHERE pq2.job_id = pq.job_id
         )`,
      )
      .first<{ total: number; avg_score: number | null; above_80: number }>();

    const costRow = await this.db
      .prepare(
        `SELECT
           SUM(CASE WHEN generation_mode IN ('cli', 'max-cli') THEN 1 ELSE 0 END) AS cli_count,
           SUM(CASE WHEN generation_mode = 'api' THEN 1 ELSE 0 END) AS api_count,
           SUM(CASE WHEN generation_mode = 'api' THEN cost_usd ELSE 0 END) AS total_api_cost
         FROM prototype_quality`,
      )
      .first<{ cli_count: number; api_count: number; total_api_cost: number }>();

    const total = scoreRow?.total ?? 0;
    const avgApiCost =
      costRow && costRow.api_count > 0
        ? costRow.total_api_cost / costRow.api_count
        : 0.48;

    return {
      totalPrototypes: total,
      averageScore: Math.round((scoreRow?.avg_score ?? 0) * 10) / 10,
      above80Count: scoreRow?.above_80 ?? 0,
      above80Pct: total > 0 ? Math.round(((scoreRow?.above_80 ?? 0) / total) * 1000) / 10 : 0,
      totalCostSaved: Math.round((costRow?.cli_count ?? 0) * avgApiCost * 100) / 100,
      generationModes: {
        cli: costRow?.cli_count ?? 0,
        api: costRow?.api_count ?? 0,
      },
    };
  }

  async getDimensionAverages(): Promise<DimensionAverage> {
    const row = await this.db
      .prepare(
        `SELECT
           AVG(build_score) AS build,
           AVG(ui_score) AS ui,
           AVG(functional_score) AS functional,
           AVG(prd_score) AS prd,
           AVG(code_score) AS code
         FROM prototype_quality pq
         WHERE pq.round = (
           SELECT MAX(pq2.round) FROM prototype_quality pq2 WHERE pq2.job_id = pq.job_id
         )`,
      )
      .first<{ build: number | null; ui: number | null; functional: number | null; prd: number | null; code: number | null }>();

    return {
      build: Math.round((row?.build ?? 0) * 1000) / 1000,
      ui: Math.round((row?.ui ?? 0) * 1000) / 1000,
      functional: Math.round((row?.functional ?? 0) * 1000) / 1000,
      prd: Math.round((row?.prd ?? 0) * 1000) / 1000,
      code: Math.round((row?.code ?? 0) * 1000) / 1000,
    };
  }

  async getTrend(days: number = 30): Promise<QualityTrend> {
    const { results } = await this.db
      .prepare(
        `SELECT
           date(created_at) AS date,
           AVG(total_score) AS avg_score,
           COUNT(*) AS count
         FROM prototype_quality
         WHERE created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY date(created_at)
         ORDER BY date ASC`,
      )
      .bind(days)
      .all<{ date: string; avg_score: number; count: number }>();

    return {
      points: (results ?? []).map((r) => ({
        date: r.date,
        avgScore: Math.round(r.avg_score * 10) / 10,
        count: r.count,
      })),
      period: `${days}d`,
    };
  }
}
