/**
 * F255: KG graph traversal — BFS path finding + impact propagation
 */

import type { KgNodeType, KgRelationType, ImpactLevel } from "@foundry-x/shared";

interface NodeRow {
  id: string;
  type: string;
  name: string;
  name_en: string | null;
}

interface EdgeRow {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relation_type: string;
  weight: number;
  label: string | null;
}

export interface PathNode {
  id: string;
  type: KgNodeType;
  name: string;
}

export interface PathEdge {
  id: string;
  relationType: KgRelationType;
  weight: number;
  label?: string;
}

export interface PathResult {
  path: PathNode[];
  edges: PathEdge[];
  totalWeight: number;
  hopCount: number;
}

export interface ImpactNode {
  id: string;
  type: KgNodeType;
  name: string;
  impactLevel: ImpactLevel;
  impactScore: number;
  pathFromSource: string[];
  hopCount: number;
}

export interface ImpactResult {
  sourceNode: PathNode;
  affectedNodes: ImpactNode[];
  totalAffected: number;
  byLevel: { high: number; medium: number; low: number };
}

export interface KgStats {
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<string, number>;
  edgesByType: Record<string, number>;
}

export class KgQueryService {
  constructor(private db: D1Database) {}

  /**
   * BFS shortest path between two nodes
   */
  async findPath(
    sourceId: string,
    targetId: string,
    orgId: string,
    maxDepth = 5
  ): Promise<PathResult | null> {
    const queue: Array<{ nodeId: string; path: string[]; edgeIds: string[] }> = [
      { nodeId: sourceId, path: [sourceId], edgeIds: [] },
    ];
    const visited = new Set<string>([sourceId]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.path.length - 1 > maxDepth) continue;

      if (current.nodeId === targetId && current.path.length > 1) {
        return this.buildPathResult(current.path, current.edgeIds, orgId);
      }

      const edges = await this.db
        .prepare("SELECT id, source_node_id, target_node_id, relation_type, weight, label FROM kg_edges WHERE source_node_id = ? AND org_id = ?")
        .bind(current.nodeId, orgId)
        .all<EdgeRow>();

      for (const edge of edges.results ?? []) {
        const nextId = edge.target_node_id;
        if (!visited.has(nextId)) {
          visited.add(nextId);
          queue.push({
            nodeId: nextId,
            path: [...current.path, nextId],
            edgeIds: [...current.edgeIds, edge.id],
          });
        }
      }
    }

