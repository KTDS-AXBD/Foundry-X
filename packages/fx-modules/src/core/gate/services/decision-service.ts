/**
 * DecisionService — Go/Hold/Drop 의사결정 + 자동 단계 전환 (F239)
 */
import type { DecisionType } from "../schemas/decision.schema.js";
import { type PipelineStage, PipelineService } from "./_pipeline-bridge.js";
import { NotificationService } from "../../../services/notification-service.js";

export interface Decision {
  id: string;
  bizItemId: string;
  orgId: string;
  decision: DecisionType;
  stage: string;
  comment: string;
  decidedBy: string;
  createdAt: string;
}

export interface CreateDecisionInput {
  bizItemId: string;
  orgId: string;
  decision: DecisionType;
  comment: string;
  decidedBy: string;
}

export interface DecisionStats {
  total: number;
  go: number;
  hold: number;
  drop: number;
}

export interface PendingDecisionItem {
  bizItemId: string;
  title: string;
  currentStage: string;
  stageEnteredAt: string;
  createdBy: string;
}

const NEXT_STAGE: Record<string, PipelineStage> = {
  REGISTERED: "DISCOVERY",
  DISCOVERY: "FORMALIZATION",
  FORMALIZATION: "REVIEW",
  REVIEW: "DECISION",
  DECISION: "OFFERING",
  OFFERING: "MVP",
};

export class DecisionService {
  private pipelineService: PipelineService;
  private notificationService: NotificationService;

  constructor(private db: D1Database) {
    this.pipelineService = new PipelineService(db);
    this.notificationService = new NotificationService(db);
  }

  async create(input: CreateDecisionInput): Promise<Decision> {
    const id = crypto.randomUUID();
    const currentStage = await this.pipelineService.getCurrentStage(input.bizItemId);
    const stage = currentStage?.stage ?? "REGISTERED";

    await this.db
      .prepare(
        `INSERT INTO decisions (id, biz_item_id, org_id, decision, stage, comment, decided_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, input.bizItemId, input.orgId, input.decision, stage, input.comment, input.decidedBy)
      .run();

    // Auto stage transition on GO
    if (input.decision === "GO") {
      const nextStage = NEXT_STAGE[stage];
      if (nextStage) {
        await this.pipelineService.advanceStage(input.bizItemId, input.orgId, nextStage, input.decidedBy, `GO decision: ${input.comment}`);
      } else if (stage === "MVP") {
        // MVP → GO means completion
        await this.db
          .prepare(`UPDATE biz_items SET status = 'completed', updated_at = datetime('now') WHERE id = ?`)
          .bind(input.bizItemId)
          .run();
      }
    }

    // DROP → mark item as dropped
    if (input.decision === "DROP") {
      await this.db
        .prepare(`UPDATE biz_items SET status = 'dropped', updated_at = datetime('now') WHERE id = ?`)
        .bind(input.bizItemId)
        .run();
    }

    // Create notification for item creator
    const item = await this.db
      .prepare(`SELECT created_by FROM biz_items WHERE id = ?`)
      .bind(input.bizItemId)
      .first<Record<string, unknown>>();

    if (item?.created_by && item.created_by !== input.decidedBy) {
      await this.notificationService.create({
        orgId: input.orgId,
        recipientId: item.created_by as string,
        type: "decision_made",
        bizItemId: input.bizItemId,
        title: `의사결정: ${input.decision}`,
        body: input.comment,
        actorId: input.decidedBy,
      });
    }

    return { id, bizItemId: input.bizItemId, orgId: input.orgId, decision: input.decision, stage, comment: input.comment, decidedBy: input.decidedBy, createdAt: new Date().toISOString() };
  }

  async listByItem(bizItemId: string, orgId: string): Promise<Decision[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, biz_item_id, org_id, decision, stage, comment, decided_by, created_at
         FROM decisions WHERE biz_item_id = ? AND org_id = ? ORDER BY created_at DESC`,
      )
      .bind(bizItemId, orgId)
      .all<Record<string, unknown>>();

    return results.map((r) => this.mapRow(r));
  }

  async listByOrg(orgId: string, opts?: { limit?: number; offset?: number }): Promise<Decision[]> {
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;

    const { results } = await this.db
      .prepare(
        `SELECT id, biz_item_id, org_id, decision, stage, comment, decided_by, created_at
         FROM decisions WHERE org_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(orgId, limit, offset)
      .all<Record<string, unknown>>();

    return results.map((r) => this.mapRow(r));
  }

  async getStats(orgId: string): Promise<DecisionStats> {
    const { results } = await this.db
      .prepare(
        `SELECT decision, COUNT(*) as cnt FROM decisions WHERE org_id = ? GROUP BY decision`,
      )
      .bind(orgId)
      .all<Record<string, unknown>>();

    let total = 0, go = 0, hold = 0, drop = 0;
    for (const r of results) {
      const cnt = Number(r.cnt);
      total += cnt;
      if (r.decision === "GO") go = cnt;
      else if (r.decision === "HOLD") hold = cnt;
      else if (r.decision === "DROP") drop = cnt;
    }

    return { total, go, hold, drop };
  }

  async getPending(orgId: string): Promise<PendingDecisionItem[]> {
    const { results } = await this.db
      .prepare(
        `SELECT ps.biz_item_id, bi.title, ps.stage, ps.entered_at, bi.created_by
         FROM pipeline_stages ps
         JOIN biz_items bi ON bi.id = ps.biz_item_id
         WHERE ps.org_id = ? AND ps.exited_at IS NULL
           AND ps.stage IN ('REVIEW', 'DECISION')
         ORDER BY ps.entered_at ASC`,
      )
      .bind(orgId)
      .all<Record<string, unknown>>();

    return results.map((r) => ({
      bizItemId: r.biz_item_id as string,
      title: r.title as string,
      currentStage: r.stage as string,
      stageEnteredAt: r.entered_at as string,
      createdBy: r.created_by as string,
    }));
  }

  private mapRow(r: Record<string, unknown>): Decision {
    return {
      id: r.id as string,
      bizItemId: r.biz_item_id as string,
      orgId: r.org_id as string,
      decision: r.decision as DecisionType,
      stage: r.stage as string,
      comment: r.comment as string,
      decidedBy: r.decided_by as string,
      createdAt: r.created_at as string,
    };
  }
}
