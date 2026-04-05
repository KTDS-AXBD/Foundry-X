// ─── F335: TelemetryCollector — Event Bus 구독 → D1 기록 (Sprint 150) ───

import type { TaskEvent } from "@foundry-x/shared";
import type { ExecutionEventRecord } from "@foundry-x/shared";
import { EventBus } from "./event-bus.js";

export class TelemetryCollector {
  constructor(private db: D1Database) {}

  /** EventBus에 구독하여 모든 이벤트를 D1 execution_events에 기록. unsubscribe 반환 */
  subscribe(eventBus: EventBus): () => void {
    return eventBus.subscribe("*", async (event) => {
      await this.record(event);
    });
  }

  /** 이벤트 직접 기록 */
  async record(event: TaskEvent): Promise<void> {
    await this.db.prepare(
      `INSERT INTO execution_events (id, task_id, tenant_id, source, severity, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      event.id,
      event.taskId,
      event.tenantId,
      event.source,
      event.severity,
      JSON.stringify(event.payload),
      event.timestamp,
    ).run();
  }

  /** 특정 태스크의 텔레메트리 이벤트 조회 */
  async getEvents(
    taskId: string,
    tenantId: string,
    options?: { source?: string; limit?: number; offset?: number },
  ): Promise<{ items: ExecutionEventRecord[]; total: number }> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const source = options?.source;

    const where = source
      ? "WHERE task_id = ? AND tenant_id = ? AND source = ?"
      : "WHERE task_id = ? AND tenant_id = ?";
    const binds = source
      ? [taskId, tenantId, source]
      : [taskId, tenantId];

    const countRow = await this.db.prepare(
      `SELECT COUNT(*) as total FROM execution_events ${where}`
    ).bind(...binds).first<{ total: number }>();

    const { results } = await this.db.prepare(
      `SELECT * FROM execution_events ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...binds, limit, offset).all();

    return {
      items: (results ?? []).map((r) => this.toRecord(r)),
      total: countRow?.total ?? 0,
    };
  }

  /** 소스별 이벤트 수 집계 */
  async getEventCounts(
    tenantId: string,
    since?: string,
  ): Promise<Record<string, number>> {
    const where = since
      ? "WHERE tenant_id = ? AND created_at >= ?"
      : "WHERE tenant_id = ?";
    const binds = since ? [tenantId, since] : [tenantId];

    const { results } = await this.db.prepare(
      `SELECT source, COUNT(*) as count FROM execution_events ${where} GROUP BY source`
    ).bind(...binds).all();

    const counts: Record<string, number> = {};
    for (const r of results ?? []) {
      counts[r.source as string] = r.count as number;
    }
    return counts;
  }

  private toRecord(row: Record<string, unknown>): ExecutionEventRecord {
    return {
      id: row.id as string,
      taskId: row.task_id as string,
      tenantId: row.tenant_id as string,
      source: row.source as string,
      severity: row.severity as string,
      payload: row.payload ? JSON.parse(row.payload as string) : null,
      createdAt: row.created_at as string,
    };
  }
}
