# Sprint 284 Design — F531 발굴 Graph 실행 연동

> **Sprint**: 284 | **F-item**: F531 | **REQ**: FX-REQ-561
> **Date**: 2026-04-13

## §1 아키텍처 개요

```
[현재]
route → StageRunnerService.runStage() → AgentRunner(LLM) → D1
                                  ↑
createDiscoveryGraph() [stub, 미연결]

[F531 목표]
route → StageRunnerService.runStage()  ← (기존 경로 유지)
      → DiscoveryGraphService.runAll() → GraphEngine → 각 노드: StageRunnerService.runStage() → D1
                                        ↑
createDiscoveryGraph(runner, db) [실제 핸들러]

confirmStage(graphMode=true) → GraphEngine 다음 노드 실행
OrchestrationLoop graphMode → DiscoveryGraphService 실행
```

## §2 컴포넌트 설계

### 2-1. `createDiscoveryGraph(runner, db)` 수정

**파일**: `packages/api/src/core/agent/orchestration/graphs/discovery-graph.ts`

변경:
- `makeStageHandler(stage)` stub → 실제 `StageRunnerService.runStage()` 호출
- `makeStubHandler()` fallback — runner/db 미제공 시 F528 backward compat 유지
- 함수 시그니처: `createDiscoveryGraph(runner?: AgentRunner, db?: D1Database): GraphDefinition` (optional params)
- 각 핸들러에서 `GraphNodeInput.data`에서 `{ bizItemId, orgId, discoveryType }` 추출
- coordinator 핸들러: 입력 데이터 검증 + 로그
- stage 핸들러: `StageRunnerService.runStage()` 호출 → 결과를 `GraphNodeOutput.data`에 포함

```typescript
// 핸들러 팩토리 시그니처
function makeStageHandler(
  stage: string,
  runner: AgentRunner,
  db: D1Database,
): GraphNodeHandler {
  return async (input, ctx) => {
    const { bizItemId, orgId, discoveryType, feedback } = input.data as GraphStageInput;
    const svc = new StageRunnerService(db, runner);
    const result = await svc.runStage(bizItemId, orgId, stage, discoveryType ?? null, feedback);
    return { nodeId: input.nodeId, data: { ...result, bizItemId, orgId } };
  };
}
```

### 2-2. `DiscoveryGraphService` 신규

**파일**: `packages/api/src/core/discovery/services/discovery-graph-service.ts`

```typescript
export interface GraphStageInput {
  bizItemId: string;
  orgId: string;
  discoveryType?: DiscoveryType | null;
  feedback?: string;
}

export class DiscoveryGraphService {
  constructor(
    private runner: AgentRunner,
    private db: D1Database,
    private sessionId: string,
    private apiKey: string,
  ) {}

  /** 전체 9단계 파이프라인을 GraphEngine으로 실행 */
  async runAll(input: GraphStageInput): Promise<GraphRunResult> {
    const graph = createDiscoveryGraph(this.runner, this.db);
    const engine = buildEngineFromDefinition(graph); // GraphEngine을 definition에서 재구성
    return engine.run(input, this.sessionId, this.apiKey, this.db);
  }

  /** 특정 단계부터 재개 — BFS로 reachable nodes 탐색 후 서브그래프 구성 */
  async runFrom(stage: string, input: GraphStageInput): Promise<GraphRunResult> {
    const reachable = findReachableNodes(graph, stage); // BFS 헬퍼
    // reachable nodes만으로 서브그래프 구성 → engine.run()
  }

  /** 내부: Definition에서 GraphEngine 구성 */
  private buildEngine(graph: GraphDefinition): GraphEngine { ... }
}

/** BFS로 entryPoint에서 도달 가능한 노드 집합 반환 */
function findReachableNodes(graph: GraphDefinition, entryPoint: string): Set<string> { ... }
```

### 2-3. `StageRunnerService.confirmStage()` Graph 분기

**파일**: `packages/api/src/core/discovery/services/stage-runner-service.ts`

```typescript
async confirmStage(
  bizItemId, orgId, stage, viabilityAnswer,
  feedback?,
  options?: { graphMode?: boolean; runner?: AgentRunner; sessionId?: string; apiKey?: string }
): Promise<StageConfirmResult>
```

- `options.graphMode === true` && `viabilityAnswer !== 'stop'`:
  - 다음 단계를 `DiscoveryGraphService`로 실행
  - 결과를 `StageConfirmResult`에 포함

### 2-4. `OrchestrationLoop` Graph 모드

**파일**: `packages/api/src/core/agent/services/orchestration-loop.ts`

`LoopStartParamsExtended extends LoopStartParams`로 확장:
- `graphDiscovery?: GraphStageInput` — 설정 시 루프 전체를 `DiscoveryGraphService.runAll()` 경로로 분기
- `graphRunner?: AgentRunner`, `graphApiKey?: string` — Graph 실행 시 필요한 추가 파라미터
- 기존 retry/adversarial/fix 모드는 유지

## §3 타입 변경

`@foundry-x/shared`에 `GraphStageInput` export 불필요 — api 패키지 내부 타입으로 처리

## §4 테스트 계약 (TDD Red Target)

| # | 테스트 | 파일 |
|---|--------|------|
| 1 | `createDiscoveryGraph(runner,db)` - stage-2-1 노드 실행 시 `StageRunnerService.runStage('2-1', ...)` 호출됨 | `__tests__/discovery-graph-integration.test.ts` |
| 2 | `DiscoveryGraphService.runAll()` - coordinator 실행 후 stage-2-0 실행됨 (순서 검증) | `__tests__/discovery-graph-service.test.ts` |
| 3 | `DiscoveryGraphService.runAll()` - 각 노드 결과가 `nodeOutputs`에 저장됨 | `__tests__/discovery-graph-service.test.ts` |
| 4 | `StageRunnerService.confirmStage(graphMode=true)` - `nextStage`가 GraphEngine으로 실행됨 | `__tests__/stage-runner-service.test.ts` |
| 5 | `OrchestrationLoop` - `graphDiscovery` 입력 시 `DiscoveryGraphService.runAll()` 호출됨 | `__tests__/orchestration-loop.test.ts` |

## §5 파일 매핑

| 파일 | 변경 유형 | 주요 변경 내용 |
|------|-----------|---------------|
| `packages/api/src/core/agent/orchestration/graphs/discovery-graph.ts` | 수정 | stub 핸들러 → 실제 StageRunnerService 호출, 함수 시그니처 변경 |
| `packages/api/src/core/discovery/services/discovery-graph-service.ts` | 신규 | DiscoveryGraphService 클래스 |
| `packages/api/src/core/discovery/services/stage-runner-service.ts` | 수정 | confirmStage options 추가 (graphMode) |
| `packages/api/src/core/agent/services/orchestration-loop.ts` | 수정 | LoopStartParams graphDiscovery 분기 |
| `packages/api/src/__tests__/discovery-graph-integration.test.ts` | 신규 | TDD Red test 1 |
| `packages/api/src/__tests__/discovery-graph-service.test.ts` | 신규 | TDD Red test 2,3 |
| `packages/api/src/__tests__/stage-runner-service.test.ts` | 수정 | TDD Red test 4 추가 |
| `packages/api/src/__tests__/orchestration-loop.test.ts` | 수정 | TDD Red test 5 추가 |
