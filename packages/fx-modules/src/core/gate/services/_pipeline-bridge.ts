/** PipelineStage type + PipelineService bridge for gate domain (no cross-domain import) */
export type PipelineStage =
  | "REGISTERED" | "DISCOVERY" | "FORMALIZATION" | "REVIEW"
  | "DECISION" | "OFFERING" | "MVP";

interface PipelineStageRecord {
  id: string;
  bizItemId: string;
  stage: PipelineStage;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export class PipelineService {
  constructor(private db: D1Database) {}

  async getCurrentStage(bizItemId: string): Promise<PipelineStageRecord | null> {
    const row = await this.db
      .prepare(`SELECT id, biz_item_id, stage, notes, created_by, created_at
                FROM pipeline_stages WHERE biz_item_id = ? ORDER BY created_at DESC LIMIT 1`)
      .bind(bizItemId)
      .first<Record<string, unknown>>();
    if (!row) return null;
    return {
      id: row.id as string,
      bizItemId: row.biz_item_id as string,
      stage: row.stage as PipelineStage,
      notes: row.notes as string | null,
      createdBy: row.created_by as string,
      createdAt: row.created_at as string,
    };
  }

  async advanceStage(
    bizItemId: string,
    orgId: string,
    stage: PipelineStage,
    createdBy: string,
    notes?: string,
  ): Promise<void> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(`INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, notes, created_by)
                VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(id, bizItemId, orgId, stage, notes ?? null, createdBy)
      .run();
    await this.db
      .prepare(`UPDATE biz_items SET current_stage = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(stage, bizItemId)
      .run();
  }
}
