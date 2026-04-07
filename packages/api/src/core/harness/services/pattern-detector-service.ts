// ─── F358: PatternDetectorService — 반복 실패 패턴 감지 (Sprint 161) ───

import type { FailurePattern, DetectPatternsResult } from "@foundry-x/shared";

export class PatternDetectorService {
  constructor(private db: D1Database) {}

  /** 반복 실패 패턴 감지 + failure_patterns 저장 */
  async detect(
    tenantId: string,
    options?: { minOccurrences?: number; sinceDays?: number },
  ): Promise<DetectPatternsResult> {
    const minOcc = options?.minOccurrences ?? 3;
    const sinceDays = options?.sinceDays ?? 30;

    // 1. source × severity 조합별 집계 (error/critical만)
    const { results: clusters } = await this.db
      .prepare(
        `SELECT source || ':' || severity AS pattern_key,
                COUNT(*) as cnt,
                MIN(created_at) as first_seen,
                MAX(created_at) as last_seen,
                GROUP_CONCAT(id) as event_ids
         FROM execution_events
         WHERE tenant_id = ?
           AND severity IN ('error', 'critical')
           AND created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY source, severity
         HAVING COUNT(*) >= ?`,
      )
      .bind(tenantId, sinceDays, minOcc)
      .all();

    const patterns: FailurePattern[] = [];
    let patternsNew = 0;
    let patternsUpdated = 0;

    for (const row of clusters ?? []) {
      const patternKey = row.pattern_key as string;
      const occurrenceCount = row.cnt as number;
      const firstSeen = row.first_seen as string;
      const lastSeen = row.last_seen as string;
      const allEventIds = (row.event_ids as string).split(",");
      const sampleIds = allEventIds.slice(0, 5);

      // sample payloads 조회
      const samplePayloads = await this.fetchSamplePayloads(sampleIds);

      // 기존 패턴 확인
      const existing = await this.db
        .prepare(
          "SELECT id, status FROM failure_patterns WHERE tenant_id = ? AND pattern_key = ?",
        )
        .bind(tenantId, patternKey)
        .first<{ id: string; status: string }>();

      const id = existing?.id ?? crypto.randomUUID();
      const now = new Date().toISOString();

      if (existing) {
        // 기존 패턴 업데이트
        await this.db
          .prepare(
            `UPDATE failure_patterns SET occurrence_count = ?, first_seen = ?, last_seen = ?,
             sample_event_ids = ?, sample_payloads = ?, updated_at = ? WHERE id = ?`,
          )
          .bind(
            occurrenceCount,
            firstSeen,
            lastSeen,
            JSON.stringify(sampleIds),
            JSON.stringify(samplePayloads),
            now,
            existing.id,
          )
          .run();
        patternsUpdated++;
      } else {
        // 신규 패턴 ��입
        await this.db
          .prepare(
            `INSERT INTO failure_patterns (id, tenant_id, pattern_key, occurrence_count, first_seen, last_seen,
             sample_event_ids, sample_payloads, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'detected', ?, ?)`,
          )
          .bind(
            id,
            tenantId,
            patternKey,
            occurrenceCount,
            firstSeen,
            lastSeen,
            JSON.stringify(sampleIds),
            JSON.stringify(samplePayloads),
            now,
            now,
          )
          .run();
        patternsNew++;
      }

      patterns.push({
        id: existing?.id ?? id,
        tenantId,
        patternKey,
        occurrenceCount,
        firstSeen,
        lastSeen,
        sampleEventIds: sampleIds,
        samplePayloads,
        status: (existing?.status as FailurePattern["status"]) ?? "detected",
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      patternsFound: patterns.length,
      patternsNew,
      patternsUpdated,
      patterns,
    };
  }

  private async fetchSamplePayloads(
    eventIds: string[],
  ): Promise<unknown[]> {
    if (eventIds.length === 0) return [];

    const placeholders = eventIds.map(() => "?").join(",");
    const { results } = await this.db
      .prepare(
        `SELECT payload FROM execution_events WHERE id IN (${placeholders})`,
      )
      .bind(...eventIds)
      .all();

    return (results ?? []).map((r) => {
      try {
        return JSON.parse(r.payload as string);
      } catch {
        return r.payload;
      }
    });
  }
}
