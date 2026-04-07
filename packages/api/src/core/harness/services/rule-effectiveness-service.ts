// ─── F361: Rule 효과 측정 서비스 (Sprint 164, Phase 17) ───

import type { RuleEffectiveness } from "@foundry-x/shared";

export class RuleEffectivenessService {
  constructor(private db: D1Database) {}

  /**
   * FR-02: 모든 approved Rule의 효과 점수를 산출한다.
   * 알고리즘: reviewed_at 기준 전/후 windowDays 동안의 동일 패턴 발생 횟수 비교
   * score = max(0, (1 - post/pre) * 100). pre=0이면 insufficient_data.
   */
  async measureAll(
    tenantId: string,
    windowDays = 14,
  ): Promise<RuleEffectiveness[]> {
    // 승인된 Rule 목록 조회
    const { results: proposals } = await this.db
      .prepare(
        `SELECT g.id, g.pattern_id, g.rule_filename, g.reviewed_at,
                g.effectiveness_score, g.effectiveness_measured_at,
                g.pre_deploy_failures, g.post_deploy_failures
         FROM guard_rail_proposals g
         WHERE g.tenant_id = ? AND g.status = 'approved'
         ORDER BY g.reviewed_at DESC`,
      )
      .bind(tenantId)
      .all();

    if (!proposals || proposals.length === 0) return [];

    const items: RuleEffectiveness[] = [];

    for (const p of proposals) {
      const reviewedAt = p.reviewed_at as string | null;

      if (!reviewedAt) {
        items.push({
          proposalId: p.id as string,
          ruleFilename: p.rule_filename as string,
          patternId: p.pattern_id as string,
          preDeployFailures: 0,
          postDeployFailures: 0,
          effectivenessScore: 0,
          measuredAt: null,
          status: "insufficient_data",
        });
        continue;
      }

      // 전/후 window에서 동일 패턴 발생 횟수 집계
      const pre = await this.countPatternOccurrences(
        tenantId,
        p.pattern_id as string,
        reviewedAt,
        -windowDays,
      );

      const post = await this.countPatternOccurrences(
        tenantId,
        p.pattern_id as string,
        reviewedAt,
        windowDays,
      );

      let status: RuleEffectiveness["status"];
      let score: number;

      if (pre === 0) {
        status = "insufficient_data";
        score = 0;
      } else {
        score = Math.max(0, Math.round((1 - post / pre) * 100));
        status = "measured";
      }

      const now = new Date().toISOString();

      // D1에 효과 점수 저장
      await this.db
        .prepare(
          `UPDATE guard_rail_proposals
           SET effectiveness_score = ?, effectiveness_measured_at = ?,
               pre_deploy_failures = ?, post_deploy_failures = ?
           WHERE id = ?`,
        )
        .bind(score, now, pre, post, p.id as string)
        .run();

      items.push({
        proposalId: p.id as string,
        ruleFilename: p.rule_filename as string,
        patternId: p.pattern_id as string,
        preDeployFailures: pre,
        postDeployFailures: post,
        effectivenessScore: score,
        measuredAt: now,
        status,
      });
    }

    return items;
  }

  /**
   * FR-01: execution_events에서 agent source별 실패(severity=error) 가중치 추출.
   * agent_self_evaluations 테이블이 없으므로 execution_events를 대용으로 활용.
   */
  async getAgentFailureWeights(
    tenantId: string,
  ): Promise<Record<string, number>> {
    const { results } = await this.db
      .prepare(
        `SELECT source, COUNT(*) as cnt
         FROM execution_events
         WHERE tenant_id = ? AND severity = 'error'
         GROUP BY source
         ORDER BY cnt DESC`,
      )
      .bind(tenantId)
      .all();

    const weights: Record<string, number> = {};
    for (const r of results ?? []) {
      weights[r.source as string] = r.cnt as number;
    }
    return weights;
  }

  private async countPatternOccurrences(
    tenantId: string,
    patternId: string,
    referenceDate: string,
    windowDays: number,
  ): Promise<number> {
    const isAfter = windowDays > 0;
    const absDays = Math.abs(windowDays);

    const sql = isAfter
      ? `SELECT COUNT(*) as cnt FROM execution_events
         WHERE tenant_id = ? AND severity = 'error'
         AND created_at >= ? AND created_at <= datetime(?, '+${absDays} days')`
      : `SELECT COUNT(*) as cnt FROM execution_events
         WHERE tenant_id = ? AND severity = 'error'
         AND created_at >= datetime(?, '-${absDays} days') AND created_at < ?`;

    const row = await this.db
      .prepare(sql)
      .bind(tenantId, referenceDate, referenceDate)
      .first<{ cnt: number }>();

    return row?.cnt ?? 0;
  }
}
