/**
 * NotificationService — shared at Worker level
 * Used by gate/launch domains without cross-domain imports
 */

type NotificationType =
  | "stage_change" | "review_request" | "decision_made" | "share_created"
  | "comment_added" | "pipeline_checkpoint_pending" | "pipeline_step_failed"
  | "pipeline_completed" | "pipeline_aborted";

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
      id, orgId: input.orgId, recipientId: input.recipientId, type: input.type,
      bizItemId: input.bizItemId ?? null, title: input.title, body: input.body ?? null,
      actorId: input.actorId ?? null, readAt: null, createdAt: new Date().toISOString(),
    };
  }

  async createBatch(inputs: CreateNotificationInput[]): Promise<void> {
    for (const input of inputs) await this.create(input);
  }
}