    return null;
  }

  /**
   * DFS all paths (max 10 results)
   */
  async findAllPaths(
    sourceId: string,
    targetId: string,
    orgId: string,
    maxDepth = 5
  ): Promise<PathResult[]> {
    const results: PathResult[] = [];
    const MAX_RESULTS = 10;

    const dfs = async (nodeId: string, path: string[], edgeIds: string[], visited: Set<string>) => {
      if (results.length >= MAX_RESULTS) return;
      if (path.length - 1 > maxDepth) return;

      if (nodeId === targetId && path.length > 1) {
        const result = await this.buildPathResult(path, edgeIds, orgId);
        if (result) results.push(result);
        return;
      }

      const edges = await this.db
        .prepare("SELECT id, target_node_id, relation_type, weight, label FROM kg_edges WHERE source_node_id = ? AND org_id = ?")
        .bind(nodeId, orgId)
        .all<EdgeRow>();

      for (const edge of edges.results ?? []) {
        const nextId = edge.target_node_id;
        if (!visited.has(nextId)) {
          visited.add(nextId);
          await dfs(nextId, [...path, nextId], [...edgeIds, edge.id], visited);
          visited.delete(nextId);
        }
      }
    };

    const visited = new Set<string>([sourceId]);
    await dfs(sourceId, [sourceId], [], visited);
    return results.sort((a, b) => a.hopCount - b.hopCount);
  }

  /**
   * BFS impact propagation with decay
   */
  async propagateImpact(
    sourceId: string,
    orgId: string,
    options?: {
      decayFactor?: number;
      threshold?: number;
      maxDepth?: number;
      relationTypes?: KgRelationType[];
    }
  ): Promise<ImpactResult> {
    const decayFactor = options?.decayFactor ?? 0.7;
    const threshold = options?.threshold ?? 0.1;
    const maxDepth = options?.maxDepth ?? 5;
    const relationFilter = options?.relationTypes;

    const sourceRow = await this.db
      .prepare("SELECT id, type, name FROM kg_nodes WHERE id = ? AND org_id = ?")
      .bind(sourceId, orgId)
      .first<NodeRow>();

    if (!sourceRow) {
      return { sourceNode: { id: sourceId, type: "PRODUCT", name: "Unknown" }, affectedNodes: [], totalAffected: 0, byLevel: { high: 0, medium: 0, low: 0 } };
    }

    const sourceNode: PathNode = { id: sourceRow.id, type: sourceRow.type as KgNodeType, name: sourceRow.name };

    const queue: Array<{ nodeId: string; score: number; depth: number; path: string[] }> = [
      { nodeId: sourceId, score: 1.0, depth: 0, path: [sourceId] },
    ];
    const visited = new Map<string, number>(); // nodeId -> best score
    const affected: ImpactNode[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth > maxDepth || current.score < threshold) continue;

      const prevScore = visited.get(current.nodeId);
      if (prevScore !== undefined && prevScore >= current.score) continue;
      visited.set(current.nodeId, current.score);

      // Skip adding source node to results
      if (current.nodeId !== sourceId) {
        const nodeRow = await this.db
          .prepare("SELECT id, type, name FROM kg_nodes WHERE id = ? AND org_id = ?")
          .bind(current.nodeId, orgId)
          .first<NodeRow>();

        if (nodeRow) {
          const level: ImpactLevel = current.score >= 0.7 ? "HIGH" : current.score >= 0.3 ? "MEDIUM" : "LOW";
          // Remove existing entry if any (we found a better score)
          const existingIdx = affected.findIndex((a) => a.id === current.nodeId);
          if (existingIdx >= 0) affected.splice(existingIdx, 1);

          affected.push({
            id: nodeRow.id,
            type: nodeRow.type as KgNodeType,
            name: nodeRow.name,
            impactLevel: level,
            impactScore: Math.round(current.score * 1000) / 1000,
            pathFromSource: current.path,
            hopCount: current.depth,
          });
        }
      }

      // Get outgoing edges
      let edgeQuery = "SELECT id, target_node_id, relation_type, weight FROM kg_edges WHERE source_node_id = ? AND org_id = ?";
      const params: unknown[] = [current.nodeId, orgId];

      if (relationFilter && relationFilter.length > 0) {
        const placeholders = relationFilter.map(() => "?").join(",");
        edgeQuery += ` AND relation_type IN (${placeholders})`;
        params.push(...relationFilter);
      }

      const edges = await this.db.prepare(edgeQuery).bind(...params).all<EdgeRow>();

      for (const edge of edges.results ?? []) {
        const nextScore = current.score * edge.weight * decayFactor;
        if (nextScore >= threshold) {
          queue.push({
            nodeId: edge.target_node_id,
            score: nextScore,
            depth: current.depth + 1,
            path: [...current.path, edge.target_node_id],
          });
        }
      }
    }

    // Sort by score descending
    affected.sort((a, b) => b.impactScore - a.impactScore);

    return {
      sourceNode,
      affectedNodes: affected,
      totalAffected: affected.length,
      byLevel: {
        high: affected.filter((a) => a.impactLevel === "HIGH").length,
        medium: affected.filter((a) => a.impactLevel === "MEDIUM").length,
        low: affected.filter((a) => a.impactLevel === "LOW").length,
      },
    };
  }

  /**
   * Get subgraph around a node
   */
  async getSubgraph(
    nodeId: string,
    orgId: string,
    depth = 2
  ): Promise<{ nodes: PathNode[]; edges: Array<{ id: string; source: string; target: string; relationType: KgRelationType; weight: number }> }> {
    const visited = new Set<string>();
    const allNodes: PathNode[] = [];
    const allEdges: Array<{ id: string; source: string; target: string; relationType: KgRelationType; weight: number }> = [];

    const queue: Array<{ id: string; d: number }> = [{ id: nodeId, d: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id) || current.d > depth) continue;
      visited.add(current.id);

      const node = await this.db
        .prepare("SELECT id, type, name FROM kg_nodes WHERE id = ? AND org_id = ?")
        .bind(current.id, orgId)
        .first<NodeRow>();
      if (node) allNodes.push({ id: node.id, type: node.type as KgNodeType, name: node.name });

      if (current.d < depth) {
        const edges = await this.db
          .prepare("SELECT id, source_node_id, target_node_id, relation_type, weight FROM kg_edges WHERE (source_node_id = ? OR target_node_id = ?) AND org_id = ?")
          .bind(current.id, current.id, orgId)
          .all<EdgeRow>();

        for (const edge of edges.results ?? []) {
          allEdges.push({
            id: edge.id,
            source: edge.source_node_id,
            target: edge.target_node_id,
            relationType: edge.relation_type as KgRelationType,
            weight: edge.weight,
          });
          const otherId = edge.source_node_id === current.id ? edge.target_node_id : edge.source_node_id;
          if (!visited.has(otherId)) queue.push({ id: otherId, d: current.d + 1 });
        }
      }
    }

    // Deduplicate edges by id
    const uniqueEdges = [...new Map(allEdges.map((e) => [e.id, e])).values()];
    return { nodes: allNodes, edges: uniqueEdges };
  }

  /**
   * KG statistics
   */
  async getStats(orgId: string): Promise<KgStats> {
    const nodeCount = await this.db
      .prepare("SELECT COUNT(*) as cnt FROM kg_nodes WHERE org_id = ?")
      .bind(orgId)
      .first<{ cnt: number }>();
    const edgeCount = await this.db
      .prepare("SELECT COUNT(*) as cnt FROM kg_edges WHERE org_id = ?")
      .bind(orgId)
      .first<{ cnt: number }>();

    const nodeTypes = await this.db
      .prepare("SELECT type, COUNT(*) as cnt FROM kg_nodes WHERE org_id = ? GROUP BY type")
      .bind(orgId)
      .all<{ type: string; cnt: number }>();
    const edgeTypes = await this.db
      .prepare("SELECT relation_type, COUNT(*) as cnt FROM kg_edges WHERE org_id = ? GROUP BY relation_type")
      .bind(orgId)
      .all<{ relation_type: string; cnt: number }>();

    const nodesByType: Record<string, number> = {};
    for (const row of nodeTypes.results ?? []) nodesByType[row.type] = row.cnt;

    const edgesByType: Record<string, number> = {};
    for (const row of edgeTypes.results ?? []) edgesByType[row.relation_type] = row.cnt;

    return {
      totalNodes: nodeCount?.cnt ?? 0,
      totalEdges: edgeCount?.cnt ?? 0,
      nodesByType,
      edgesByType,
    };
  }

  private async buildPathResult(
    nodeIds: string[],
    edgeIds: string[],
    orgId: string
  ): Promise<PathResult | null> {
    const nodes: PathNode[] = [];
    for (const nid of nodeIds) {
      const row = await this.db
        .prepare("SELECT id, type, name FROM kg_nodes WHERE id = ? AND org_id = ?")
        .bind(nid, orgId)
        .first<NodeRow>();
      if (row) nodes.push({ id: row.id, type: row.type as KgNodeType, name: row.name });
    }

    const edges: PathEdge[] = [];
    let totalWeight = 0;
    for (const eid of edgeIds) {
      const row = await this.db
        .prepare("SELECT id, relation_type, weight, label FROM kg_edges WHERE id = ? AND org_id = ?")
        .bind(eid, orgId)
        .first<EdgeRow>();
      if (row) {
        edges.push({
          id: row.id,
          relationType: row.relation_type as KgRelationType,
          weight: row.weight,
          label: row.label ?? undefined,
        });
        totalWeight += row.weight;
      }
    }

    return { path: nodes, edges, totalWeight, hopCount: edgeIds.length };
  }
}
