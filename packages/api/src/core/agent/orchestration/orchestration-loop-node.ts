// ─── F528: F-L3-7 OrchestrationLoopNode — 기존 O-G-D Loop 래핑 ───
import type { GraphNode, GraphNodeInput, GraphNodeOutput, LoopMode, AgentAdapter, ConvergenceCriteria } from "@foundry-x/shared";
import type { OrchestrationLoop } from "../services/orchestration-loop.js";

export interface OrchestrationLoopNodeOptions {
  taskId: string;
  tenantId: string;
  loopMode?: LoopMode;
  agents?: AgentAdapter[];
  convergence?: Partial<ConvergenceCriteria>;
}

/**
 * 기존 OrchestrationLoop를 GraphEngine 노드로 래핑한다.
 * 기존 OrchestrationLoop 코드 수정 없음.
 */
export function createOrchestrationLoopNode(
  loop: OrchestrationLoop,
  opts: OrchestrationLoopNodeOptions,
): GraphNode {
  const nodeId = `orchestration-loop-${opts.taskId}`;

  return {
    id: nodeId,
    handler: async (_input: GraphNodeInput, _ctx: unknown): Promise<GraphNodeOutput> => {
      const outcome = await loop.run({
        taskId: opts.taskId,
        tenantId: opts.tenantId,
        loopMode: opts.loopMode ?? "retry",
        agents: opts.agents ?? [],
        convergence: opts.convergence,
      });
      return { nodeId, data: outcome };
    },
  };
}
