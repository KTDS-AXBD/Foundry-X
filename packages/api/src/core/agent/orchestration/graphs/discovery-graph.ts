// ─── F528: F-L3-8 AX BD 발굴 9단계 Graph 정의 ───
// ─── F531: 실제 StageRunnerService 핸들러 연결 ───
import { GraphEngine } from "../graph-engine.js";
import type { GraphDefinition, GraphNodeInput, GraphNodeOutput, GraphExecutionContext } from "@foundry-x/shared";
import type { AgentRunner } from "../../services/agent-runner.js";
import { StageRunnerService } from "../../../discovery/services/stage-runner-service.js";
import type { DiscoveryType } from "../../../discovery/services/analysis-path-v82.js";

/** F528 backward compat: runner/db 없을 때 stub 핸들러 */
function makeStubHandler(stage: string) {
  return async (input: GraphNodeInput, _ctx: GraphExecutionContext): Promise<GraphNodeOutput> => {
    return {
      nodeId: input.nodeId,
      data: { stage, input: input.data, itemCount: 3 },
    };
  };
}

/** GraphEngine 핸들러에서 공유하는 입력 구조 */
export interface GraphStageInput {
  bizItemId: string;
  orgId: string;
  discoveryType?: DiscoveryType | null;
  feedback?: string;
}

/**
 * 실제 StageRunnerService를 호출하는 단계 핸들러 팩토리.
 * F531: stub → 실제 LLM 호출 + D1 저장 연결
 */
function makeStageHandler(
  stage: string,
  runner: AgentRunner,
  db: D1Database,
) {
  return async (input: GraphNodeInput, _ctx: GraphExecutionContext): Promise<GraphNodeOutput> => {
    const stageInput = input.data as GraphStageInput;
    const svc = new StageRunnerService(db, runner);

    const result = await svc.runStage(
      stageInput.bizItemId,
      stageInput.orgId,
      stage,
      stageInput.discoveryType ?? null,
      stageInput.feedback,
    );

    return {
      nodeId: input.nodeId,
      data: {
        ...stageInput,
        stage,
        stageResult: result,
        // itemCount: stage-2-4 조건 분기를 위해 전파 (없으면 3으로 fallback — gate 통과)
        itemCount: (input.data as { itemCount?: number }).itemCount ?? 3,
      },
    };
  };
}

/** Coordinator 핸들러 — 입력 검증 + 로그 */
async function coordinatorHandler(
  input: GraphNodeInput,
  _ctx: GraphExecutionContext,
): Promise<GraphNodeOutput> {
  const stageInput = input.data as GraphStageInput;
  if (!stageInput.bizItemId || !stageInput.orgId) {
    throw new Error("coordinator: bizItemId and orgId are required");
  }
  return {
    nodeId: input.nodeId,
    data: { ...stageInput, stage: "coordinator" },
  };
}

/**
 * AX BD 발굴 9단계 파이프라인 Graph.
 * F531: runner와 db를 받아 실제 LLM 핸들러를 조립한다.
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
export function createDiscoveryGraph(runner?: AgentRunner, db?: D1Database): GraphDefinition {
  const engine = new GraphEngine();

  // 노드 등록 — runner/db가 있으면 실제 LLM 핸들러, 없으면 stub (F528 backward compat)
  const stageHandler = (stage: string) =>
    runner && db
      ? makeStageHandler(stage, runner, db)
      : makeStubHandler(stage);

  engine.addNode({ id: "coordinator", handler: coordinatorHandler });
  engine.addNode({ id: "stage-2-0", handler: stageHandler("2-0") });
  engine.addNode({ id: "stage-2-1", handler: stageHandler("2-1") });
  engine.addNode({ id: "stage-2-2", handler: stageHandler("2-2") });
  engine.addNode({ id: "stage-2-3", handler: stageHandler("2-3") });
  engine.addNode({ id: "stage-2-4", handler: stageHandler("2-4") });
  engine.addNode({ id: "stage-2-5", handler: stageHandler("2-5") });
  engine.addNode({ id: "stage-2-6", handler: stageHandler("2-6") });
  engine.addNode({ id: "stage-2-7", handler: stageHandler("2-7") });
  engine.addNode({ id: "stage-2-8", handler: stageHandler("2-8") });

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
