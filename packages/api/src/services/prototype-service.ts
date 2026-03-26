/**
 * Sprint 67: F209 — Prototype CRUD 래퍼 서비스
 * 기존 PrototypeGeneratorService는 생성 전담, 이 서비스는 조회/삭제 CRUD
 */

interface ProtoRow {
  id: string;
  biz_item_id: string;
  version: number;
  format: string;
  content: string;
  template_used: string | null;
  model_used: string | null;
  tokens_used: number;
  generated_at: string;
}

interface PocEnvRow {
  id: string;
  prototype_id: string;
  status: string;
  config: string;
  provisioned_at: string | null;
  terminated_at: string | null;
  created_at: string;
}

interface TechReviewRow {
  id: string;
  prototype_id: string;
  feasibility: string;
  stack_fit: number;
  complexity: string;
  risks: string;
  recommendation: string;
  estimated_effort: string | null;
  reviewed_at: string;
  created_at: string;
}

export interface PrototypeListItem {
  id: string;
  bizItemId: string;
  version: number;
  format: string;
  templateUsed: string | null;
  generatedAt: string;
}

export interface PrototypeDetail {
  id: string;
  bizItemId: string;
  version: number;
  format: string;
  content: string;
  templateUsed: string | null;
  modelUsed: string | null;
  tokensUsed: number;
  generatedAt: string;
  pocEnv: {
    id: string;
    prototypeId: string;
    status: string;
    config: Record<string, unknown>;
    provisionedAt: string | null;
    terminatedAt: string | null;
    createdAt: string;
  } | null;
  techReview: {
    id: string;
    prototypeId: string;
    feasibility: string;
    stackFit: number;
    complexity: string;
    risks: string[];
    recommendation: string;
    estimatedEffort: string;
    reviewedAt: string;
    createdAt: string;
  } | null;
}

function toListItem(row: ProtoRow): PrototypeListItem {
  return {
    id: row.id,
    bizItemId: row.biz_item_id,
    version: row.version,
    format: row.format,
    templateUsed: row.template_used,
    generatedAt: row.generated_at,
  };
}

function toPocEnv(row: PocEnvRow) {
  return {
    id: row.id,
    prototypeId: row.prototype_id,
    status: row.status,
    config: JSON.parse(row.config || "{}") as Record<string, unknown>,
    provisionedAt: row.provisioned_at,
    terminatedAt: row.terminated_at,
    createdAt: row.created_at,
  };
}

function toTechReview(row: TechReviewRow) {
  return {
    id: row.id,
    prototypeId: row.prototype_id,
    feasibility: row.feasibility,
    stackFit: row.stack_fit,
    complexity: row.complexity,
    risks: JSON.parse(row.risks || "[]") as string[],
    recommendation: row.recommendation,
    estimatedEffort: row.estimated_effort ?? "",
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

export class PrototypeService {
  constructor(private db: D1Database) {}

  async list(tenantId: string, opts?: {
    bizItemId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: PrototypeListItem[]; total: number }> {
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;

    let query: string;
    let countQuery: string;
    const bindings: unknown[] = [];
    const countBindings: unknown[] = [];

    if (opts?.bizItemId) {
      query = `SELECT p.* FROM prototypes p
        JOIN biz_items bi ON p.biz_item_id = bi.id
        WHERE bi.org_id = ? AND p.biz_item_id = ?
        ORDER BY p.generated_at DESC LIMIT ? OFFSET ?`;
      bindings.push(tenantId, opts.bizItemId, limit, offset);

      countQuery = `SELECT COUNT(*) as total FROM prototypes p
        JOIN biz_items bi ON p.biz_item_id = bi.id
        WHERE bi.org_id = ? AND p.biz_item_id = ?`;
      countBindings.push(tenantId, opts.bizItemId);
    } else {
      query = `SELECT p.* FROM prototypes p
        JOIN biz_items bi ON p.biz_item_id = bi.id
        WHERE bi.org_id = ?
        ORDER BY p.generated_at DESC LIMIT ? OFFSET ?`;
      bindings.push(tenantId, limit, offset);

      countQuery = `SELECT COUNT(*) as total FROM prototypes p
        JOIN biz_items bi ON p.biz_item_id = bi.id
        WHERE bi.org_id = ?`;
      countBindings.push(tenantId);
    }

    const { results } = await this.db.prepare(query).bind(...bindings).all<ProtoRow>();
    const countRow = await this.db.prepare(countQuery).bind(...countBindings).first<{ total: number }>();

    return {
      items: (results ?? []).map(toListItem),
      total: countRow?.total ?? 0,
    };
  }

  async getById(id: string, tenantId: string): Promise<PrototypeDetail | null> {
    const row = await this.db.prepare(
      `SELECT p.* FROM prototypes p
       JOIN biz_items bi ON p.biz_item_id = bi.id
       WHERE p.id = ? AND bi.org_id = ?`
    ).bind(id, tenantId).first<ProtoRow>();
    if (!row) return null;

    // Fetch related poc_env and tech_review
    const pocRow = await this.db.prepare(
      "SELECT * FROM poc_environments WHERE prototype_id = ?"
    ).bind(id).first<PocEnvRow>();

    const reviewRow = await this.db.prepare(
      "SELECT * FROM tech_reviews WHERE prototype_id = ? ORDER BY created_at DESC LIMIT 1"
    ).bind(id).first<TechReviewRow>();

    return {
      id: row.id,
      bizItemId: row.biz_item_id,
      version: row.version,
      format: row.format,
      content: row.content,
      templateUsed: row.template_used,
      modelUsed: row.model_used,
      tokensUsed: row.tokens_used,
      generatedAt: row.generated_at,
      pocEnv: pocRow ? toPocEnv(pocRow) : null,
      techReview: reviewRow ? toTechReview(reviewRow) : null,
    };
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    // Verify ownership via biz_items.org_id
    const row = await this.db.prepare(
      `SELECT p.id FROM prototypes p
       JOIN biz_items bi ON p.biz_item_id = bi.id
       WHERE p.id = ? AND bi.org_id = ?`
    ).bind(id, tenantId).first();
    if (!row) return false;

    // CASCADE will handle poc_environments and tech_reviews
    const result = await this.db.prepare("DELETE FROM prototypes WHERE id = ?").bind(id).run();
    return (result.meta?.changes ?? 0) > 0;
  }
}
