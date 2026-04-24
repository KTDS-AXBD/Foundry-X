/**
 * MvpTrackingService — MVP 상태 추적 + 이력 관리 (F238)
 */
import type { MvpStatus } from "../schemas/mvp-tracking.schema.js";
import { NotificationService } from "../../../services/notification-service.js";

export interface MvpTracking {
  id: string;
  bizItemId: string;
  orgId: string;
  title: string;
  description: string | null;
  status: MvpStatus;
  repoUrl: string | null;
  deployUrl: string | null;
  techStack: string | null;
  assignedTo: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MvpStatusHistory {
  id: string;
  mvpId: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string;
  reason: string | null;
  createdAt: string;
}

export interface CreateMvpInput {
  bizItemId: string;
  orgId: string;
  title: string;
  description?: string;
  repoUrl?: string;
  deployUrl?: string;
  techStack?: string;
  assignedTo?: string;
  createdBy: string;
}

export interface UpdateMvpStatusInput {
  status: MvpStatus;
  reason?: string;
  changedBy: string;
}

export class MvpTrackingService {
  private notificationService: NotificationService;

  constructor(private db: D1Database) {
    this.notificationService = new NotificationService(db);
  }

  async create(input: CreateMvpInput): Promise<MvpTracking> {
    const id = crypto.randomUUID();
    const historyId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO mvp_tracking (id, biz_item_id, org_id, title, description, status, repo_url, deploy_url, tech_stack, assigned_to, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'in_dev', ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.bizItemId,
        input.orgId,
        input.title,
        input.description ?? null,
        input.repoUrl ?? null,
        input.deployUrl ?? null,
        input.techStack ?? null,
        input.assignedTo ?? null,
        input.createdBy,
        now,
        now,
      )
      .run();

    // Initial history entry
    await this.db
      .prepare(
        `INSERT INTO mvp_status_history (id, mvp_id, from_status, to_status, changed_by, reason, created_at)
         VALUES (?, ?, NULL, 'in_dev', ?, NULL, ?)`,
      )
      .bind(historyId, id, input.createdBy, now)
      .run();

    return {
      id,
      bizItemId: input.bizItemId,
      orgId: input.orgId,
      title: input.title,
      description: input.description ?? null,
      status: "in_dev",
      repoUrl: input.repoUrl ?? null,
      deployUrl: input.deployUrl ?? null,
      techStack: input.techStack ?? null,
      assignedTo: input.assignedTo ?? null,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
  }

  async list(orgId: string, opts?: { status?: MvpStatus; limit?: number; offset?: number }): Promise<MvpTracking[]> {
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;

    let query = `SELECT id, biz_item_id, org_id, title, description, status, repo_url, deploy_url, tech_stack, assigned_to, created_by, created_at, updated_at
                 FROM mvp_tracking WHERE org_id = ?`;
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

  async getById(id: string, orgId: string): Promise<MvpTracking | null> {
    const row = await this.db
      .prepare(
        `SELECT id, biz_item_id, org_id, title, description, status, repo_url, deploy_url, tech_stack, assigned_to, created_by, created_at, updated_at
         FROM mvp_tracking WHERE id = ? AND org_id = ?`,
      )
      .bind(id, orgId)
      .first<Record<string, unknown>>();

    return row ? this.mapRow(row) : null;
  }

  async updateStatus(id: string, orgId: string, input: UpdateMvpStatusInput): Promise<MvpTracking> {
    const current = await this.db
      .prepare(`SELECT id, status, created_by FROM mvp_tracking WHERE id = ? AND org_id = ?`)
      .bind(id, orgId)
      .first<Record<string, unknown>>();

    if (!current) throw new Error("MVP not found");

    const fromStatus = current.status as MvpStatus;
    const historyId = crypto.randomUUID();

    await this.db
      .prepare(`UPDATE mvp_tracking SET status = ?, updated_at = datetime('now') WHERE id = ? AND org_id = ?`)
      .bind(input.status, id, orgId)
      .run();

    await this.db
      .prepare(
        `INSERT INTO mvp_status_history (id, mvp_id, from_status, to_status, changed_by, reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(historyId, id, fromStatus, input.status, input.changedBy, input.reason ?? null)
      .run();

    // Notify MVP creator if different from changer
    const createdBy = current.created_by as string;
    if (createdBy && createdBy !== input.changedBy) {
      await this.notificationService.create({
        orgId,
        recipientId: createdBy,
        type: "stage_change",
        bizItemId: undefined,
        title: `MVP 상태 변경: ${fromStatus} → ${input.status}`,
        body: input.reason,
        actorId: input.changedBy,
      });
    }

    const updated = await this.db
      .prepare(
        `SELECT id, biz_item_id, org_id, title, description, status, repo_url, deploy_url, tech_stack, assigned_to, created_by, created_at, updated_at
         FROM mvp_tracking WHERE id = ?`,
      )
      .bind(id)
      .first<Record<string, unknown>>();

    return this.mapRow(updated!);
  }

  async getHistory(mvpId: string, orgId: string): Promise<MvpStatusHistory[]> {
    // Verify mvp belongs to org
    const mvp = await this.db
      .prepare(`SELECT id FROM mvp_tracking WHERE id = ? AND org_id = ?`)
      .bind(mvpId, orgId)
      .first<Record<string, unknown>>();

    if (!mvp) throw new Error("MVP not found");

    const { results } = await this.db
      .prepare(
        `SELECT id, mvp_id, from_status, to_status, changed_by, reason, created_at
         FROM mvp_status_history WHERE mvp_id = ? ORDER BY created_at DESC`,
      )
      .bind(mvpId)
      .all<Record<string, unknown>>();

    return results.map((r) => ({
      id: r.id as string,
      mvpId: r.mvp_id as string,
      fromStatus: r.from_status as string | null,
      toStatus: r.to_status as string,
      changedBy: r.changed_by as string,
      reason: r.reason as string | null,
      createdAt: r.created_at as string,
    }));
  }

  private mapRow(r: Record<string, unknown>): MvpTracking {
    return {
      id: r.id as string,
      bizItemId: r.biz_item_id as string,
      orgId: r.org_id as string,
      title: r.title as string,
      description: r.description as string | null,
      status: r.status as MvpStatus,
      repoUrl: r.repo_url as string | null,
      deployUrl: r.deploy_url as string | null,
      techStack: r.tech_stack as string | null,
      assignedTo: r.assigned_to as string | null,
      createdBy: r.created_by as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  }
}
