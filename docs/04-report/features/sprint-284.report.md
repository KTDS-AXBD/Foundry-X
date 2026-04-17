# Sprint 284 Report — F531 발굴 Graph 실행 연동

> **Sprint**: 284 | **F-item**: F531 | **REQ**: FX-REQ-561 | **Date**: 2026-04-13
> **Match Rate**: 95% | **Tests**: 41 GREEN | **TypeCheck**: PASS

## §1 완료 요약

Phase 42 HyperFX Deep Integration 첫 번째 Feature.
`createDiscoveryGraph()` stub 핸들러를 실제 `StageRunnerService` LLM 호출로 교체하고,
`DiscoveryGraphService`를 신규 생성하여 9단계 발굴 파이프라인이 GraphEngine으로 실행되도록 통합했어요.

## §2 구현 내용

### 주요 변경

| 파일 | 변경 | 내용 |
|------|------|------|
| `discovery-graph.ts` | 수정 | `createDiscoveryGraph(runner?, db?)` — stub → 실제 LLM 핸들러, F528 backward compat 유지 |
| `discovery-graph-service.ts` | **신규** | `DiscoveryGraphService.runAll()` + `runFrom()` — Graph 기반 파이프라인 오케스트레이터 |
| `stage-runner-service.ts` | 수정 | `confirmStage(options?: ConfirmStageOptions)` — graphMode 분기 추가 |
| `orchestration-loop.ts` | 수정 | `LoopStartParamsExtended` + graphDiscovery 분기 |
| `discovery-criteria.ts` | 수정 | `update()` UPSERT 변경 — 행 미존재 시 자동 생성 (side effect 수정) |

### 아키텍처 변화

```
[이전]
StageRunnerService.runStage() → AgentRunner(LLM) → D1
createDiscoveryGraph() [stub, 미연결]

[이후]
createDiscoveryGraph(runner, db) → makeStageHandler → StageRunnerService.runStage() → LLM → D1
DiscoveryGraphService.runAll()  → GraphEngine → 각 노드 → LLM → D1
confirmStage(graphMode=true)   → DiscoveryGraphService.runFrom(nextStage)
OrchestrationLoop(graphDiscovery) → DiscoveryGraphService.runAll()
```

## §3 테스트 결과

| 테스트 | 파일 | 결과 |
|--------|------|------|
| test 1: runner.execute() 호출 | discovery-graph-integration.test.ts | ✅ GREEN |
| test 2: coordinator→stage-2-0 순서 | discovery-graph-integration.test.ts | ✅ GREEN |
| test 3: runAll() 실행 순서 | discovery-graph-service.test.ts | ✅ GREEN |
| test 4: D1 bd_artifacts 저장 | discovery-graph-service.test.ts | ✅ GREEN |
| test 5: confirmStage graphMode=true | stage-runner-service.test.ts | ✅ GREEN |
| test 6: confirmStage graphMode stop | stage-runner-service.test.ts | ✅ GREEN |
| test 7: OrchestrationLoop graphDiscovery | orchestration-loop.test.ts | ✅ GREEN |
| 기존 전체 (F528/F480/F486/F494/F335) | 여러 파일 | ✅ 회귀 없음 |

**총 41 tests PASS**

## §4 Gap Analysis

- **Match Rate**: 95% (목표 90% 초과)
- **차이점**: `createDiscoveryGraph` 파라미터 optional (F528 backward compat 목적), 테스트 assertion이 설계보다 강함 (D1 레벨 검증)
- **누락**: 없음

## §5 설계 역동기화 (Design → 실제)

1. `createDiscoveryGraph` 시그니처: required → optional (stub fallback 추가 이유 기록)
2. test 3 assertion: nodeOutputs → D1 bd_artifacts 직접 검증 (더 강한 테스트)
3. `DiscoveryCriteriaService.update()` UPSERT 변경: graphMode 테스트 중 발견된 side effect 수정

## §6 다음 Sprint (285)

F532: 에이전트 스트리밍 E2E — WebSocket/SSE 스트리밍 레이어 end-to-end 검증
- F531에서 만든 Graph 실행을 WebSocket 이벤트로 스트리밍
- Playwright E2E + 연결 끊김/재접속 복원력 테스트
