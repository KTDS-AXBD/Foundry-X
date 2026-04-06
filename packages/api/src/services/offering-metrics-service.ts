/**
 * F383: OfferingMetricsService — Offering 이벤트 기록 + 집계 (Sprint 174)
 * skill_executions 테이블을 재활용하여 F274 인프라와 통합
 */

import type { RecordOfferingEventInput, OfferingMetricsSummary, OfferingMetricsQuery } from "../schemas/offering-metrics.schema.js";

export class OfferingMetricsService {
  constructor(private db: D1Database) {}

  /**
   * Offering 이벤트를 skill_executions에 기록
   * skill_id = "offering-{eventType}" 패턴
   */
  async recordEvent(
    tenantId: string,
    params: RecordOfferingEventInput,
    userId: string,
  ): Promise<{ id: string }> {
    const id = generateId("oe");
    const skillId = `offering-${params.eventType}`;

    await this.db
      .prepare(
        `INSERT INTO skill_executions
          (id, tenant_id, skill_id, version, biz_item_id, artifact_id, model, status,
           input_tokens, output_tokens, cost_usd, duration_ms, error_message, executed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        tenantId,
        skillId,
        1,
        params.bizItemId ?? null,
        params.offeringId,
        "system",
        "completed",
        0,
        0,
        0,
        params.durationMs,
        params.metadata ? JSON.stringify(params.metadata) : null,
        userId,
      )
      .run();

    return { id };
  }

  /**
   * 기간별 Offering 메트릭 집계
   */
  async getSummary(
    tenantId: string,
    query: OfferingMetricsQuery,
  ): Promise<OfferingMetricsSummary> {
    const days = query.days ?? 30;
    const cutoff = new Date(Date.now() - days * 86400_000).toISOString();

    let sql = `SELECT
        skill_id,
        COUNT(*) as cnt,
        AVG(duration_ms) as avg_duration
      FROM skill_executions
      WHERE tenant_id = ?
        AND executed_at >= ?
        AND skill_id LIKE 'offering-%'`;

    const bindings: unknown[] = [tenantId, cutoff];

    if (query.bizItemId) {
      sql += " AND biz_item_id = ?";
      bindings.push(query.bizItemId);
    }

    sql += " GROUP BY skill_id";

    const rows = await this.db
      .prepare(sql)
      .bind(...bindings)
      .all<{ skill_id: string; cnt: number; avg_duration: number }>();

    const byType: Record<string, { count: number; avgDuration: number }> = {};
    for (const r of rows.results ?? []) {
      const eventType = r.skill_id.replace("offering-", "");
      byType[eventType] = { count: r.cnt, avgDuration: r.avg_duration ?? 0 };
    }

    // validation pass rate: validated events with no error_message
    let validationPassRate = 0;
    const totalValidated = byType["validated"]?.count ?? 0;
    if (totalValidated > 0) {
      const passRow = await this.db
        .prepare(
          `SELECT COUNT(*) as cnt FROM skill_executions
           WHERE tenant_id = ? AND executed_at >= ?
             AND skill_id = 'offering-validated'
             AND (error_message IS NULL OR error_message = '')`,
        )
        .bind(tenantId, cutoff)
        .first<{ cnt: number }>();
      validationPassRate = Math.round(((passRow?.cnt ?? 0) / totalValidated) * 100);
    }

    return {
      totalCreated: byType["created"]?.count ?? 0,
      totalExported: byType["exported"]?.count ?? 0,
      totalValidated,
      totalPrototypes: byType["prototype_generated"]?.count ?? 0,
      avgCreationTimeMs: Math.round(byType["created"]?.avgDuration ?? 0),
      avgExportTimeMs: Math.round(byType["exported"]?.avgDuration ?? 0),
      validationPassRate,
      period: { days },
    };
  }

  /**
   * 특정 Offering의 이벤트 이력
   */
  async getEventHistory(
    tenantId: string,
    offeringId: string,
    limit = 50,
    offset = 0,
  ): Promise<Array<{
    id: string;
    eventType: string;
    durationMs: number;
    metadata: string | null;
    executedBy: string;
    executedAt: string;
  }>> {
    const rows = await this.db
      .prepare(
        `SELECT id, skill_id, duration_ms, error_message, executed_by, executed_at
         FROM skill_executions
         WHERE tenant_id = ? AND artifact_id = ? AND skill_id LIKE 'offering-%'
         ORDER BY executed_at DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(tenantId, offeringId, limit, offset)
      .all<{
        id: string;
        skill_id: string;
        duration_ms: number;
        error_message: string | null;
        executed_by: string;
        executed_at: string;
      }>();

    return (rows.results ?? []).map((r) => ({
      id: r.id,
      eventType: r.skill_id.replace("offering-", ""),
      durationMs: r.duration_ms,
      metadata: r.error_message,
      executedBy: r.executed_by,
      executedAt: r.executed_at,
    }));
  }

  /**
   * Offering 자동화 절감액 계산 (BD ROI 연동용)
   * 수동 제안서 작성 평균: 4시간 (14,400,000ms)
   * 시간당 인건비: $50
   */
  async calculateOfferingSavings(
    tenantId: string,
    fromDate: string,
  ): Promise<number> {
    const MANUAL_TIME_MS = 14_400_000; // 4시간
    const HOURLY_RATE = 50; // USD

    const row = await this.db
      .prepare(
        `SELECT COUNT(*) as cnt, AVG(duration_ms) as avg_ms
         FROM skill_executions
         WHERE tenant_id = ? AND executed_at >= ?
           AND skill_id = 'offering-created'
           AND status = 'completed'`,
      )
      .bind(tenantId, fromDate)
      .first<{ cnt: number; avg_ms: number }>();

    if (!row || row.cnt === 0) return 0;

    const avgAutoMs = row.avg_ms ?? 0;
    const timeSavedPerOfferingMs = Math.max(0, MANUAL_TIME_MS - avgAutoMs);
    const timeSavedHours = timeSavedPerOfferingMs / 3_600_000;
    const totalSavings = timeSavedHours * HOURLY_RATE * row.cnt;

    return Math.round(totalSavings * 100) / 100;
  }
}

function generateId(prefix: string): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${t}${r}`;
}
