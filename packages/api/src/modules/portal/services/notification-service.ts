/**
 * NotificationService — 인앱 알림 생성/조회/읽음 처리 (F233)
 */
import type { NotificationType } from "../schemas/notification.schema.js";

export interface Notification {
  id: string;
  orgId: string;
  recipientId: string;
  type: NotificationType;
  bizItemId: string | null;
  title: string;
  body: string | null;
  actorId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface CreateNotificationInput {
  orgId: string;
  recipientId: string;
  type: NotificationType;
  bizItemId?: string;
  title: string;
  body?: string;
  actorId?: string;
}

export class NotificationService {
  constructor(private db: D1Database) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    const id = crypto.randomUUID();

    await this.db
      .prepare(
        `INSERT INTO notifications (id, org_id, recipient_id, type, biz_item_id, title, body, actor_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, input.orgId, input.recipientId, input.type, input.bizItemId ?? null, input.title, input.body ?? null, input.actorId ?? null)
      .run();

    return {
      id,
      orgId: input.orgId,
      recipientId: input.recipientId,
      type: input.type,
      bizItemId: input.bizItemId ?? null,
      title: input.title,
      body: input.body ?? null,
      actorId: input.actorId ?? null,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  async createBatch(inputs: CreateNotificationInput[]): Promise<void> {
    for (const input of inputs) {
      await this.create(input);
    }
  }

  async listByRecipient(
    recipientId: string,
    orgId: string,
    opts?: { unreadOnly?: boolean; limit?: number; offset?: number },
  ): Promise<Notification[]> {
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    let query = `SELECT id, org_id, recipient_id, type, biz_item_id, title, body, actor_id, read_at, created_at
                 FROM notifications WHERE recipient_id = ? AND org_id = ?`;
    const binds: unknown[] = [recipientId, orgId];

    if (opts?.unreadOnly) {
      query += " AND read_at IS NULL";
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    binds.push(limit, offset);

    const { results } = await this.db.prepare(query).bind(...binds).all<Record<string, unknown>>();

    return results.map((r) => this.mapRow(r));
  }

  async markAsRead(id: string, recipientId: string): Promise<boolean> {
    const result = await this.db
      .prepare(`UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND recipient_id = ? AND read_at IS NULL`)
      .bind(id, recipientId)
      .run();

    return (result.meta?.changes ?? 0) > 0;
  }

  async countUnread(recipientId: string, orgId: string): Promise<number> {
    const row = await this.db
      .prepare(`SELECT COUNT(*) as cnt FROM notifications WHERE recipient_id = ? AND org_id = ? AND read_at IS NULL`)
      .bind(recipientId, orgId)
      .first<Record<string, unknown>>();

    return Number(row?.cnt ?? 0);
  }

  private mapRow(r: Record<string, unknown>): Notification {
    return {
      id: r.id as string,
      orgId: r.org_id as string,
      recipientId: r.recipient_id as string,
      type: r.type as NotificationType,
      bizItemId: r.biz_item_id as string | null,
      title: r.title as string,
      body: r.body as string | null,
      actorId: r.actor_id as string | null,
      readAt: r.read_at as string | null,
      createdAt: r.created_at as string,
    };
  }
}
