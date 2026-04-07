// ─── F398+F406: D1EventBus — D1 기반 이벤트 발행 + 폴링 + 유실 복구 ───

import type { DomainEventEnvelope, DomainEventType } from './catalog.js';

export type D1LikeDatabase = {
  prepare(query: string): {
    bind(...args: unknown[]): {
      run(): Promise<{ success: boolean }>;
      all<T>(): Promise<{ results: T[] }>;
      first<T>(): Promise<T | null>;
    };
  };
};

export type EventHandler = (event: DomainEventEnvelope) => Promise<void>;

export type EventStatusSummary = {
  pending: number;
  failed: number;
  dead_letter: number;
  processed_last_hour: number;
};

type DomainEventRow = {
  id: string;
  type: string;
  source: string;
  tenant_id: string;
  payload: string;
  metadata: string | null;
  created_at: string;
  retry_count: number;
};

const MAX_RETRIES = 3;

/** 지수 백오프: 2^n 분 (n=retry_count, max 30분) */
function nextRetryAt(retryCount: number): string {
  const delayMs = Math.min(Math.pow(2, retryCount) * 60_000, 30 * 60_000);
  return new Date(Date.now() + delayMs).toISOString();
}

export class D1EventBus {
  private handlers: Map<DomainEventType | '*', Set<EventHandler>> = new Map();

  constructor(private readonly db: D1LikeDatabase) {}

  async publish(event: DomainEventEnvelope, tenantId: string): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO domain_events
         (id, type, source, tenant_id, payload, metadata, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .bind(
        event.id,
        event.type,
        event.source,
        tenantId,
        JSON.stringify(event.payload),
        event.metadata ? JSON.stringify(event.metadata) : null,
        event.timestamp,
      )
      .run();
  }

  subscribe(type: DomainEventType | '*', handler: EventHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  async poll(): Promise<number> {
    const { results } = await this.db
      .prepare(
        `SELECT id, type, source, tenant_id, payload, metadata, created_at, retry_count
         FROM domain_events
         WHERE status = 'pending'
         ORDER BY created_at
         LIMIT 50`,
      )
      .bind()
      .all<DomainEventRow>();

    let processed = 0;
    for (const row of results) {
      const event = this._rowToEnvelope(row);
      try {
        await this._dispatch(event);
        await this._ack(row.id, 'processed');
        processed++;
      } catch (err) {
        const newCount = (row.retry_count ?? 0) + 1;
        if (newCount >= MAX_RETRIES) {
          await this._moveToDLQ(row.id, String(err));
        } else {
          await this._markFailed(row.id, newCount, String(err));
        }
      }
    }
    return processed;
  }

  /** 실패 이벤트 재시도 — next_retry_at 도달한 이벤트만 처리 */
  async retry(maxRetries = MAX_RETRIES): Promise<number> {
    const now = new Date().toISOString();
    const { results } = await this.db
      .prepare(
        `SELECT id, type, source, tenant_id, payload, metadata, created_at, retry_count
         FROM domain_events
         WHERE status = 'failed'
           AND retry_count < ?
           AND (next_retry_at IS NULL OR next_retry_at <= ?)
         ORDER BY created_at
         LIMIT 20`,
      )
      .bind(maxRetries, now)
      .all<DomainEventRow>();

    let retried = 0;
    for (const row of results) {
      const event = this._rowToEnvelope(row);
      try {
        await this._dispatch(event);
        await this._ack(row.id, 'processed');
        retried++;
      } catch (err) {
        const newCount = (row.retry_count ?? 0) + 1;
        if (newCount >= maxRetries) {
          await this._moveToDLQ(row.id, String(err));
        } else {
          await this._markFailed(row.id, newCount, String(err));
        }
      }
    }
    return retried;
  }

  /** Dead-Letter Queue 조회 */
  async getDLQ(limit = 20): Promise<DomainEventRow[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, type, source, tenant_id, payload, metadata, created_at, retry_count
         FROM domain_events
         WHERE status = 'dead_letter'
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .bind(limit)
      .all<DomainEventRow>();
    return results;
  }

  /** DLQ 이벤트 수동 재처리 (dead_letter → pending) */
  async reprocess(id: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE domain_events
         SET status = 'pending', retry_count = 0, last_error = NULL, next_retry_at = NULL, processed_at = NULL
         WHERE id = ? AND status = 'dead_letter'`,
      )
      .bind(id)
      .run();
  }

  /** 이벤트 상태 통계 */
  async getStatus(): Promise<EventStatusSummary> {
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();

    const pending = await this._countByStatus('pending');
    const failed = await this._countByStatus('failed');
    const dead_letter = await this._countByStatus('dead_letter');

    const processed = await this.db
      .prepare(
        `SELECT COUNT(*) as cnt FROM domain_events
         WHERE status = 'processed' AND processed_at >= ?`,
      )
      .bind(oneHourAgo)
      .first<{ cnt: number }>();

    return {
      pending,
      failed,
      dead_letter,
      processed_last_hour: processed?.cnt ?? 0,
    };
  }

  private async _countByStatus(status: string): Promise<number> {
    const row = await this.db
      .prepare(`SELECT COUNT(*) as cnt FROM domain_events WHERE status = ?`)
      .bind(status)
      .first<{ cnt: number }>();
    return row?.cnt ?? 0;
  }

  private _rowToEnvelope(row: DomainEventRow): DomainEventEnvelope {
    return {
      id: row.id,
      type: row.type as DomainEventType,
      source: row.source as DomainEventEnvelope['source'],
      timestamp: row.created_at,
      payload: JSON.parse(row.payload),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  private async _dispatch(event: DomainEventEnvelope): Promise<void> {
    const typeHandlers = this.handlers.get(event.type) ?? new Set();
    const wildcardHandlers = this.handlers.get('*') ?? new Set();
    await Promise.all([...typeHandlers, ...wildcardHandlers].map((h) => h(event)));
  }

  private async _ack(id: string, status: 'processed' | 'failed'): Promise<void> {
    await this.db
      .prepare(`UPDATE domain_events SET status = ?, processed_at = ? WHERE id = ?`)
      .bind(status, new Date().toISOString(), id)
      .run();
  }

  private async _markFailed(id: string, retryCount: number, error: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE domain_events
         SET status = 'failed', retry_count = ?, last_error = ?, next_retry_at = ?
         WHERE id = ?`,
      )
      .bind(retryCount, error.slice(0, 500), nextRetryAt(retryCount), id)
      .run();
  }

  private async _moveToDLQ(id: string, error: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE domain_events
         SET status = 'dead_letter', last_error = ?, processed_at = ?
         WHERE id = ?`,
      )
      .bind(error.slice(0, 500), new Date().toISOString(), id)
      .run();
  }
}
