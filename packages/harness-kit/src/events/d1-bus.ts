// ─── F399: harness-kit D1EventBus — D1 기반 이벤트 발행/폴링 (Sprint 186) ───
// @foundry-x/shared 미의존 독립 구현 (ADR-002: standalone npm 패키지 호환성)

import type { DomainEvent, EventType } from "./types.js";
import type { EventBus } from "./bus.js";

export type D1LikeDatabase = {
  prepare(query: string): {
    bind(...args: unknown[]): {
      run(): Promise<{ success: boolean }>;
      all<T>(): Promise<{ results: T[] }>;
    };
  };
};

type EventHandler = (event: DomainEvent) => Promise<void>;

/** D1 domain_events 테이블 기반 EventBus 구현 (migration: 0114_domain_events.sql) */
export class D1EventBus implements EventBus {
  private handlers: Map<EventType | "*", Set<EventHandler>> = new Map();

  constructor(private readonly db: D1LikeDatabase) {}

  async publish(event: DomainEvent, tenantId = "default"): Promise<void> {
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

  async publishBatch(events: DomainEvent[], tenantId = "default"): Promise<void> {
    await Promise.all(events.map((e) => this.publish(e, tenantId)));
  }

  subscribe(type: EventType | "*", handler: EventHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  /**
   * 미처리(pending) 이벤트를 가져와 등록된 핸들러에 dispatch한다.
   * Cron Trigger 또는 수동 폴링에서 호출.
   * @param limit 한 번에 처리할 최대 이벤트 수 (기본값: 50)
   * @returns 처리 완료된 이벤트 수
   */
  async poll(limit = 50): Promise<number> {
    const { results } = await this.db
      .prepare(
        `SELECT id, type, source, payload, metadata, created_at
         FROM domain_events
         WHERE status = 'pending'
         ORDER BY created_at
         LIMIT ?`,
      )
      .bind(limit)
      .all<{
        id: string;
        type: string;
        source: string;
        payload: string;
        metadata: string | null;
        created_at: string;
      }>();

    let processed = 0;
    for (const row of results) {
      const event: DomainEvent = {
        id: row.id,
        type: row.type as EventType,
        source: row.source as DomainEvent["source"],
        timestamp: row.created_at,
        payload: JSON.parse(row.payload) as unknown,
        metadata: row.metadata ? (JSON.parse(row.metadata) as DomainEvent["metadata"]) : undefined,
      };

      try {
        await this._dispatch(event);
        await this._ack(row.id, "processed");
        processed++;
      } catch {
        await this._ack(row.id, "failed");
      }
    }
    return processed;
  }

  private async _dispatch(event: DomainEvent): Promise<void> {
    const typeHandlers = this.handlers.get(event.type) ?? new Set();
    const wildcardHandlers = this.handlers.get("*") ?? new Set();
    await Promise.all([...typeHandlers, ...wildcardHandlers].map((h) => h(event)));
  }

  private async _ack(id: string, status: "processed" | "failed"): Promise<void> {
    await this.db
      .prepare(`UPDATE domain_events SET status = ?, processed_at = ? WHERE id = ?`)
      .bind(status, new Date().toISOString(), id)
      .run();
  }
}
