/**
 * PipelineAdapter — PipelineService (launch 모듈) 대체
 * Gate-X D1에서 직접 pipeline_stages 쿼리
 */

export type PipelineStage =
  | "REGISTERED"
  | "DISCOVERY"
  | "FORMALIZATION"
  | "REVIEW"
  | "DECISION"
  | "OFFERING"
  | "MVP";

export class PipelineAdapter {
  constructor(private db: D1Database) {}

  async getCurrentStage(bizItemId: string): Promise<{ stage: PipelineStage } | null> {
    return this.db
      .prepare(
        `SELECT stage FROM pipeline_stages
         WHERE biz_item_id = ? AND exited_at IS NULL
         ORDER BY entered_at DESC LIMIT 1`,
      )
      .bind(bizItemId)
      .first<{ stage: PipelineStage }>();
  }

  async advanceStage(
    bizItemId: string,
    orgId: string,
    stage: PipelineStage,
    userId: string,
    reason: string,
  ): Promise<void> {
    // Close current stage
    await this.db
      .prepare(
        `UPDATE pipeline_stages SET exited_at = datetime('now')
         WHERE biz_item_id = ? AND exited_at IS NULL`,
      )
      .bind(bizItemId)
      .run();

    // Open next stage
    await this.db
      .prepare(
        `INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_by, reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(crypto.randomUUID(), bizItemId, orgId, stage, userId, reason)
      .run();
  }
}
