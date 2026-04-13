// ─── F528: F-L3-8 AX BD 발굴 9단계 Graph 정의 ───
import { GraphEngine } from "../graph-engine.js";
import type { GraphDefinition, GraphNodeInput, GraphNodeOutput, GraphExecutionContext } from "@foundry-x/shared";

/** 발굴 단계 핸들러 팩토리 — stub 구현 (실제 에이전트 연동은 F529+) */
function makeStageHandler(stage: string) {
  return async (input: GraphNodeInput, _ctx: GraphExecutionContext): Promise<GraphNodeOutput> => {
    return {
      nodeId: input.nodeId,
      data: { stage, input: input.data, itemCount: 3 },
    };
  };
}

/** Coordinator 핸들러 */
async function coordinatorHandler(
  input: GraphNodeInput,
  _ctx: GraphExecutionContext,
): Promise<GraphNodeOutput> {
  return {
    nodeId: input.nodeId,
    data: { stage: "coordinator", input: input.data },
  };
}

/**
 * AX BD 발굴 9단계 파이프라인 Graph.
 *
 * 구조:
 * coordinator → 2-0
 * 2-0 → 2-1, 2-2 (병렬)
 * 2-1, 2-2 → 2-3
 * 2-3 → 2-4
 * 2-4 → 2-5 (itemCount >= 3) | 2-3 (itemCount < 3, 보완 루프)
 * 2-5 → 2-6, 2-7 (병렬)
 * 2-6, 2-7 → 2-8
 */
export function createDiscoveryGraph(): GraphDefinition {
  const engine = new GraphEngine();

  // 노드 등록
  engine.addNode({ id: "coordinator", handler: coordinatorHandler });
  engine.addNode({ id: "stage-2-0", handler: makeStageHandler("2-0") });
  engine.addNode({ id: "stage-2-1", handler: makeStageHandler("2-1") });
  engine.addNode({ id: "stage-2-2", handler: makeStageHandler("2-2") });
  engine.addNode({ id: "stage-2-3", handler: makeStageHandler("2-3") });
  engine.addNode({ id: "stage-2-4", handler: makeStageHandler("2-4") });
  engine.addNode({ id: "stage-2-5", handler: makeStageHandler("2-5") });
  engine.addNode({ id: "stage-2-6", handler: makeStageHandler("2-6") });
  engine.addNode({ id: "stage-2-7", handler: makeStageHandler("2-7") });
  engine.addNode({ id: "stage-2-8", handler: makeStageHandler("2-8") });

  // 순차 엣지
  engine.addEdge({ from: "coordinator", to: "stage-2-0" });

  // 병렬 실행: 2-0 → 2-1, 2-2
  engine.addEdge({ from: "stage-2-0", to: "stage-2-1" });
  engine.addEdge({ from: "stage-2-0", to: "stage-2-2" });

  // 합류: 2-1, 2-2 → 2-3
  engine.addEdge({ from: "stage-2-1", to: "stage-2-3" });
  engine.addEdge({ from: "stage-2-2", to: "stage-2-3" });

  // 순차: 2-3 → 2-4
  engine.addEdge({ from: "stage-2-3", to: "stage-2-4" });

  // 조건부 분기: gate — 아이템 도출 결과 충분 여부
  engine.addEdge({
    from: "stage-2-4",
    to: "stage-2-5",
    condition: (out) => {
      const d = out.data as { itemCount?: number };
      return (d.itemCount ?? 0) >= 3;
    },
  });
  engine.addEdge({
    from: "stage-2-4",
    to: "stage-2-3", // 보완 루프
    condition: (out) => {
      const d = out.data as { itemCount?: number };
      return (d.itemCount ?? 0) < 3;
    },
  });

  // 병렬 실행: 2-5 → 2-6, 2-7
  engine.addEdge({ from: "stage-2-5", to: "stage-2-6" });
  engine.addEdge({ from: "stage-2-5", to: "stage-2-7" });

  // 합류: 2-6, 2-7 → 2-8
  engine.addEdge({ from: "stage-2-6", to: "stage-2-8" });
  engine.addEdge({ from: "stage-2-7", to: "stage-2-8" });

  engine.setEntryPoint("coordinator");
  engine.setMaxExecutions(50);

  return engine.build();
}
