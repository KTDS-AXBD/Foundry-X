/**
 * PipelineService — BD 파이프라인 단계 추적 + 칸반/통계 (F232)
 */
import type { PipelineStage } from "../schemas/pipeline.schema.js";

export interface PipelineStageRecord {
  id: string;
  bizItemId: string;
  orgId: string;
  stage: PipelineStage;
  enteredAt: string;
  exitedAt: string | null;
  enteredBy: string;
  notes: string | null;
}

export interface PipelineItem {
  id: string;
  title: string;
  description: string | null;
  currentStage: PipelineStage;
  stageEnteredAt: string;
  createdBy: string;
  createdAt: string;
}

export interface PipelineItemDetail extends PipelineItem {
  stageHistory: PipelineStageRecord[];
}

export interface KanbanColumn {
  stage: PipelineStage;
  items: PipelineItem[];
  count: number;
}

export interface PipelineStats {
  totalItems: number;
  byStage: Record<string, number>;
  avgDaysInStage: Record<string, number>;
}

export interface PipelineFilters {
  stage?: PipelineStage;
  assignee?: string;
  limit?: number;
  offset?: number;
}

export class PipelineService {
  constructor(private db: D1Database) {}

  async initStage(bizItemId: string, orgId: string, userId: string): Promise<PipelineStageRecord> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_by)
         VALUES (?, ?, ?, 'REGISTERED', ?)`,
      )
      .bind(id, bizItemId, orgId, userId)
      .run();

    return { id, bizItemId, orgId, stage: "REGISTERED", enteredAt: new Date().toISOString(), exitedAt: null, enteredBy: userId, notes: null };
  }

  async getCurrentStage(bizItemId: string): Promise<PipelineStageRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT id, biz_item_id, org_id, stage, entered_at, exited_at, entered_by, notes
         FROM pipeline_stages
         WHERE biz_item_id = ? AND exited_at IS NULL
         ORDER BY entered_at DESC LIMIT 1`,
      )
      .bind(bizItemId)
      .first<Record<string, unknown>>();

    if (!row) return null;
    return this.mapRow(row);
  }

  async advanceStage(
    bizItemId: string,
    orgId: string,
    newStage: PipelineStage,
    userId: string,
    notes?: string,
  ): Promise<PipelineStageRecord> {
    const now = new Date().toISOString();

    // Close current stage
    await this.db
      .prepare(`UPDATE pipeline_stages SET exited_at = ? WHERE biz_item_id = ? AND exited_at IS NULL`)
      .bind(now, bizItemId)
      .run();

    // Open new stage
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, entered_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, bizItemId, orgId, newStage, now, userId, notes ?? null)
      .run();

    return { id, bizItemId, orgId, stage: newStage, enteredAt: now, exitedAt: null, enteredBy: userId, notes: notes ?? null };
  }

  async getKanbanData(orgId: string): Promise<KanbanColumn[]> {
    const { results } = await this.db
      .prepare(
        `SELECT ps.stage, ps.biz_item_id, ps.entered_at,
                bi.id, bi.title, bi.description, bi.created_by, bi.created_at
         FROM pipeline_stages ps
         JOIN biz_items bi ON bi.id = ps.biz_item_id
         WHERE ps.org_id = ? AND ps.exited_at IS NULL
         ORDER BY ps.stage, ps.entered_at`,
      )
      .bind(orgId)
      .all<Record<string, unknown>>();

    const stages: PipelineStage[] = ["REGISTERED", "DISCOVERY", "FORMALIZATION", "REVIEW", "DECISION", "OFFERING", "MVP"];
    const grouped = new Map<string, PipelineItem[]>();
    for (const s of stages) grouped.set(s, []);

    for (const r of results) {
      const stage = r.stage as string;
      const items = grouped.get(stage);
      if (items) {
        items.push({
          id: r.biz_item_id as string,
          title: r.title as string,
          description: r.description as string | null,
          currentStage: stage as PipelineStage,
          stageEnteredAt: r.entered_at as string,
          createdBy: r.created_by as string,
          createdAt: r.created_at as string,
        });
      }
    }

    return stages.map((stage) => ({
      stage,
      items: grouped.get(stage) ?? [],
      count: grouped.get(stage)?.length ?? 0,
    }));
  }

  async getStats(orgId: string): Promise<PipelineStats> {
    const { results: countResults } = await this.db
      .prepare(
        `SELECT stage, COUNT(*) as cnt
         FROM pipeline_stages
         WHERE org_id = ? AND exited_at IS NULL
         GROUP BY stage`,
      )
      .bind(orgId)
      .all<Record<string, unknown>>();

    const byStage: Record<string, number> = {};
    let totalItems = 0;
    for (const r of countResults) {
      const count = Number(r.cnt);
      byStage[r.stage as string] = count;
      totalItems += count;
    }

    const { results: avgResults } = await this.db
      .prepare(
        `SELECT stage,
                AVG(julianday(COALESCE(exited_at, datetime('now'))) - julianday(entered_at)) as avg_days
         FROM pipeline_stages
         WHERE org_id = ?
         GROUP BY stage`,
      )
      .bind(orgId)
      .all<Record<string, unknown>>();

    const avgDaysInStage: Record<string, number> = {};
    for (const r of avgResults) {
      avgDaysInStage[r.stage as string] = Math.round((Number(r.avg_days) || 0) * 10) / 10;
    }

    return { totalItems, byStage, avgDaysInStage };
  }

  async listItems(orgId: string, filters?: PipelineFilters): Promise<{ items: PipelineItem[]; total: number }> {
    const limit = filters?.limit ?? 20;
    const offset = filters?.offset ?? 0;

    let whereClause = "ps.org_id = ? AND ps.exited_at IS NULL";
    const binds: unknown[] = [orgId];

    if (filters?.stage) {
      whereClause += " AND ps.stage = ?";
      binds.push(filters.stage);
    }

    const countRow = await this.db
      .prepare(`SELECT COUNT(*) as total FROM pipeline_stages ps WHERE ${whereClause}`)
      .bind(...binds)
      .first<Record<string, unknown>>();

    const total = Number(countRow?.total ?? 0);

    const { results } = await this.db
      .prepare(
        `SELECT ps.stage, ps.entered_at, bi.id, bi.title, bi.description, bi.created_by, bi.created_at
         FROM pipeline_stages ps
         JOIN biz_items bi ON bi.id = ps.biz_item_id
         WHERE ${whereClause}
         ORDER BY ps.entered_at DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(...binds, limit, offset)
      .all<Record<string, unknown>>();

    const items: PipelineItem[] = results.map((r) => ({
      id: r.id as string,
      title: r.title as string,
      description: r.description as string | null,
      currentStage: r.stage as PipelineStage,
      stageEnteredAt: r.entered_at as string,
      createdBy: r.created_by as string,
      createdAt: r.created_at as string,
    }));

    return { items, total };
  }

  async getItemDetail(bizItemId: string, orgId: string): Promise<PipelineItemDetail | null> {
    const item = await this.db
      .prepare(
        `SELECT bi.id, bi.title, bi.description, bi.created_by, bi.created_at,
                ps.stage, ps.entered_at
         FROM biz_items bi
         JOIN pipeline_stages ps ON ps.biz_item_id = bi.id AND ps.exited_at IS NULL
         WHERE bi.id = ? AND ps.org_id = ?`,
      )
      .bind(bizItemId, orgId)
      .first<Record<string, unknown>>();

    // Fallback: pipeline_stages 행이 없는 고아 아이템(구버전 생성 경로)
    // → biz_items만으로 상세를 합성하여 404 대신 빈 stageHistory로 응답
    if (!item) {
      const bare = await this.db
        .prepare(
          `SELECT id, title, description, created_by, created_at, status
           FROM biz_items WHERE id = ? AND org_id = ?`,
        )
        .bind(bizItemId, orgId)
        .first<Record<string, unknown>>();

      if (!bare) return null;

      // biz_items.status 기반으로 currentStage 추정 (backfill 실패 대비)
      const status = (bare.status as string) ?? "draft";
      const inferredStage: PipelineStage =
        ["shaping", "done"].includes(status) ? "FORMALIZATION"
        : ["evaluated", "analyzed"].includes(status) ? "DISCOVERY"
        : "REGISTERED";

      return {
        id: bare.id as string,
        title: bare.title as string,
        description: bare.description as string | null,
        currentStage: inferredStage,
        stageEnteredAt: bare.created_at as string,
        createdBy: bare.created_by as string,
        createdAt: bare.created_at as string,
        stageHistory: [],
      };
    }

    const { results } = await this.db
      .prepare(
        `SELECT id, biz_item_id, org_id, stage, entered_at, exited_at, entered_by, notes
         FROM pipeline_stages
         WHERE biz_item_id = ?
         ORDER BY entered_at ASC`,
      )
      .bind(bizItemId)
      .all<Record<string, unknown>>();

    return {
      id: item.id as string,
      title: item.title as string,
      description: item.description as string | null,
      currentStage: item.stage as PipelineStage,
      stageEnteredAt: item.entered_at as string,
      createdBy: item.created_by as string,
      createdAt: item.created_at as string,
      stageHistory: results.map((r) => this.mapRow(r)),
    };
  }

  private mapRow(r: Record<string, unknown>): PipelineStageRecord {
    return {
      id: r.id as string,
      bizItemId: r.biz_item_id as string,
      orgId: r.org_id as string,
      stage: r.stage as PipelineStage,
      enteredAt: r.entered_at as string,
      exitedAt: r.exited_at as string | null,
      enteredBy: r.entered_by as string,
      notes: r.notes as string | null,
    };
  }
}
