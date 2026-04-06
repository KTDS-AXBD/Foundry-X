/**
 * PocService — PoC 프로젝트 관리 + KPI 측정 (F298)
 */
import type { PocStatus } from "../schemas/poc.schema.js";

export interface PocProject {
  id: string;
  orgId: string;
  bizItemId: string | null;
  title: string;
  description: string | null;
  status: PocStatus;
  framework: string | null;
  startDate: string | null;
  endDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PocKpi {
  id: string;
  orgId: string;
  pocId: string;
  metricName: string;
  targetValue: number | null;
  actualValue: number | null;
  unit: string;
  measuredAt: string;
  createdAt: string;
}

export interface CreatePocInput {
  orgId: string;
  bizItemId?: string;
  title: string;
  description?: string;
  framework?: string;
  startDate?: string;
  endDate?: string;
  createdBy: string;
}

export interface UpdatePocInput {
  title?: string;
  description?: string;
  status?: PocStatus;
  framework?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateKpiInput {
  orgId: string;
  metricName: string;
  targetValue?: number;
  actualValue?: number;
  unit: string;
}

export class PocService {
  constructor(private db: D1Database) {}

  async create(input: CreatePocInput): Promise<PocProject> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO poc_projects (id, org_id, biz_item_id, title, description, status, framework, start_date, end_date, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'planning', ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.orgId,
        input.bizItemId ?? null,
        input.title,
        input.description ?? null,
        input.framework ?? null,
        input.startDate ?? null,
        input.endDate ?? null,
        input.createdBy,
        now,
        now,
      )
      .run();

    return {
      id,
      orgId: input.orgId,
      bizItemId: input.bizItemId ?? null,
      title: input.title,
      description: input.description ?? null,
      status: "planning",
      framework: input.framework ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
  }

  async list(orgId: string, opts?: { status?: PocStatus; limit?: number; offset?: number }): Promise<PocProject[]> {
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;

    let query = `SELECT id, org_id, biz_item_id, title, description, status, framework, start_date, end_date, created_by, created_at, updated_at
                 FROM poc_projects WHERE org_id = ?`;
    const binds: unknown[] = [orgId];

    if (opts?.status) {
      query += ` AND status = ?`;
      binds.push(opts.status);
    }

    query += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
    binds.push(limit, offset);

    const { results } = await this.db
      .prepare(query)
      .bind(...binds)
      .all<Record<string, unknown>>();

    return results.map((r) => this.mapRow(r));
  }

  async getById(id: string, orgId: string): Promise<PocProject | null> {
    const row = await this.db
      .prepare(
        `SELECT id, org_id, biz_item_id, title, description, status, framework, start_date, end_date, created_by, created_at, updated_at
         FROM poc_projects WHERE id = ? AND org_id = ?`,
      )
      .bind(id, orgId)
      .first<Record<string, unknown>>();

    return row ? this.mapRow(row) : null;
  }

  async update(id: string, orgId: string, input: UpdatePocInput): Promise<PocProject> {
    const current = await this.getById(id, orgId);
    if (!current) throw new Error("PoC not found");

    const sets: string[] = [];
    const binds: unknown[] = [];

    if (input.title !== undefined) { sets.push("title = ?"); binds.push(input.title); }
    if (input.description !== undefined) { sets.push("description = ?"); binds.push(input.description); }
    if (input.status !== undefined) { sets.push("status = ?"); binds.push(input.status); }
    if (input.framework !== undefined) { sets.push("framework = ?"); binds.push(input.framework); }
    if (input.startDate !== undefined) { sets.push("start_date = ?"); binds.push(input.startDate); }
    if (input.endDate !== undefined) { sets.push("end_date = ?"); binds.push(input.endDate); }

    if (sets.length === 0) return current;

    sets.push("updated_at = datetime('now')");
    binds.push(id, orgId);

    await this.db
      .prepare(`UPDATE poc_projects SET ${sets.join(", ")} WHERE id = ? AND org_id = ?`)
      .bind(...binds)
      .run();

    const updated = await this.getById(id, orgId);
    return updated!;
  }

  async getKpis(pocId: string, orgId: string): Promise<PocKpi[]> {
    // Verify PoC belongs to org
    const poc = await this.getById(pocId, orgId);
    if (!poc) throw new Error("PoC not found");

    const { results } = await this.db
      .prepare(
        `SELECT id, org_id, poc_id, metric_name, target_value, actual_value, unit, measured_at, created_at
         FROM poc_kpis WHERE poc_id = ? ORDER BY created_at DESC`,
      )
      .bind(pocId)
      .all<Record<string, unknown>>();

    return results.map((r) => this.mapKpiRow(r));
  }

  async addKpi(pocId: string, input: CreateKpiInput): Promise<PocKpi> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO poc_kpis (id, org_id, poc_id, metric_name, target_value, actual_value, unit, measured_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.orgId,
        pocId,
        input.metricName,
        input.targetValue ?? null,
        input.actualValue ?? null,
        input.unit,
        now,
        now,
      )
      .run();

    return {
      id,
      orgId: input.orgId,
      pocId,
      metricName: input.metricName,
      targetValue: input.targetValue ?? null,
      actualValue: input.actualValue ?? null,
      unit: input.unit,
      measuredAt: now,
      createdAt: now,
    };
  }

  private mapRow(r: Record<string, unknown>): PocProject {
    return {
      id: r.id as string,
      orgId: r.org_id as string,
      bizItemId: r.biz_item_id as string | null,
      title: r.title as string,
      description: r.description as string | null,
      status: r.status as PocStatus,
      framework: r.framework as string | null,
      startDate: r.start_date as string | null,
      endDate: r.end_date as string | null,
      createdBy: r.created_by as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  }

  private mapKpiRow(r: Record<string, unknown>): PocKpi {
    return {
      id: r.id as string,
      orgId: r.org_id as string,
      pocId: r.poc_id as string,
      metricName: r.metric_name as string,
      targetValue: r.target_value as number | null,
      actualValue: r.actual_value as number | null,
      unit: r.unit as string,
      measuredAt: r.measured_at as string,
      createdAt: r.created_at as string,
    };
  }
}
