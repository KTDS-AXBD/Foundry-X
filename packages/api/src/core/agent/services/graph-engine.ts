// ─── F528: F-L3-1~3 GraphEngine — DAG/조건부/병렬 실행 엔진 ───
import { randomUUID } from "crypto";
import type {
  GraphNode,
  GraphEdge,
  GraphDefinition,
  GraphNodeInput,
  GraphNodeOutput,
  GraphExecutionContext,
  GraphRunResult,
} from "@foundry-x/shared";

export class GraphEngine {
  private nodes = new Map<string, GraphNode>();
  private edges: GraphEdge[] = [];
  private entryPointId?: string;
  private maxExec: number = 100;

  addNode(node: GraphNode): this {
    this.nodes.set(node.id, node);
    return this;
  }

  addEdge(edge: GraphEdge): this {
    this.edges.push(edge);
    return this;
  }

  setEntryPoint(nodeId: string): this {
    this.entryPointId = nodeId;
    return this;
  }

  setMaxExecutions(max: number): this {
    this.maxExec = max;
    return this;
  }

  /** DAG 검증 (사이클 감지) — 자기 루프는 허용, 진짜 사이클만 거부 */
  build(): GraphDefinition {
    if (!this.entryPointId) throw new Error("Entry point not set");
    if (!this.nodes.has(this.entryPointId)) {
      throw new Error(`Entry point '${this.entryPointId}' is not a registered node`);
    }

    // DFS 기반 사이클 감지 — 무조건 엣지(condition 없음)만 검사.
    // 조건부 백엣지(보완 루프)는 maxExecutions로 제어하므로 허용.
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      inStack.add(nodeId);

      // condition이 없는 엣지만 사이클 검사 (조건부 루프는 허용)
      const outgoing = this.edges.filter(
        (e) => e.from === nodeId && e.to !== nodeId && e.condition === undefined,
      );
      for (const edge of outgoing) {
        if (!visited.has(edge.to)) {
          if (hasCycle(edge.to)) return true;
        } else if (inStack.has(edge.to)) {
          return true;
        }
      }

      inStack.delete(nodeId);
      return false;
    };

    if (hasCycle(this.entryPointId)) {
      throw new Error("cycle detected in graph");
    }

    return {
      nodes: Array.from(this.nodes.values()),
      edges: [...this.edges],
      entryPoint: this.entryPointId,
      maxExecutions: this.maxExec,
    };
  }

  /** 그래프 실행 — 토폴로지 정렬 기반, 병렬 레벨 처리 */
  async run(
    input: unknown,
    sessionId: string,
    apiKey: string,
    db?: unknown,
  ): Promise<GraphRunResult> {
    const def = this.build();
    const executionId = randomUUID();
    const startMs = Date.now();

    const ctx: GraphExecutionContext = {
      executionId,
      sessionId,
      apiKey,
      db,
      nodeOutputs: new Map(),
      executionCount: new Map(),
    };

    let lastOutput: GraphNodeOutput = { nodeId: def.entryPoint, data: input };
    let totalExecutions = 0;

    // BFS 큐로 실행
    let queue: string[] = [def.entryPoint];

    while (queue.length > 0) {
      const currentBatch = [...queue];
      queue = [];

      // 현재 배치를 병렬 실행
      const results = await Promise.all(
        currentBatch.map(async (nodeId) => {
          const node = this.nodes.get(nodeId);
          if (!node) throw new Error(`Node '${nodeId}' not found`);

          const count = (ctx.executionCount.get(nodeId) ?? 0) + 1;
          ctx.executionCount.set(nodeId, count);
          totalExecutions++;

          if (totalExecutions > (def.maxExecutions ?? 100)) {
            throw new Error(`max executions (${def.maxExecutions ?? 100}) exceeded`);
          }

          const prevOutput = ctx.nodeOutputs.get(nodeId) ??
            // 진입점은 초기 input 사용, 나머지는 부모 노드 출력 중 첫 번째
            this.edges
              .filter((e) => e.to === nodeId)
              .map((e) => ctx.nodeOutputs.get(e.from))
              .find(Boolean) ??
            { nodeId, data: input };

          const nodeInput: GraphNodeInput = {
            nodeId,
            data: prevOutput.data,
            executionId,
          };

          const output = await node.handler(nodeInput, ctx);
          ctx.nodeOutputs.set(nodeId, output);
          return output;
        }),
      );

      // 마지막 배치 결과를 lastOutput으로 갱신
      if (results.length > 0) {
        lastOutput = results[results.length - 1]!;
      }

      // 다음 큐 계산: 조건 평가 후 실행 가능한 다음 노드
      const nextSet = new Set<string>();
      for (const output of results) {
        const outgoing = def.edges.filter((e) => e.from === output.nodeId);
        for (const edge of outgoing) {
          const condPassed = edge.condition === undefined || edge.condition(output, ctx);
          if (condPassed) {
            nextSet.add(edge.to);
          }
        }
      }

      queue = Array.from(nextSet);
    }

    return {
      executionId,
      finalOutput: lastOutput,
      nodeOutputs: Object.fromEntries(ctx.nodeOutputs),
      totalExecutions,
      durationMs: Date.now() - startMs,
    };
  }
}
