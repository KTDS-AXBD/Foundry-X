// F518: Work Lifecycle KG 서비스 — Green Phase 구현
import type { Env } from "../env.js";
import { TraceabilityService } from "./traceability.service.js";

export interface KgNode {
  id: string;
  node_type: string;
  label: string;
  metadata: Record<string, unknown>;
}

export interface KgEdge {
  id: string;
  source_id: string;
  target_id: string;
  edge_type: string;
}

export interface KgGraph {
  root_id: string;
  nodes: KgNode[];
  edges: KgEdge[];
}

export interface KgSyncResult {
  nodes_upserted: number;
  edges_upserted: number;
}

// 노드 ID 생성 헬퍼
function nodeId(type: string, label: string): string {
  return `work:${type}:${label}`;
}

// 엣지 ID: source+target+type 복합
function edgeId(sourceId: string, targetId: string, edgeType: string): string {
  return `${sourceId}|${edgeType}|${targetId}`;
}

export class WorkKGService {
  private traceSvc: TraceabilityService;

  constructor(private env: Env) {
    this.traceSvc = new TraceabilityService(env);
  }

  // ─── upsertNode ───────────────────────────────────────────────────────────

  private async upsertNode(
    id: string,
    nodeType: string,
    label: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.env.DB.prepare(
      `INSERT INTO work_kg_nodes (id, node_type, label, metadata, synced_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         label = excluded.label,
         metadata = excluded.metadata,
         synced_at = excluded.synced_at`,
    )
      .bind(id, nodeType, label, JSON.stringify(metadata))
      .run();
  }

  // ─── upsertEdge ───────────────────────────────────────────────────────────

  private async upsertEdge(
    sourceId: string,
    targetId: string,
    edgeType: string,
  ): Promise<void> {
    const id = edgeId(sourceId, targetId, edgeType);
    await this.env.DB.prepare(
      `INSERT INTO work_kg_edges (id, source_id, target_id, edge_type, synced_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET synced_at = excluded.synced_at`,
    )
      .bind(id, sourceId, targetId, edgeType)
      .run();
  }

  // ─── syncFromSpec ─────────────────────────────────────────────────────────

  /** SPEC.md 텍스트 → F-item/REQ/Sprint 노드 + 엣지 upsert */
  async syncFromSpec(specText: string): Promise<KgSyncResult> {
    const items = this.traceSvc.parseFItemLinks(specText);

    const seenPhases = new Set<string>();
    let nodesUpserted = 0;
    let edgesUpserted = 0;

    for (const item of items) {
      // F_ITEM 노드
      const fItemId = nodeId("FITEM", item.id);
      await this.upsertNode(fItemId, "F_ITEM", item.id, {
        status: item.status,
        sprint: item.sprint,
        req_code: item.req_code,
      });
      nodesUpserted++;

      // REQ 노드 + implements 엣지
      if (item.req_code) {
        const reqId = nodeId("REQ", item.req_code);
        await this.upsertNode(reqId, "REQ", item.req_code, {});
        nodesUpserted++;

        await this.upsertEdge(fItemId, reqId, "implements");
        edgesUpserted++;
      }

      // SPRINT 노드 + belongs_to 엣지
      if (item.sprint) {
        const sprintId = nodeId("SPRINT", item.sprint);
        await this.upsertNode(sprintId, "SPRINT", item.sprint, {});
        nodesUpserted++;

        await this.upsertEdge(fItemId, sprintId, "belongs_to");
        edgesUpserted++;

        // PHASE 노드: SPEC.md에서 Phase 번호 추출은 생략 — 별도 sync로 처리
        // Sprint 번호 범위로 Phase 추정하는 것은 fragile → skip
      }
    }

    return { nodes_upserted: nodesUpserted, edges_upserted: edgesUpserted };
  }

  // ─── syncFromGitHub ───────────────────────────────────────────────────────

