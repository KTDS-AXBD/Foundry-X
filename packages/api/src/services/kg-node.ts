/**
 * F255: KG Node CRUD service
 */

import type { KgNodeType } from "@foundry-x/shared";

export interface KgNode {
  id: string;
  orgId: string;
  type: KgNodeType;
  name: string;
  nameEn?: string;
  description?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface NodeRow {
  id: string;
  org_id: string;
  type: string;
  name: string;
  name_en: string | null;
  description: string | null;
  metadata: string;
  created_at: string;
  updated_at: string;
}

function rowToNode(row: NodeRow): KgNode {
  return {
    id: row.id,
    orgId: row.org_id,
    type: row.type as KgNodeType,
    name: row.name,
    nameEn: row.name_en ?? undefined,
    description: row.description ?? undefined,
    metadata: JSON.parse(row.metadata || "{}"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class KgNodeService {
  constructor(private db: D1Database) {}

  async create(input: {
    id: string;
    orgId: string;
    type: KgNodeType;
    name: string;
    nameEn?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }): Promise<KgNode> {
    const now = new Date().toISOString();
    const meta = JSON.stringify(input.metadata ?? {});
    await this.db
      .prepare(
        `INSERT INTO kg_nodes (id, org_id, type, name, name_en, description, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(input.id, input.orgId, input.type, input.name, input.nameEn ?? null, input.description ?? null, meta, now, now)
      .run();
    return this.getById(input.id, input.orgId) as Promise<KgNode>;
  }

  async getById(id: string, orgId: string): Promise<KgNode | null> {
    const row = await this.db
      .prepare("SELECT * FROM kg_nodes WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .first<NodeRow>();
    return row ? rowToNode(row) : null;
  }

  async list(
    orgId: string,
    filters?: { type?: KgNodeType; q?: string; page?: number; limit?: number }
  ): Promise<{ items: KgNode[]; total: number }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const offset = (page - 1) * limit;

    let where = "WHERE org_id = ?";
    const params: unknown[] = [orgId];

    if (filters?.type) {
      where += " AND type = ?";
      params.push(filters.type);
    }
    if (filters?.q) {
      where += " AND (name LIKE ? OR name_en LIKE ?)";
      params.push(`%${filters.q}%`, `%${filters.q}%`);
    }

    const countRow = await this.db
      .prepare(`SELECT COUNT(*) as cnt FROM kg_nodes ${where}`)
      .bind(...params)
      .first<{ cnt: number }>();

    const rows = await this.db
      .prepare(`SELECT * FROM kg_nodes ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .bind(...params, limit, offset)
      .all<NodeRow>();

    return {
      items: (rows.results ?? []).map(rowToNode),
      total: countRow?.cnt ?? 0,
    };
  }

  async update(
    id: string,
    orgId: string,
    data: { name?: string; nameEn?: string; description?: string; metadata?: Record<string, unknown> }
  ): Promise<KgNode | null> {
    const existing = await this.getById(id, orgId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const name = data.name ?? existing.name;
    const nameEn = data.nameEn ?? existing.nameEn ?? null;
    const description = data.description ?? existing.description ?? null;
    const metadata = data.metadata ? JSON.stringify(data.metadata) : JSON.stringify(existing.metadata);

    await this.db
      .prepare(
        `UPDATE kg_nodes SET name = ?, name_en = ?, description = ?, metadata = ?, updated_at = ?
         WHERE id = ? AND org_id = ?`
      )
      .bind(name, nameEn, description, metadata, now, id, orgId)
      .run();

    return this.getById(id, orgId);
  }

  async delete(id: string, orgId: string): Promise<boolean> {
    // Cascade: delete edges connected to this node
    await this.db
      .prepare("DELETE FROM kg_edges WHERE (source_node_id = ? OR target_node_id = ?) AND org_id = ?")
      .bind(id, id, orgId)
      .run();
    // Delete properties
    await this.db
      .prepare("DELETE FROM kg_properties WHERE entity_type = 'node' AND entity_id = ?")
      .bind(id)
      .run();
    const result = await this.db
      .prepare("DELETE FROM kg_nodes WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }

  async search(orgId: string, query: string): Promise<KgNode[]> {
    const rows = await this.db
      .prepare(
        `SELECT * FROM kg_nodes WHERE org_id = ? AND (name LIKE ? OR name_en LIKE ?) ORDER BY name LIMIT 50`
      )
      .bind(orgId, `%${query}%`, `%${query}%`)
      .all<NodeRow>();
    return (rows.results ?? []).map(rowToNode);
  }
}
