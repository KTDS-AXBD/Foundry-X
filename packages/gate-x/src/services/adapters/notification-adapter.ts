/**
 * NotificationAdapter — NotificationService (portal 모듈) 대체
 * D1에 직접 domain_events 레코드 삽입 (biz-item.updated 이벤트 타입 사용)
 */

export interface NotifyParams {
  orgId: string;
  recipientId: string;
  type: string;
  bizItemId: string;
  title: string;
  body: string;
  actorId: string;
}

export class NotificationAdapter {
  constructor(private db: D1Database) {}

  async notify(params: NotifyParams): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO domain_events (id, type, payload, source, processed, created_at) VALUES (?, ?, ?, ?, 0, ?)`,
      )
      .bind(id, "biz-item.updated", JSON.stringify(params), "gate-x", now)
      .run();
  }
}
