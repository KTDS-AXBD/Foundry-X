import type { SystemKnowledgeAsset, SystemKnowledgeContentType } from "../types.js";

interface RegisterInput {
  orgId: string;
  title: string;
  contentRef: string;
  contentType: SystemKnowledgeContentType;
  metadata?: Record<string, unknown>;
  createdBy?: string;
}

function rowToAsset(row: Record<string, unknown>): SystemKnowledgeAsset {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    assetType: "system_knowledge",
    title: row.title as string,
    contentRef: row.content_ref as string,
    contentType: row.content_type as SystemKnowledgeContentType,
    metadata: row.metadata ? (JSON.parse(row.metadata as string) as Record<string, unknown>) : null,
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

export class SystemKnowledgeService {
  constructor(private db: D1Database) {}

  async registerKnowledge(input: RegisterInput): Promise<SystemKnowledgeAsset> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO system_knowledge (id, org_id, title, content_ref, content_type, metadata, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.orgId,
        input.title,
        input.contentRef,
        input.contentType,
        input.metadata ? JSON.stringify(input.metadata) : null,
        input.createdBy ?? null,
      )
      .run();

    const row = await this.db
      .prepare(`SELECT * FROM system_knowledge WHERE id = ?`)
      .bind(id)
      .first<Record<string, unknown>>();

    return rowToAsset(row!);
  }

  async getKnowledge(id: string): Promise<SystemKnowledgeAsset | null> {
    const row = await this.db
      .prepare(`SELECT * FROM system_knowledge WHERE id = ?`)
      .bind(id)
      .first<Record<string, unknown>>();

    return row ? rowToAsset(row) : null;
  }
}