  /** sprint_pr_links D1 테이블 → PR/Commit/Sprint 노드 + 엣지 upsert */
  async syncFromGitHub(): Promise<KgSyncResult> {
    const { results: prLinks } = await this.env.DB.prepare(
      `SELECT id, sprint_num, pr_number, f_items, pr_title, pr_url, pr_state, commit_shas
       FROM sprint_pr_links`,
    ).all<{
      id: string;
      sprint_num: string;
      pr_number: number;
      f_items: string;
      pr_title: string | null;
      pr_url: string | null;
      pr_state: string;
      commit_shas: string;
    }>();

    let nodesUpserted = 0;
    let edgesUpserted = 0;

    for (const link of prLinks) {
      const prId = nodeId("PR", String(link.pr_number));
      const sprintId = nodeId("SPRINT", link.sprint_num);

      // PR 노드
      await this.upsertNode(prId, "PR", String(link.pr_number), {
        title: link.pr_title ?? "",
        url: link.pr_url ?? "",
        state: link.pr_state,
        sprint: link.sprint_num,
      });
      nodesUpserted++;

      // Sprint 노드 (없으면 생성)
      await this.upsertNode(sprintId, "SPRINT", link.sprint_num, {});
      nodesUpserted++;

      // PR → Sprint belongs_to
      await this.upsertEdge(prId, sprintId, "belongs_to");
      edgesUpserted++;

      // F_ITEM → PR: implemented_by — f_items 배열에서 엣지 생성
      let fItems: string[] = [];
      try {
        fItems = JSON.parse(link.f_items);
      } catch {
        fItems = [];
      }
      for (const fItem of fItems) {
        if (!fItem) continue;
        const fItemId = nodeId("FITEM", fItem);
        // F_ITEM 노드가 없으면 최소 정보로 생성
        await this.upsertNode(fItemId, "F_ITEM", fItem, {});
        nodesUpserted++;
        await this.upsertEdge(fItemId, prId, "belongs_to");
        edgesUpserted++;
      }

      // Commit 노드 + PR → Commit contains
      let commitShas: string[] = [];
      try {
        commitShas = JSON.parse(link.commit_shas);
      } catch {
        commitShas = [];
      }
      for (const sha of commitShas) {
        if (!sha) continue;
        const commitId = nodeId("COMMIT", sha);
        await this.upsertNode(commitId, "COMMIT", sha, { pr: link.pr_number });
        nodesUpserted++;
        await this.upsertEdge(prId, commitId, "contains");
        edgesUpserted++;
      }
    }

    return { nodes_upserted: nodesUpserted, edges_upserted: edgesUpserted };
  }

  // ─── traceGraph ───────────────────────────────────────────────────────────

  /** BFS 그래프 탐색: 주어진 노드에서 depth 거리까지 인접 노드+엣지 수집 */
  async traceGraph(nodeId: string, depth = 2): Promise<KgGraph | null> {
    // root 노드 확인
    const root = await this.env.DB.prepare(
      "SELECT id, node_type, label, metadata FROM work_kg_nodes WHERE id = ?",
    ).bind(nodeId).first<{ id: string; node_type: string; label: string; metadata: string }>();

    if (!root) return null;

    const nodes = new Map<string, KgNode>();
    const edges = new Map<string, KgEdge>();
    const visited = new Set<string>();
    const queue: Array<{ id: string; d: number }> = [{ id: nodeId, d: 0 }];

    const parseNode = (row: { id: string; node_type: string; label: string; metadata: string }): KgNode => ({
      id: row.id,
      node_type: row.node_type,
      label: row.label,
      metadata: (() => { try { return JSON.parse(row.metadata) as Record<string, unknown>; } catch { return {}; } })(),
    });

    nodes.set(root.id, parseNode(root));
    visited.add(root.id);

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (item.d >= depth) continue;

      // 아웃바운드 엣지
      const { results: outEdges } = await this.env.DB.prepare(
        "SELECT id, source_id, target_id, edge_type FROM work_kg_edges WHERE source_id = ?",
      ).bind(item.id).all<{ id: string; source_id: string; target_id: string; edge_type: string }>();

      // 인바운드 엣지
      const { results: inEdges } = await this.env.DB.prepare(
        "SELECT id, source_id, target_id, edge_type FROM work_kg_edges WHERE target_id = ?",
      ).bind(item.id).all<{ id: string; source_id: string; target_id: string; edge_type: string }>();

      for (const edge of [...outEdges, ...inEdges]) {
        if (!edges.has(edge.id)) {
          edges.set(edge.id, edge);
        }

        // 방문하지 않은 인접 노드 탐색
        for (const neighborId of [edge.source_id, edge.target_id]) {
          if (visited.has(neighborId)) continue;
          visited.add(neighborId);

          const neighborRow = await this.env.DB.prepare(
            "SELECT id, node_type, label, metadata FROM work_kg_nodes WHERE id = ?",
          ).bind(neighborId).first<{ id: string; node_type: string; label: string; metadata: string }>();

          if (neighborRow) {
            nodes.set(neighborRow.id, parseNode(neighborRow));
            queue.push({ id: neighborId, d: item.d + 1 });
          }
        }
      }
    }

    return {
      root_id: nodeId,
      nodes: Array.from(nodes.values()),
      edges: Array.from(edges.values()),
    };
  }
}
