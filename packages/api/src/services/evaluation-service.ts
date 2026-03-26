export type EvalStatus = "draft" | "active" | "go" | "kill" | "hold";

const VALID_TRANSITIONS: Record<EvalStatus, EvalStatus[]> = {
  draft: ["active"],
  active: ["go", "kill", "hold"],
  go: ["active", "kill"],
  kill: ["active"],
  hold: ["active", "kill"],
};

export interface Evaluation {
  id: string;
  orgId: string;
  ideaId: string | null;
  bmcId: string | null;
  title: string;
  description: string | null;
  ownerId: string;
  status: EvalStatus;
  decisionReason: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface EvalHistoryEntry {
  id: string;
  evalId: string;
  actorId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  createdAt: number;
}

export interface PortfolioSummary {
  total: number;
  byStatus: Record<string, number>;
  recentChanges: EvalHistoryEntry[];
}

function rowToEvaluation(row: Record<string, unknown>): Evaluation {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    ideaId: (row.idea_id as string) || null,
    bmcId: (row.bmc_id as string) || null,
    title: row.title as string,
    description: (row.description as string) || null,
    ownerId: row.owner_id as string,
    status: row.status as EvalStatus,
    decisionReason: (row.decision_reason as string) || null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

function rowToHistory(row: Record<string, unknown>): EvalHistoryEntry {
  return {
    id: row.id as string,
    evalId: row.eval_id as string,
    actorId: row.actor_id as string,
    action: row.action as string,
    fromStatus: (row.from_status as string) || null,
    toStatus: (row.to_status as string) || null,
    reason: (row.reason as string) || null,
    createdAt: row.created_at as number,
  };
}

export class EvaluationService {
  constructor(private db: D1Database) {}

  async create(
    orgId: string,
    ownerId: string,
    data: { title: string; description?: string; ideaId?: string; bmcId?: string },
  ): Promise<Evaluation> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db
      .prepare(
        `INSERT INTO ax_evaluations (id, org_id, idea_id, bmc_id, title, description, owner_id, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
      )
      .bind(
        id,
        orgId,
        data.ideaId || null,
        data.bmcId || null,
        data.title,
        data.description || null,
        ownerId,
        now,
        now,
      )
      .run();

    return {
      id,
      orgId,
      ideaId: data.ideaId || null,
      bmcId: data.bmcId || null,
      title: data.title,
      description: data.description || null,
      ownerId,
      status: "draft",
      decisionReason: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async list(
    orgId: string,
    filters?: { status?: string; limit?: number; offset?: number },
  ): Promise<{ items: Evaluation[]; total: number }> {
    const limit = filters?.limit ?? 20;
    const offset = filters?.offset ?? 0;

    let countQuery = "SELECT COUNT(*) as cnt FROM ax_evaluations WHERE org_id = ?";
    let listQuery = "SELECT * FROM ax_evaluations WHERE org_id = ?";
    const bindings: unknown[] = [orgId];

    if (filters?.status) {
      countQuery += " AND status = ?";
      listQuery += " AND status = ?";
      bindings.push(filters.status);
    }

    listQuery += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";

    const countRow = await this.db
      .prepare(countQuery)
      .bind(...bindings)
      .first<{ cnt: number }>();
    const total = countRow?.cnt ?? 0;

    const { results } = await this.db
      .prepare(listQuery)
      .bind(...bindings, limit, offset)
      .all();

    return {
      items: (results as Record<string, unknown>[]).map(rowToEvaluation),
      total,
    };
  }

  async getById(evalId: string, orgId: string): Promise<Evaluation | null> {
    const row = await this.db
      .prepare("SELECT * FROM ax_evaluations WHERE id = ? AND org_id = ?")
      .bind(evalId, orgId)
      .first();

    if (!row) return null;
    return rowToEvaluation(row as Record<string, unknown>);
  }

  async updateStatus(
    evalId: string,
    orgId: string,
    actorId: string,
    newStatus: EvalStatus,
    reason?: string,
  ): Promise<Evaluation> {
    const current = await this.getById(evalId, orgId);
    if (!current) {
      throw new Error("Evaluation not found");
    }

    const allowed = VALID_TRANSITIONS[current.status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(
        `Invalid status transition: ${current.status} → ${newStatus}`,
      );
    }

    const now = Date.now();

    await this.db
      .prepare(
        "UPDATE ax_evaluations SET status = ?, decision_reason = ?, updated_at = ? WHERE id = ? AND org_id = ?",
      )
      .bind(newStatus, reason || null, now, evalId, orgId)
      .run();

    const historyId = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO ax_evaluation_history (id, eval_id, actor_id, action, from_status, to_status, reason, created_at)
         VALUES (?, ?, ?, 'status_change', ?, ?, ?, ?)`,
      )
      .bind(historyId, evalId, actorId, current.status, newStatus, reason || null, now)
      .run();

    return {
      ...current,
      status: newStatus,
      decisionReason: reason || null,
      updatedAt: now,
    };
  }

  async getHistory(evalId: string, orgId: string): Promise<EvalHistoryEntry[]> {
    // Verify eval belongs to org
    const evalRow = await this.getById(evalId, orgId);
    if (!evalRow) return [];

    const { results } = await this.db
      .prepare(
        "SELECT * FROM ax_evaluation_history WHERE eval_id = ? ORDER BY created_at DESC",
      )
      .bind(evalId)
      .all();

    return (results as Record<string, unknown>[]).map(rowToHistory);
  }

  async getPortfolio(orgId: string): Promise<PortfolioSummary> {
    const { results: statusRows } = await this.db
      .prepare(
        "SELECT status, COUNT(*) as cnt FROM ax_evaluations WHERE org_id = ? GROUP BY status",
      )
      .bind(orgId)
      .all();

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const row of statusRows as Array<Record<string, unknown>>) {
      const status = row.status as string;
      const cnt = row.cnt as number;
      byStatus[status] = cnt;
      total += cnt;
    }

    const { results: historyRows } = await this.db
      .prepare(
        `SELECT h.* FROM ax_evaluation_history h
         JOIN ax_evaluations e ON h.eval_id = e.id
         WHERE e.org_id = ?
         ORDER BY h.created_at DESC LIMIT 10`,
      )
      .bind(orgId)
      .all();

    return {
      total,
      byStatus,
      recentChanges: (historyRows as Record<string, unknown>[]).map(rowToHistory),
    };
  }
}
