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

export interface KpiItem {
  id: string;
  evaluationId: string;
  name: string;
  category: string;
  target: number;
  actual: number | null;
  unit: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToEvaluation(row: Record<string, unknown>): Evaluation {
  return {
    id: row["id"] as string,
    orgId: row["org_id"] as string,
    ideaId: (row["idea_id"] as string) || null,
    bmcId: (row["bmc_id"] as string) || null,
    title: row["title"] as string,
    description: (row["description"] as string) || null,
    ownerId: row["owner_id"] as string,
    status: row["status"] as EvalStatus,
    decisionReason: (row["decision_reason"] as string) || null,
    createdAt: row["created_at"] as number,
    updatedAt: row["updated_at"] as number,
  };
}

function rowToHistory(row: Record<string, unknown>): EvalHistoryEntry {
  return {
    id: row["id"] as string,
    evalId: row["eval_id"] as string,
    actorId: row["actor_id"] as string,
    action: row["action"] as string,
    fromStatus: (row["from_status"] as string) || null,
    toStatus: (row["to_status"] as string) || null,
    reason: (row["reason"] as string) || null,
    createdAt: row["created_at"] as number,
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
      .bind(id, orgId, data.ideaId || null, data.bmcId || null, data.title, data.description || null, ownerId, now, now)
      .run();

    return { id, orgId, ideaId: data.ideaId || null, bmcId: data.bmcId || null, title: data.title, description: data.description || null, ownerId, status: "draft", decisionReason: null, createdAt: now, updatedAt: now };
  }

  async list(orgId: string, filters?: { status?: string; limit?: number; offset?: number }): Promise<{ items: Evaluation[]; total: number }> {
    const limit = filters?.limit ?? 20;
    const offset = filters?.offset ?? 0;
    const bindings: unknown[] = [orgId];
    let where = "org_id = ?";

    if (filters?.status) {
      where += " AND status = ?";
      bindings.push(filters.status);
    }

    const countRow = await this.db.prepare(`SELECT COUNT(*) as cnt FROM ax_evaluations WHERE ${where}`).bind(...bindings).first<{ cnt: number }>();
    const { results } = await this.db.prepare(`SELECT * FROM ax_evaluations WHERE ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all();

    return { items: (results as Record<string, unknown>[]).map(rowToEvaluation), total: countRow?.cnt ?? 0 };
  }

  async getById(evalId: string, orgId: string): Promise<Evaluation | null> {
    const row = await this.db.prepare("SELECT * FROM ax_evaluations WHERE id = ? AND org_id = ?").bind(evalId, orgId).first();
    return row ? rowToEvaluation(row as Record<string, unknown>) : null;
  }

  async updateStatus(evalId: string, orgId: string, actorId: string, newStatus: EvalStatus, reason?: string): Promise<Evaluation> {
    const current = await this.getById(evalId, orgId);
    if (!current) throw new Error("Evaluation not found");

    const allowed = VALID_TRANSITIONS[current.status];
    if (!allowed.includes(newStatus)) throw new Error(`Invalid status transition: ${current.status} → ${newStatus}`);

    const now = Date.now();
    await this.db.prepare("UPDATE ax_evaluations SET status = ?, decision_reason = ?, updated_at = ? WHERE id = ? AND org_id = ?").bind(newStatus, reason || null, now, evalId, orgId).run();

    const historyId = crypto.randomUUID();
    await this.db.prepare(`INSERT INTO ax_evaluation_history (id, eval_id, actor_id, action, from_status, to_status, reason, created_at) VALUES (?, ?, ?, 'status_change', ?, ?, ?, ?)`).bind(historyId, evalId, actorId, current.status, newStatus, reason || null, now).run();

    const updated = { ...current, status: newStatus, decisionReason: reason || null, updatedAt: now };

    // 결정(go/kill) 시 웹훅 dispatch — fire-and-forget
    if (newStatus === "go" || newStatus === "kill") {
      import("./webhook-service.js")
        .then(({ dispatch }) =>
          dispatch(
            "decision.made",
            orgId,
            { evaluationId: evalId, decision: newStatus, reason: reason ?? null },
            this.db,
          ),
        )
        .catch((e) => console.error("Webhook dispatch error:", e));
    }

    return updated;
  }

  async getHistory(evalId: string, orgId: string): Promise<EvalHistoryEntry[]> {
    const evalRow = await this.getById(evalId, orgId);
    if (!evalRow) return [];
    const { results } = await this.db.prepare("SELECT * FROM ax_evaluation_history WHERE eval_id = ? ORDER BY created_at DESC").bind(evalId).all();
    return (results as Record<string, unknown>[]).map(rowToHistory);
  }

  async getPortfolio(orgId: string): Promise<PortfolioSummary> {
    const { results: statusRows } = await this.db.prepare("SELECT status, COUNT(*) as cnt FROM ax_evaluations WHERE org_id = ? GROUP BY status").bind(orgId).all();
    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const row of statusRows as Array<Record<string, unknown>>) {
      const status = row["status"] as string;
      const cnt = row["cnt"] as number;
      byStatus[status] = cnt;
      total += cnt;
    }
    const { results: historyRows } = await this.db.prepare(`SELECT h.* FROM ax_evaluation_history h JOIN ax_evaluations e ON h.eval_id = e.id WHERE e.org_id = ? ORDER BY h.created_at DESC LIMIT 10`).bind(orgId).all();
    return { total, byStatus, recentChanges: (historyRows as Record<string, unknown>[]).map(rowToHistory) };
  }

  // KPI methods (gate-x 자체 구현 — KpiService portal 대체)
  async createKpi(evalId: string, data: { name: string; category: string; target: number; unit?: string }): Promise<KpiItem> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.prepare(`INSERT INTO ax_evaluation_kpis (id, evaluation_id, name, category, target, unit) VALUES (?, ?, ?, ?, ?, ?)`).bind(id, evalId, data.name, data.category, data.target, data.unit ?? null).run();
    return { id, evaluationId: evalId, name: data.name, category: data.category, target: data.target, actual: null, unit: data.unit ?? null, createdAt: now, updatedAt: now };
  }

  async listKpis(evalId: string): Promise<KpiItem[]> {
    const { results } = await this.db.prepare("SELECT * FROM ax_evaluation_kpis WHERE evaluation_id = ? ORDER BY created_at ASC").bind(evalId).all();
    return (results as Record<string, unknown>[]).map((r) => ({
      id: r["id"] as string,
      evaluationId: r["evaluation_id"] as string,
      name: r["name"] as string,
      category: r["category"] as string,
      target: r["target"] as number,
      actual: r["actual"] as number | null,
      unit: (r["unit"] as string) || null,
      createdAt: r["created_at"] as string,
      updatedAt: r["updated_at"] as string,
    }));
  }

  async updateKpi(kpiId: string, evalId: string, data: { actual?: number | null; target?: number }): Promise<KpiItem> {
    const sets: string[] = ["updated_at = datetime('now')"];
    const params: unknown[] = [];
    if (data.actual !== undefined) { sets.push("actual = ?"); params.push(data.actual); }
    if (data.target !== undefined) { sets.push("target = ?"); params.push(data.target); }
    params.push(kpiId, evalId);
    const res = await this.db.prepare(`UPDATE ax_evaluation_kpis SET ${sets.join(", ")} WHERE id = ? AND evaluation_id = ?`).bind(...params).run();
    if (!res.meta.changes) throw new Error("KPI not found");
    const row = await this.db.prepare("SELECT * FROM ax_evaluation_kpis WHERE id = ?").bind(kpiId).first<Record<string, unknown>>();
    if (!row) throw new Error("KPI not found");
    return { id: row["id"] as string, evaluationId: row["evaluation_id"] as string, name: row["name"] as string, category: row["category"] as string, target: row["target"] as number, actual: row["actual"] as number | null, unit: (row["unit"] as string) || null, createdAt: row["created_at"] as string, updatedAt: row["updated_at"] as string };
  }
}
