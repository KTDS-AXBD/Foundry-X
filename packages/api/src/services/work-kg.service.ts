// F518: Work Lifecycle KG 서비스 — stub (TDD Red phase)
import type { Env } from "../env.js";

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

export class WorkKGService {
  constructor(private env: Env) {}

  async syncFromSpec(_specText: string): Promise<KgSyncResult> {
    return { nodes_upserted: 0, edges_upserted: 0 };
  }

  async syncFromGitHub(): Promise<KgSyncResult> {
    return { nodes_upserted: 0, edges_upserted: 0 };
  }

  async traceGraph(_nodeId: string, _depth = 2): Promise<KgGraph | null> {
    return null;
  }
}
