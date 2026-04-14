/**
 * F535: GraphSessionService — graph_sessions D1 CRUD
 * Sprint 288: Graph 실행 정식 API
 */

export interface GraphSession {
  id: string;
  bizItemId: string;
  orgId: string;
  status: "running" | "completed" | "failed";
  discoveryType: string | null;
  startedAt: string;
  completedAt: string | null;
  errorMsg: string | null;
}

interface GraphSessionRow {
  id: string;
  biz_item_id: string;
  org_id: string;
  status: string;
  discovery_type: string | null;
  started_at: string;
  completed_at: string | null;
  error_msg: string | null;
}

function toGraphSession(row: GraphSessionRow): GraphSession {
  return {
    id: row.id,
    bizItemId: row.biz_item_id,
    orgId: row.org_id,
    status: row.status as GraphSession["status"],
    discoveryType: row.discovery_type,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorMsg: row.error_msg,
  };
}

export class GraphSessionService {
  constructor(private db: D1Database) {}

  async createSession(
    bizItemId: string,
    orgId: string,
    sessionId: string,
    discoveryType?: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO graph_sessions (id, biz_item_id, org_id, status, discovery_type, started_at)
         VALUES (?, ?, ?, 'running', ?, ?)`,
      )
      .bind(sessionId, bizItemId, orgId, discoveryType ?? null, now)
      .run();
  }

  async updateStatus(
    sessionId: string,
    status: "completed" | "failed",
    errorMsg?: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    if (status === "completed") {
      await this.db
        .prepare(
          `UPDATE graph_sessions SET status = 'completed', completed_at = ? WHERE id = ?`,
        )
        .bind(now, sessionId)
        .run();
    } else {
      await this.db
        .prepare(
          `UPDATE graph_sessions SET status = 'failed', completed_at = ?, error_msg = ? WHERE id = ?`,
        )
        .bind(now, errorMsg ?? null, sessionId)
        .run();
    }
  }

  async listSessions(bizItemId: string, orgId: string): Promise<GraphSession[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM graph_sessions WHERE biz_item_id = ? AND org_id = ? ORDER BY started_at DESC, ROWID DESC`,
      )
      .bind(bizItemId, orgId)
      .all<GraphSessionRow>();
    return (result.results ?? []).map(toGraphSession);
  }

  async getLatest(bizItemId: string, orgId: string): Promise<GraphSession | null> {
    const row = await this.db
      .prepare(
        `SELECT * FROM graph_sessions WHERE biz_item_id = ? AND org_id = ? ORDER BY started_at DESC, ROWID DESC LIMIT 1`,
      )
      .bind(bizItemId, orgId)
      .first<GraphSessionRow>();
    return row ? toGraphSession(row) : null;
  }
}
