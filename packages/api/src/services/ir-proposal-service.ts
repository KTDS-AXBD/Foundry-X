/**
 * IrProposalService — IR Bottom-up 현장 제안 등록/검토 (F240)
 */
import type { IrProposalStatus } from "../schemas/ir-proposal.schema.js";

export interface IrProposal {
  id: string;
  orgId: string;
  title: string;
  description: string;
  category: string;
  rationale: string | null;
  expectedImpact: string | null;
  status: IrProposalStatus;
  submittedBy: string;
  reviewedBy: string | null;
  reviewComment: string | null;
  bizItemId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitIrProposalInput {
  orgId: string;
  title: string;
  description: string;
  category: string;
  rationale?: string;
  expectedImpact?: string;
  submittedBy: string;
}

export interface ReviewIrProposalInput {
  reviewedBy: string;
  comment?: string;
}

export interface ApproveResult {
  proposal: IrProposal;
  bizItemId: string;
}

export class IrProposalService {
  constructor(private db: D1Database) {}

  async submit(input: SubmitIrProposalInput): Promise<IrProposal> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO ir_proposals (id, org_id, title, description, category, rationale, expected_impact, status, submitted_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?)`,
      )
      .bind(
        id,
        input.orgId,
        input.title,
        input.description,
        input.category,
        input.rationale ?? null,
        input.expectedImpact ?? null,
        input.submittedBy,
        now,
        now,
      )
      .run();

    return {
      id,
      orgId: input.orgId,
      title: input.title,
      description: input.description,
      category: input.category,
      rationale: input.rationale ?? null,
      expectedImpact: input.expectedImpact ?? null,
      status: "submitted",
      submittedBy: input.submittedBy,
      reviewedBy: null,
      reviewComment: null,
      bizItemId: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async list(
    orgId: string,
    opts?: { status?: IrProposalStatus; category?: string; limit?: number; offset?: number },
  ): Promise<IrProposal[]> {
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;

    let query = `SELECT id, org_id, title, description, category, rationale, expected_impact, status, submitted_by, reviewed_by, review_comment, biz_item_id, created_at, updated_at
                 FROM ir_proposals WHERE org_id = ?`;
    const binds: unknown[] = [orgId];

    if (opts?.status) {
      query += ` AND status = ?`;
      binds.push(opts.status);
    }

    if (opts?.category) {
      query += ` AND category = ?`;
      binds.push(opts.category);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    binds.push(limit, offset);

    const { results } = await this.db
      .prepare(query)
      .bind(...binds)
      .all<Record<string, unknown>>();

    return results.map((r) => this.mapRow(r));
  }

  async getById(id: string, orgId: string): Promise<IrProposal | null> {
    const row = await this.db
      .prepare(
        `SELECT id, org_id, title, description, category, rationale, expected_impact, status, submitted_by, reviewed_by, review_comment, biz_item_id, created_at, updated_at
         FROM ir_proposals WHERE id = ? AND org_id = ?`,
      )
      .bind(id, orgId)
      .first<Record<string, unknown>>();

    return row ? this.mapRow(row) : null;
  }

  async approve(id: string, orgId: string, input: ReviewIrProposalInput): Promise<ApproveResult> {
    const row = await this.db
      .prepare(`SELECT id, org_id, title, description, submitted_by, status FROM ir_proposals WHERE id = ? AND org_id = ?`)
      .bind(id, orgId)
      .first<Record<string, unknown>>();

    if (!row) throw new Error("IR proposal not found");
    if (row.status === "approved" || row.status === "rejected") {
      throw new Error("Proposal already reviewed");
    }

    // Create biz_item from proposal
    const bizItemId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'ir_channel', 'draft', ?, ?, ?)`,
      )
      .bind(bizItemId, orgId, row.title as string, row.description as string, row.submitted_by as string, now, now)
      .run();

    // Create initial pipeline stage
    const stageId = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_by)
         VALUES (?, ?, ?, 'REGISTERED', ?)`,
      )
      .bind(stageId, bizItemId, orgId, input.reviewedBy)
      .run();

    // Update proposal
    await this.db
      .prepare(
        `UPDATE ir_proposals
         SET status = 'approved', reviewed_by = ?, review_comment = ?, biz_item_id = ?, updated_at = datetime('now')
         WHERE id = ? AND org_id = ?`,
      )
      .bind(input.reviewedBy, input.comment ?? null, bizItemId, id, orgId)
      .run();

    const updated = await this.db
      .prepare(
        `SELECT id, org_id, title, description, category, rationale, expected_impact, status, submitted_by, reviewed_by, review_comment, biz_item_id, created_at, updated_at
         FROM ir_proposals WHERE id = ?`,
      )
      .bind(id)
      .first<Record<string, unknown>>();

    return {
      proposal: this.mapRow(updated!),
      bizItemId,
    };
  }

  async reject(id: string, orgId: string, input: ReviewIrProposalInput): Promise<IrProposal> {
    const row = await this.db
      .prepare(`SELECT id, status FROM ir_proposals WHERE id = ? AND org_id = ?`)
      .bind(id, orgId)
      .first<Record<string, unknown>>();

    if (!row) throw new Error("IR proposal not found");
    if (row.status === "approved" || row.status === "rejected") {
      throw new Error("Proposal already reviewed");
    }

    await this.db
      .prepare(
        `UPDATE ir_proposals
         SET status = 'rejected', reviewed_by = ?, review_comment = ?, updated_at = datetime('now')
         WHERE id = ? AND org_id = ?`,
      )
      .bind(input.reviewedBy, input.comment ?? null, id, orgId)
      .run();

    const updated = await this.db
      .prepare(
        `SELECT id, org_id, title, description, category, rationale, expected_impact, status, submitted_by, reviewed_by, review_comment, biz_item_id, created_at, updated_at
         FROM ir_proposals WHERE id = ?`,
      )
      .bind(id)
      .first<Record<string, unknown>>();

    return this.mapRow(updated!);
  }

  private mapRow(r: Record<string, unknown>): IrProposal {
    return {
      id: r.id as string,
      orgId: r.org_id as string,
      title: r.title as string,
      description: r.description as string,
      category: r.category as string,
      rationale: r.rationale as string | null,
      expectedImpact: r.expected_impact as string | null,
      status: r.status as IrProposalStatus,
      submittedBy: r.submitted_by as string,
      reviewedBy: r.reviewed_by as string | null,
      reviewComment: r.review_comment as string | null,
      bizItemId: r.biz_item_id as string | null,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  }
}
