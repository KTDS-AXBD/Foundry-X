// ─── F357: DataDiagnosticService — D1 데이터 진단 + 기준선 수립 (Sprint 161) ───

import type { DiagnosticResult } from "@foundry-x/shared";

export class DataDiagnosticService {
  constructor(private db: D1Database) {}

  /** 데이터 진단 — execution_events + task_state_history 현황 파악 */
  async diagnose(tenantId: string): Promise<DiagnosticResult> {
    // 1. execution_events 기본 통계
    const eventStats = await this.db
      .prepare(
        `SELECT COUNT(*) as total, MIN(created_at) as earliest, MAX(created_at) as latest
         FROM execution_events WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<{ total: number; earliest: string | null; latest: string | null }>();

    const totalEvents = eventStats?.total ?? 0;
    const earliestEvent = eventStats?.earliest ?? null;
    const latestEvent = eventStats?.latest ?? null;

    // 2. source별 분포
    const { results: sourceRows } = await this.db
      .prepare(
        `SELECT source, COUNT(*) as count FROM execution_events
         WHERE tenant_id = ? GROUP BY source`,
      )
      .bind(tenantId)
      .all();

    const sourceDistribution: Record<string, number> = {};
    for (const r of sourceRows ?? []) {
      sourceDistribution[r.source as string] = r.count as number;
    }

    // 3. severity별 분포
    const { results: sevRows } = await this.db
      .prepare(
        `SELECT severity, COUNT(*) as count FROM execution_events
         WHERE tenant_id = ? GROUP BY severity`,
      )
      .bind(tenantId)
      .all();

    const severityDistribution: Record<string, number> = {};
    for (const r of sevRows ?? []) {
      severityDistribution[r.severity as string] = r.count as number;
    }

    // 4. task_state_history FAILED 전이
    const failedStats = await this.db
      .prepare(
        `SELECT COUNT(*) as total FROM task_state_history
         WHERE tenant_id = ? AND to_state = 'FAILED'`,
      )
      .bind(tenantId)
      .first<{ total: number }>();

    const totalFailedTransitions = failedStats?.total ?? 0;

    // 5. FAILED 전이 source별 분포
    const { results: failedSourceRows } = await this.db
      .prepare(
        `SELECT trigger_source, COUNT(*) as count FROM task_state_history
         WHERE tenant_id = ? AND to_state = 'FAILED' GROUP BY trigger_source`,
      )
      .bind(tenantId)
      .all();

    const failedTransitionsBySource: Record<string, number> = {};
    for (const r of failedSourceRows ?? []) {
      const src = (r.trigger_source as string) || "unknown";
      failedTransitionsBySource[src] = r.count as number;
    }

    // 6. 데이터 커버리지 일수 계산
    let dataCoverageDays = 0;
    if (earliestEvent && latestEvent) {
      const diff =
        new Date(latestEvent).getTime() - new Date(earliestEvent).getTime();
      dataCoverageDays = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    }

    // 7. 데이터 충분성 판단 (최소 10건 + 7일)
    const isDataSufficient = totalEvents >= 10 && dataCoverageDays >= 7;

    return {
      totalEvents,
      totalFailedTransitions,
      earliestEvent,
      latestEvent,
      dataCoverageDays,
      sourceDistribution,
      severityDistribution,
      failedTransitionsBySource,
      isDataSufficient,
    };
  }
}
