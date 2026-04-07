// ─── F398: D1EventBus — D1 기반 이벤트 발행 + 폴링 PoC (Sprint 185) ───

import type { DomainEventEnvelope, DomainEventType } from './catalog.js';

export type D1LikeDatabase = {
  prepare(query: string): {
    bind(...args: unknown[]): {
      run(): Promise<{ success: boolean }>;
      all<T>(): Promise<{ results: T[] }>;
    };
  };
};

export type EventHandler = (event: DomainEventEnvelope) => Promise<void>;

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
        `SELECT id, type, source, tenant_id, payload, metadata, created_at
         FROM domain_events
         WHERE status = 'pending'
         ORDER BY created_at
         LIMIT 50`,
      )
      .bind()
      .all<{
        id: string; type: string; source: string;
        tenant_id: string; payload: string;
        metadata: string | null; created_at: string;
      }>();

    let processed = 0;
    for (const row of results) {
      const event: DomainEventEnvelope = {
        id: row.id,
        type: row.type as DomainEventType,
        source: row.source as DomainEventEnvelope['source'],
        timestamp: row.created_at,
        payload: JSON.parse(row.payload),
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      };

      try {
        await this._dispatch(event);
        await this._ack(row.id, 'processed');
        processed++;
      } catch {
        await this._ack(row.id, 'failed');
      }
    }
    return processed;
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
}
