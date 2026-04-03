/**
 * Sprint 115 F291: AgentCollectionService — 자동 수집 스케줄 + 실행 이력
 */

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface AgentSchedule {
  id: string;
  orgId: string;
  sources: string[];
  keywords: string[];
  intervalHours: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRun {
  id: string;
  orgId: string;
  scheduleId: string | null;
  source: string;
  status: string;
  itemsFound: number;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

export class AgentCollectionService {
  constructor(private db: D1Database) {}

  async createSchedule(
    orgId: string,
    data: { sources: string[]; keywords: string[]; intervalHours: number; enabled: boolean },
  ): Promise<AgentSchedule> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO agent_collection_schedules (id, org_id, sources, keywords, interval_hours, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, orgId, JSON.stringify(data.sources), JSON.stringify(data.keywords), data.intervalHours, data.enabled ? 1 : 0, now, now)
      .run();

    return {
      id,
      orgId,
      sources: data.sources,
      keywords: data.keywords,
      intervalHours: data.intervalHours,
      enabled: data.enabled,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getSchedule(orgId: string): Promise<AgentSchedule | null> {
    const row = await this.db
      .prepare(`SELECT * FROM agent_collection_schedules WHERE org_id = ? ORDER BY created_at DESC LIMIT 1`)
      .bind(orgId)
      .first<Record<string, unknown>>();

    if (!row) return null;

    return {
      id: String(row.id),
      orgId: String(row.org_id),
      sources: JSON.parse(String(row.sources)),
      keywords: JSON.parse(String(row.keywords)),
      intervalHours: Number(row.interval_hours),
      enabled: row.enabled === 1,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  async listRuns(orgId: string, opts?: { limit?: number; status?: string }): Promise<{ runs: AgentRun[]; total: number }> {
    const limit = opts?.limit ?? 20;

    let countQuery = `SELECT COUNT(*) as cnt FROM agent_collection_runs WHERE org_id = ?`;
    let query = `SELECT * FROM agent_collection_runs WHERE org_id = ?`;
    const binds: unknown[] = [orgId];

    if (opts?.status) {
      countQuery += ` AND status = ?`;
      query += ` AND status = ?`;
      binds.push(opts.status);
    }

    query += ` ORDER BY started_at DESC LIMIT ?`;

    const countRow = await this.db.prepare(countQuery).bind(...binds).first<{ cnt: number }>();
    const total = countRow?.cnt ?? 0;

    const { results } = await this.db.prepare(query).bind(...binds, limit).all<Record<string, unknown>>();

    const runs: AgentRun[] = results.map((r) => ({
      id: String(r.id),
      orgId: String(r.org_id),
      scheduleId: r.schedule_id ? String(r.schedule_id) : null,
      source: String(r.source),
      status: String(r.status),
      itemsFound: Number(r.items_found),
      error: r.error ? String(r.error) : null,
      startedAt: String(r.started_at),
      completedAt: r.completed_at ? String(r.completed_at) : null,
    }));

    return { runs, total };
  }

  async createRun(orgId: string, source: string, scheduleId?: string): Promise<AgentRun> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO agent_collection_runs (id, org_id, schedule_id, source, status, started_at)
         VALUES (?, ?, ?, ?, 'running', ?)`,
      )
      .bind(id, orgId, scheduleId ?? null, source, now)
      .run();

    return {
      id,
      orgId,
      scheduleId: scheduleId ?? null,
      source,
      status: "running",
      itemsFound: 0,
      error: null,
      startedAt: now,
      completedAt: null,
    };
  }

  async completeRun(runId: string, itemsFound: number): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(`UPDATE agent_collection_runs SET status = 'completed', items_found = ?, completed_at = ? WHERE id = ?`)
      .bind(itemsFound, now, runId)
      .run();
  }

  async failRun(runId: string, error: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(`UPDATE agent_collection_runs SET status = 'failed', error = ?, completed_at = ? WHERE id = ?`)
      .bind(error, now, runId)
      .run();
  }
}
