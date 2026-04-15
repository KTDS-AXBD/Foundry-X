/**
 * F539c: BizItem CRUD 서비스 (create/list/getById — 순수 D1, cross-domain 의존 없음)
 * packages/api/src/core/discovery/services/biz-item-service.ts 에서 발췌
 */
import type { D1Database } from "@cloudflare/workers-types";

export interface CreateBizItemInput {
  title: string;
  description?: string;
  source?: string;
}

export interface BizItem {
  id: string;
  orgId: string;
  title: string;
  description: string | null;
  source: string;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  classification: {
    itemType: string;
    confidence: number;
    analysisWeights: Record<string, number>;
    classifiedAt: string;
  } | null;
}

interface BizItemRow {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  source: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ClassificationRow {
  item_type: string;
  confidence: number;
  analysis_weights: string;
  classified_at: string;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toCamelCase(row: BizItemRow, cls: ClassificationRow | null): BizItem {
  return {
    id: row.id,
    orgId: row.org_id,
    title: row.title,
    description: row.description,
    source: row.source,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    classification: cls
      ? {
          itemType: cls.item_type,
          confidence: cls.confidence,
          analysisWeights: JSON.parse(cls.analysis_weights || "{}"),
          classifiedAt: cls.classified_at,
        }
      : null,
  };
}

export class BizItemCrudService {
  constructor(private db: D1Database) {}

  async create(orgId: string, userId: string, data: CreateBizItemInput): Promise<BizItem> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
      )
      .bind(id, orgId, data.title, data.description ?? null, data.source ?? "field", userId, now, now)
      .run();

    try {
      const pipelineId = crypto.randomUUID().replace(/-/g, "");
      await this.db
        .prepare(
          `INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, entered_by)
           VALUES (?, ?, ?, 'REGISTERED', ?, ?)`,
        )
        .bind(pipelineId, id, orgId, now, userId)
        .run();
    } catch {
      // pipeline_stages 미존재 환경에서는 무시
    }

    return {
      id,
      orgId,
      title: data.title,
      description: data.description ?? null,
      source: data.source ?? "field",
      status: "draft",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      classification: null,
    };
  }

  async list(orgId: string, filters?: { status?: string; source?: string }): Promise<BizItem[]> {
    let query = "SELECT * FROM biz_items WHERE org_id = ?";
    const bindings: unknown[] = [orgId];

    if (filters?.status) {
      query += " AND status = ?";
      bindings.push(filters.status);
    }
    if (filters?.source) {
      query += " AND source = ?";
      bindings.push(filters.source);
    }

    query += " ORDER BY created_at DESC";

    const { results } = await this.db
      .prepare(query)
      .bind(...bindings)
      .all<BizItemRow>();

    const items: BizItem[] = [];
    for (const row of results) {
      const cls = await this.db
        .prepare("SELECT item_type, confidence, analysis_weights, classified_at FROM biz_item_classifications WHERE biz_item_id = ?")
        .bind(row.id)
        .first<ClassificationRow>();
      items.push(toCamelCase(row, cls));
    }
    return items;
  }

  async getById(orgId: string, id: string): Promise<BizItem | null> {
    const row = await this.db
      .prepare("SELECT * FROM biz_items WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .first<BizItemRow>();

    if (!row) return null;

    const cls = await this.db
      .prepare("SELECT item_type, confidence, analysis_weights, classified_at FROM biz_item_classifications WHERE biz_item_id = ?")
      .bind(id)
      .first<ClassificationRow>();

    return toCamelCase(row, cls);
  }
}
