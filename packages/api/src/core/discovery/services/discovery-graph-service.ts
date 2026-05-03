// ─── F531: DiscoveryGraphService — Graph 기반 발굴 파이프라인 오케스트레이터 ───
import { GraphEngine } from "../../../agent/orchestration/graph-engine.js";
import { createDiscoveryGraph, type GraphStageInput } from "../../../agent/orchestration/graphs/discovery-graph.js";
import type { AgentRunner } from "../../../agent/services/agent-runner.js";
import type { GraphRunResult } from "@foundry-x/shared";

export type { GraphStageInput };

/**
 * GraphEngine을 통해 발굴 9단계 파이프라인 전체를 실행한다.
 *
 * createDiscoveryGraph()가 만든 GraphDefinition을 GraphEngine에 로드하고
 * runner.execute → D1 저장까지 각 단계를 순서대로/병렬로 처리한다.
 */
export class DiscoveryGraphService {
  constructor(
    private runner: AgentRunner,
    private db: D1Database,
    private sessionId: string,
    private apiKey: string,
  ) {}

  /** 전체 9단계 파이프라인 실행 */
  async runAll(input: GraphStageInput): Promise<GraphRunResult> {
    const graph = createDiscoveryGraph(this.runner, this.db);
    const engine = this.buildEngine(graph);
    return engine.run(input, this.sessionId, this.apiKey, this.db);
  }

  /**
   * 특정 단계부터 파이프라인 재개.
   * GraphEngine은 entryPoint 변경을 지원하지 않으므로
   * stage-{N} 노드를 직접 진입점으로 하는 서브그래프를 실행한다.
   */
  async runFrom(stage: string, input: GraphStageInput): Promise<GraphRunResult> {
    const graph = createDiscoveryGraph(this.runner, this.db);
    const nodeId = `stage-${stage}`;

    // 해당 노드가 존재하는지 확인
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node '${nodeId}' not found in discovery graph`);
    }

    // 해당 노드부터 진입하는 서브그래프 엔진 구성
    const subEngine = new GraphEngine();
    for (const n of graph.nodes) subEngine.addNode(n);
    // 서브그래프의 엣지: 해당 노드 이후 엣지만 포함
    const reachable = this.findReachableNodes(graph.edges, nodeId);
    reachable.add(nodeId);
    for (const edge of graph.edges) {
      if (reachable.has(edge.from)) subEngine.addEdge(edge);
    }
    subEngine.setEntryPoint(nodeId);
    subEngine.setMaxExecutions(graph.maxExecutions ?? 50);

    return subEngine.run(input, this.sessionId, this.apiKey, this.db);
  }

  // ─── Private ───

  /** GraphDefinition에서 GraphEngine을 재구성 */
  private buildEngine(graph: ReturnType<typeof createDiscoveryGraph>): GraphEngine {
    const engine = new GraphEngine();
    for (const node of graph.nodes) engine.addNode(node);
    for (const edge of graph.edges) engine.addEdge(edge);
    engine.setEntryPoint(graph.entryPoint);
    if (graph.maxExecutions) engine.setMaxExecutions(graph.maxExecutions);
    return engine;
  }

  /** DFS로 nodeId에서 도달 가능한 노드 집합을 반환 */
  private findReachableNodes(
    edges: Array<{ from: string; to: string }>,
    startId: string,
  ): Set<string> {
    const visited = new Set<string>();
    const queue = [startId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of edges) {
        if (edge.from === current && !visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push(edge.to);
        }
      }
    }
    return visited;
  }
}
