import type { ValidationTier } from "../schemas/validation.schema.js";

export interface ValidationResult { bizItemId: string; previousTier: ValidationTier; currentTier: ValidationTier; decision: "approve" | "reject"; comment: string; decidedBy: string; decidedAt: string; }
export interface ValidationItem { bizItemId: string; title: string; currentStage: string; validationTier: ValidationTier; stageEnteredAt: string; createdBy: string; }
export interface ValidationStatus { bizItemId: string; tier: ValidationTier; history: Array<{ tier: ValidationTier; decision: string; decidedBy: string; decidedAt: string; comment: string; }>; }

export class ValidationService {
  constructor(private db: D1Database) {}

  async submitDivisionReview(bizItemId: string, orgId: string, decision: "approve" | "reject", comment: string, userId: string): Promise<ValidationResult> {
    const current = await this.getCurrentTier(bizItemId, orgId);
    if (current !== "none" && current !== "division_pending") throw new ValidationTierError(`Cannot submit division review: current tier is '${current}'`);
    const newTier: ValidationTier = decision === "approve" ? "division_approved" : "none";
    await this.db.prepare(`UPDATE pipeline_stages SET validation_tier = ? WHERE biz_item_id = ? AND org_id = ? AND exited_at IS NULL`).bind(newTier, bizItemId, orgId).run();
    await this.recordHistory(bizItemId, orgId, newTier, decision, comment, userId);
    return { bizItemId, previousTier: current, currentTier: newTier, decision, comment, decidedBy: userId, decidedAt: new Date().toISOString() };
  }

  async submitCompanyReview(bizItemId: string, orgId: string, decision: "approve" | "reject", comment: string, userId: string): Promise<ValidationResult> {
    const current = await this.getCurrentTier(bizItemId, orgId);
    if (current !== "division_approved" && current !== "company_pending") throw new ValidationTierError(`Cannot submit company review: current tier is '${current}', need 'division_approved'`);
    const newTier: ValidationTier = decision === "approve" ? "company_approved" : "division_approved";
    await this.db.prepare(`UPDATE pipeline_stages SET validation_tier = ? WHERE biz_item_id = ? AND org_id = ? AND exited_at IS NULL`).bind(newTier, bizItemId, orgId).run();
    await this.recordHistory(bizItemId, orgId, newTier, decision, comment, userId);
    return { bizItemId, previousTier: current, currentTier: newTier, decision, comment, decidedBy: userId, decidedAt: new Date().toISOString() };
  }

  async getDivisionItems(orgId: string, filters?: { limit?: number; offset?: number }): Promise<{ items: ValidationItem[]; total: number }> {
    const limit = filters?.limit ?? 20;
    const offset = filters?.offset ?? 0;
    const countResult = await this.db.prepare(`SELECT COUNT(*) as cnt FROM pipeline_stages ps JOIN biz_items bi ON bi.id = ps.biz_item_id WHERE ps.org_id = ? AND ps.exited_at IS NULL AND ps.stage IN ('REVIEW', 'DECISION') AND (ps.validation_tier IS NULL OR ps.validation_tier IN ('none', 'division_pending'))`).bind(orgId).first<{ cnt: number }>();
    const { results } = await this.db.prepare(`SELECT ps.biz_item_id, bi.title, ps.stage, ps.validation_tier, ps.entered_at, bi.created_by FROM pipeline_stages ps JOIN biz_items bi ON bi.id = ps.biz_item_id WHERE ps.org_id = ? AND ps.exited_at IS NULL AND ps.stage IN ('REVIEW', 'DECISION') AND (ps.validation_tier IS NULL OR ps.validation_tier IN ('none', 'division_pending')) ORDER BY ps.entered_at ASC LIMIT ? OFFSET ?`).bind(orgId, limit, offset).all<Record<string, unknown>>();
    return { items: results.map((r) => this.mapValidationItem(r)), total: countResult?.cnt ?? 0 };
  }

  async getCompanyItems(orgId: string, filters?: { limit?: number; offset?: number }): Promise<{ items: ValidationItem[]; total: number }> {
    const limit = filters?.limit ?? 20;
    const offset = filters?.offset ?? 0;
    const countResult = await this.db.prepare(`SELECT COUNT(*) as cnt FROM pipeline_stages ps JOIN biz_items bi ON bi.id = ps.biz_item_id WHERE ps.org_id = ? AND ps.exited_at IS NULL AND ps.validation_tier = 'division_approved'`).bind(orgId).first<{ cnt: number }>();
    const { results } = await this.db.prepare(`SELECT ps.biz_item_id, bi.title, ps.stage, ps.validation_tier, ps.entered_at, bi.created_by FROM pipeline_stages ps JOIN biz_items bi ON bi.id = ps.biz_item_id WHERE ps.org_id = ? AND ps.exited_at IS NULL AND ps.validation_tier = 'division_approved' ORDER BY ps.entered_at ASC LIMIT ? OFFSET ?`).bind(orgId, limit, offset).all<Record<string, unknown>>();
    return { items: results.map((r) => this.mapValidationItem(r)), total: countResult?.cnt ?? 0 };
  }

  async getValidationStatus(bizItemId: string, orgId: string): Promise<ValidationStatus | null> {
    const current = await this.db.prepare(`SELECT validation_tier FROM pipeline_stages WHERE biz_item_id = ? AND org_id = ? AND exited_at IS NULL ORDER BY entered_at DESC LIMIT 1`).bind(bizItemId, orgId).first<{ validation_tier: string }>();
    if (!current) return null;
    const { results } = await this.db.prepare(`SELECT tier, decision, decided_by, decided_at, comment FROM validation_history WHERE biz_item_id = ? AND org_id = ? ORDER BY decided_at DESC`).bind(bizItemId, orgId).all<Record<string, unknown>>();
    return { bizItemId, tier: (current.validation_tier || "none") as ValidationTier, history: results.map((r) => ({ tier: r["tier"] as ValidationTier, decision: r["decision"] as string, decidedBy: r["decided_by"] as string, decidedAt: r["decided_at"] as string, comment: r["comment"] as string })) };
  }

  private async getCurrentTier(bizItemId: string, orgId: string): Promise<ValidationTier> {
    const row = await this.db.prepare(`SELECT validation_tier FROM pipeline_stages WHERE biz_item_id = ? AND org_id = ? AND exited_at IS NULL ORDER BY entered_at DESC LIMIT 1`).bind(bizItemId, orgId).first<{ validation_tier: string }>();
    return (row?.validation_tier || "none") as ValidationTier;
  }

  private async recordHistory(bizItemId: string, orgId: string, tier: ValidationTier, decision: string, comment: string, userId: string): Promise<void> {
    await this.db.prepare(`INSERT INTO validation_history (id, biz_item_id, org_id, tier, decision, comment, decided_by) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), bizItemId, orgId, tier, decision, comment, userId).run();
  }

  private mapValidationItem(r: Record<string, unknown>): ValidationItem {
    return { bizItemId: r["biz_item_id"] as string, title: r["title"] as string, currentStage: r["stage"] as string, validationTier: (r["validation_tier"] || "none") as ValidationTier, stageEnteredAt: r["entered_at"] as string, createdBy: r["created_by"] as string };
  }
}

export class ValidationTierError extends Error {
  constructor(message: string) { super(message); this.name = "ValidationTierError"; }
}
