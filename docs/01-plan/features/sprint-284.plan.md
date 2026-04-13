# Sprint 284 Plan — F531 발굴 Graph 실행 연동

> **Sprint**: 284 | **F-item**: F531 | **REQ**: FX-REQ-561 | **Priority**: P0
> **Date**: 2026-04-13

## §1 목적

`createDiscoveryGraph()`를 `StageRunnerService`와 연결하여 9단계 발굴 파이프라인이
GraphEngine으로 실행되도록 통합한다.

현재 상태:
- `createDiscoveryGraph()`: stub 핸들러 (데이터 미처리, LLM 미연동)
- `StageRunnerService.runStage()`: 개별 단계 LLM 실행 + D1 저장 동작 중
- 두 시스템이 독립적으로 존재 — 연결 없음

목표 상태:
- `createDiscoveryGraph(runner, db)`: 실제 LLM 핸들러로 교체
- `StageRunnerService` + GraphEngine이 협력하는 `DiscoveryGraphService` 신규 생성
- `confirmStage`에 Graph 분기 옵션 추가
- OrchestrationLoop에서 Graph 모드 실행 가능

## §2 범위

| 변경 | 파일 | 타입 |
|------|------|------|
| `createDiscoveryGraph(runner, db)` 실제 핸들러 | `discovery-graph.ts` | 수정 |
| `DiscoveryGraphService` 신규 | `discovery-graph-service.ts` | 신규 |
| `StageRunnerService.confirmStage` Graph 분기 | `stage-runner-service.ts` | 수정 |
| OrchestrationLoop Graph 모드 | `orchestration-loop.ts` | 수정 |
| F531 통합 테스트 | `__tests__/` | 신규 |

## §3 요구사항 (FX-REQ-561)

1. `createDiscoveryGraph()`를 `StageRunnerService`와 연결 (핸들러 교체)
2. GraphEngine 실행 시 각 노드가 실제 LLM 호출
3. 각 노드 결과를 D1 `bd_artifacts`에 저장
4. `confirmStage` → GraphEngine 다음 노드 실행 위임
5. OrchestrationLoop에 Graph 분기 추가

## §4 TDD 계획 (Red Phase 대상)

```
test 1: createDiscoveryGraph(runner, db) - 실제 핸들러로 stage-2-1 실행 시 runStage 호출됨
test 2: DiscoveryGraphService.runAll() - coordinator~stage-2-8 순서 실행
test 3: DiscoveryGraphService.runAll() - 각 stage 결과 D1 저장 확인
test 4: StageRunnerService.confirmStage() graphMode=true - 다음 노드 GraphEngine 실행
test 5: OrchestrationLoop - graphMode에서 createDiscoveryGraph 실행 경로
```

## §5 완료 기준

- [ ] vitest 5건 GREEN
- [ ] typecheck PASS
- [ ] Match Rate ≥ 90%
