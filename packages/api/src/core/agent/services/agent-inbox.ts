import type { AgentMessage, MessageType } from "@foundry-x/shared";
import type { SSEManager } from "../../../core/infra/types.js";

interface AgentInboxDeps {
  db: D1Database;
  sse?: SSEManager;
}

interface MessageRow {
  id: string;
  from_agent_id: string;
  to_agent_id: string;
  type: string;
  subject: string;
  payload: string;
  acknowledged: number;
  parent_message_id: string | null;
  created_at: string;
  acknowledged_at: string | null;
}

function mapRow(r: MessageRow): AgentMessage {
  return {
    id: r.id,
    fromAgentId: r.from_agent_id,
    toAgentId: r.to_agent_id,
    type: r.type as MessageType,
    subject: r.subject,
    payload: JSON.parse(r.payload),
    acknowledged: r.acknowledged === 1,
    parentMessageId: r.parent_message_id ?? undefined,
    createdAt: r.created_at,
    acknowledgedAt: r.acknowledged_at ?? undefined,
  };
}

export class AgentInbox {
  constructor(private deps: AgentInboxDeps) {}

  async send(
    fromAgentId: string,
    toAgentId: string,
    type: MessageType,
    subject: string,
    payload: Record<string, unknown>,
    parentMessageId?: string,
  ): Promise<AgentMessage> {
    const id = `msg-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    await this.deps.db
      .prepare(
        `INSERT INTO agent_messages
         (id, from_agent_id, to_agent_id, type, subject, payload,
          acknowledged, parent_message_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      )
      .bind(
        id, fromAgentId, toAgentId, type, subject,
        JSON.stringify(payload), parentMessageId ?? null, now,
      )
      .run();

    this.deps.sse?.pushEvent({
      event: "agent.message.received",
      data: { messageId: id, fromAgentId, toAgentId, type, subject },
    });

    if (parentMessageId) {
      this.deps.sse?.pushEvent({
        event: "agent.message.thread_reply",
        data: { messageId: id, parentMessageId, fromAgentId, toAgentId, subject },
      });
    }

    return {
      id, fromAgentId, toAgentId, type, subject, payload,
      acknowledged: false, parentMessageId, createdAt: now,
    };
  }

  async list(
    agentId: string,
    options?: { unreadOnly?: boolean; limit?: number },
  ): Promise<AgentMessage[]> {
    const limit = options?.limit ?? 50;
    let query = "SELECT * FROM agent_messages WHERE to_agent_id = ?";
    const bindings: unknown[] = [agentId];

    if (options?.unreadOnly) {
      query += " AND acknowledged = 0";
    }

    query += " ORDER BY acknowledged ASC, created_at DESC LIMIT ?";
    bindings.push(limit);

    const { results } = await this.deps.db
      .prepare(query)
      .bind(...bindings)
      .all<MessageRow>();

    return results.map(mapRow);
  }

  async ack(messageId: string): Promise<boolean> {
    const result = await this.deps.db
      .prepare(
        `UPDATE agent_messages
         SET acknowledged = 1, acknowledged_at = ?
         WHERE id = ? AND acknowledged = 0`,
      )
      .bind(new Date().toISOString(), messageId)
      .run();

    return (result.meta?.changes ?? 0) > 0;
  }

  async getThread(parentMessageId: string): Promise<AgentMessage[]> {
    const { results } = await this.deps.db
      .prepare(
        `SELECT * FROM agent_messages
         WHERE parent_message_id = ? OR id = ?
         ORDER BY created_at ASC`,
      )
      .bind(parentMessageId, parentMessageId)
      .all<MessageRow>();

    return results.map(mapRow);
  }

  async ackThread(parentMessageId: string): Promise<number> {
    const result = await this.deps.db
      .prepare(
        `UPDATE agent_messages
         SET acknowledged = 1, acknowledged_at = ?
         WHERE (parent_message_id = ? OR id = ?) AND acknowledged = 0`,
      )
      .bind(new Date().toISOString(), parentMessageId, parentMessageId)
      .run();

    return result.meta?.changes ?? 0;
  }
}
