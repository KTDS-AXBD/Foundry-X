/**
 * F255: KG Edge CRUD + neighbor query service
 */

import type { KgRelationType } from "@foundry-x/shared";
import type { KgNode } from "./kg-node.js";

export interface KgEdge {
  id: string;
  orgId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: KgRelationType;
  weight: number;
  label?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface EdgeRow {
  id: string;
  org_id: string;
  source_node_id: string;
  target_node_id: string;
  relation_type: string;
  weight: number;
  label: string | null;
  metadata: string;
  created_at: string;
}

function rowToEdge(row: EdgeRow): KgEdge {
  return {
    id: row.id,
    orgId: row.org_id,
    sourceNodeId: row.source_node_id,
    targetNodeId: row.target_node_id,
    relationType: row.relation_type as KgRelationType,
    weight: row.weight,
    label: row.label ?? undefined,
    metadata: JSON.parse(row.metadata || "{}"),
    createdAt: row.created_at,
  };
}

export class KgEdgeService {
  constructor(private db: D1Database) {}

  async create(input: {
    id: string;
    orgId: string;
    sourceNodeId: string;
    targetNodeId: string;
    relationType: KgRelationType;
    weight?: number;
    label?: string;
    metadata?: Record<string, unknown>;
  }): Promise<KgEdge> {
    const now = new Date().toISOString();
    const meta = JSON.stringify(input.metadata ?? {});
    await this.db
      .prepare(
        `INSERT INTO kg_edges (id, org_id, source_node_id, target_node_id, relation_type, weight, label, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        input.id, input.orgId, input.sourceNodeId, input.targetNodeId,
        input.relationType, input.weight ?? 1.0, input.label ?? null, meta, now
      )
      .run();
    return this.getById(input.id, input.orgId) as Promise<KgEdge>;
  }

  async getById(id: string, orgId: string): Promise<KgEdge | null> {
    const row = await this.db
      .prepare("SELECT * FROM kg_edges WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .first<EdgeRow>();
    return row ? rowToEdge(row) : null;
  }

  async getNeighbors(
    nodeId: string,
    orgId: string,
    direction: "outgoing" | "incoming" | "both" = "both"
  ): Promise<{ nodes: Array<{ id: string; type: string; name: string; name_en: string | null }>; edges: KgEdge[] }> {
    let edgeQuery: string;
    if (direction === "outgoing") {
      edgeQuery = "SELECT * FROM kg_edges WHERE source_node_id = ? AND org_id = ?";
    } else if (direction === "incoming") {
      edgeQuery = "SELECT * FROM kg_edges WHERE target_node_id = ? AND org_id = ?";
    } else {
      edgeQuery = "SELECT * FROM kg_edges WHERE (source_node_id = ? OR target_node_id = ?) AND org_id = ?";
    }

    let edges: KgEdge[];
    if (direction === "both") {
      const rows = await this.db.prepare(edgeQuery).bind(nodeId, nodeId, orgId).all<EdgeRow>();
      edges = (rows.results ?? []).map(rowToEdge);
    } else {
      const rows = await this.db.prepare(edgeQuery).bind(nodeId, orgId).all<EdgeRow>();
      edges = (rows.results ?? []).map(rowToEdge);
    }

    // Collect unique neighbor node IDs
    const neighborIds = new Set<string>();
    for (const edge of edges) {
      if (edge.sourceNodeId !== nodeId) neighborIds.add(edge.sourceNodeId);
      if (edge.targetNodeId !== nodeId) neighborIds.add(edge.targetNodeId);
    }

    if (neighborIds.size === 0) return { nodes: [], edges };

    const ids = [...neighborIds];
    const placeholders = ids.map(() => "?").join(",");
    const nodeRows = await this.db
      .prepare(`SELECT id, type, name, name_en FROM kg_nodes WHERE id IN (${placeholders}) AND org_id = ?`)
      .bind(...ids, orgId)
      .all<{ id: string; type: string; name: string; name_en: string | null }>();

    return {
      nodes: nodeRows.results ?? [],
      edges,
    };
  }

  async listByNode(nodeId: string, orgId: string): Promise<KgEdge[]> {
    const rows = await this.db
      .prepare("SELECT * FROM kg_edges WHERE (source_node_id = ? OR target_node_id = ?) AND org_id = ?")
      .bind(nodeId, nodeId, orgId)
      .all<EdgeRow>();
    return (rows.results ?? []).map(rowToEdge);
  }

  async delete(id: string, orgId: string): Promise<boolean> {
    await this.db
      .prepare("DELETE FROM kg_properties WHERE entity_type = 'edge' AND entity_id = ?")
      .bind(id)
      .run();
    const result = await this.db
      .prepare("DELETE FROM kg_edges WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }
}
