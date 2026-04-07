// ─── F334: ExecutionEventService — D1 execution_events CRUD (Sprint 149) ───

import type { TaskEvent } from "@foundry-x/shared";

export interface ExecutionEventRecord {
  id: string;
  taskId: string;
  tenantId: string;
  source: string;
  severity: string;
  payload: string;
  createdAt: string;
}

export class ExecutionEventService {
  constructor(private db: D1Database) {}

  /** TaskEvent를 D1에 기록 */
  async record(event: TaskEvent): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO execution_events (id, task_id, tenant_id, source, severity, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        event.id,
        event.taskId,
        event.tenantId,
        event.source,
        event.severity,
        JSON.stringify(event.payload),
        event.timestamp,
      )
      .run();
  }

  /** 태스크별 이벤트 이력 조회 */
  async listByTask(
    taskId: string,
    tenantId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ items: ExecutionEventRecord[]; total: number }> {
    const countRow = await this.db
      .prepare(
        "SELECT COUNT(*) as total FROM execution_events WHERE task_id = ? AND tenant_id = ?",
      )
      .bind(taskId, tenantId)
      .first<{ total: number }>();

    const { results } = await this.db
      .prepare(
        `SELECT * FROM execution_events WHERE task_id = ? AND tenant_id = ?
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(taskId, tenantId, limit, offset)
      .all();

    return {
      items: (results ?? []).map((r) => this.toRecord(r)),
      total: countRow?.total ?? 0,
    };
  }

  /** 소스별 이벤트 이력 조회 */
  async listBySource(
    tenantId: string,
    source: string,
    limit = 20,
    offset = 0,
  ): Promise<{ items: ExecutionEventRecord[]; total: number }> {
    const countRow = await this.db
      .prepare(
        "SELECT COUNT(*) as total FROM execution_events WHERE tenant_id = ? AND source = ?",
      )
      .bind(tenantId, source)
      .first<{ total: number }>();

    const { results } = await this.db
      .prepare(
        `SELECT * FROM execution_events WHERE tenant_id = ? AND source = ?
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(tenantId, source, limit, offset)
      .all();

    return {
      items: (results ?? []).map((r) => this.toRecord(r)),
      total: countRow?.total ?? 0,
    };
  }

  private toRecord(row: Record<string, unknown>): ExecutionEventRecord {
    return {
      id: row.id as string,
      taskId: row.task_id as string,
      tenantId: row.tenant_id as string,
      source: row.source as string,
      severity: row.severity as string,
      payload: row.payload as string,
      createdAt: row.created_at as string,
    };
  }
}
