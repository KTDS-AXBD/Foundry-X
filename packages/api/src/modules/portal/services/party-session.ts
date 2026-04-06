/**
 * PartySessionService — F226: Party Mode (다중 에이전트 세션)
 */

export interface PartySessionRow {
  id: string;
  org_id: string;
  topic: string;
  mode: string;
  status: string;
  max_participants: number;
  created_by: string;
  summary: string | null;
  created_at: string;
  concluded_at: string | null;
}

export interface PartyParticipantRow {
  session_id: string;
  agent_role: string;
  joined_at: string;
}

export interface PartyMessageRow {
  id: string;
  session_id: string;
  agent_role: string;
  content: string;
  message_type: string;
  reply_to: string | null;
  created_at: string;
}

type PartyMode = "free-form" | "round-robin" | "moderated";
type PartyStatus = "active" | "concluded" | "cancelled";
type MessageType = "opinion" | "question" | "answer" | "summary";

function toSession(row: PartySessionRow) {
  return {
    id: row.id,
    orgId: row.org_id,
    topic: row.topic,
    mode: row.mode as PartyMode,
    status: row.status as PartyStatus,
    maxParticipants: row.max_participants,
    createdBy: row.created_by,
    summary: row.summary,
    createdAt: row.created_at,
    concludedAt: row.concluded_at,
  };
}

function toMessage(row: PartyMessageRow) {
  return {
    id: row.id,
    sessionId: row.session_id,
    agentRole: row.agent_role,
    content: row.content,
    messageType: row.message_type as MessageType,
    replyTo: row.reply_to,
    createdAt: row.created_at,
  };
}

function toParticipant(row: PartyParticipantRow) {
  return {
    sessionId: row.session_id,
    agentRole: row.agent_role,
    joinedAt: row.joined_at,
  };
}

export class PartySessionService {
  constructor(private db: D1Database) {}

  async createSession(
    orgId: string,
    createdBy: string,
    data: { topic: string; mode?: string; maxParticipants?: number },
  ) {
    const id = `party-${crypto.randomUUID()}`;
    const mode = data.mode ?? "free-form";
    const maxParticipants = data.maxParticipants ?? 10;

    await this.db
      .prepare(
        "INSERT INTO party_sessions (id, org_id, topic, mode, max_participants, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(id, orgId, data.topic, mode, maxParticipants, createdBy)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM party_sessions WHERE id = ?")
      .bind(id)
      .first<PartySessionRow>();

    return toSession(row!);
  }

  async joinSession(sessionId: string, agentRole: string) {
    await this.db
      .prepare("INSERT INTO party_participants (session_id, agent_role) VALUES (?, ?)")
      .bind(sessionId, agentRole)
      .run();

    return { sessionId, agentRole };
  }

  async addMessage(
    sessionId: string,
    data: { agentRole: string; content: string; messageType?: string; replyTo?: string },
  ) {
    const id = `msg-${crypto.randomUUID()}`;
    const messageType = data.messageType ?? "opinion";

    await this.db
      .prepare(
        "INSERT INTO party_messages (id, session_id, agent_role, content, message_type, reply_to) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(id, sessionId, data.agentRole, data.content, messageType, data.replyTo ?? null)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM party_messages WHERE id = ?")
      .bind(id)
      .first<PartyMessageRow>();

    return toMessage(row!);
  }

  async concludeSession(sessionId: string, summary: string) {
    await this.db
      .prepare(
        "UPDATE party_sessions SET status = 'concluded', summary = ?, concluded_at = datetime('now') WHERE id = ?",
      )
      .bind(summary, sessionId)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM party_sessions WHERE id = ?")
      .bind(sessionId)
      .first<PartySessionRow>();

    return toSession(row!);
  }

  async getSession(id: string) {
    const row = await this.db
      .prepare("SELECT * FROM party_sessions WHERE id = ?")
      .bind(id)
      .first<PartySessionRow>();

    return row ? toSession(row) : null;
  }

  async listMessages(sessionId: string) {
    const { results } = await this.db
      .prepare("SELECT * FROM party_messages WHERE session_id = ? ORDER BY created_at")
      .bind(sessionId)
      .all<PartyMessageRow>();

    return (results ?? []).map(toMessage);
  }

  async listParticipants(sessionId: string) {
    const { results } = await this.db
      .prepare("SELECT * FROM party_participants WHERE session_id = ?")
      .bind(sessionId)
      .all<PartyParticipantRow>();

    return (results ?? []).map(toParticipant);
  }

  async listSessions(orgId: string, status?: string) {
    if (status) {
      const { results } = await this.db
        .prepare("SELECT * FROM party_sessions WHERE org_id = ? AND status = ? ORDER BY created_at DESC")
        .bind(orgId, status)
        .all<PartySessionRow>();
      return (results ?? []).map(toSession);
    }

    const { results } = await this.db
      .prepare("SELECT * FROM party_sessions WHERE org_id = ? ORDER BY created_at DESC")
      .bind(orgId)
      .all<PartySessionRow>();

    return (results ?? []).map(toSession);
  }
}
