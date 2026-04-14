---
id: sprint-287
title: "F534 DiagnosticCollector 실행 경로 훅 삽입"
sprint: 287
f_items: [F534]
req_codes: [FX-REQ-564]
priority: P0
status: in_progress
created_at: 2026-04-14
---

# Sprint 287 Plan — F534 DiagnosticCollector 실행 경로 훅 삽입

## 목표

Dogfood(KOAMI, S286)에서 확증된 갭: 9-stage Graph 실행이 성공해도 `agent_run_metrics` 테이블에
0건 기록됨. 이로 인해 `DiagnosticCollector`가 항상 score=50, rawValue=0을 반환.

`StageRunnerService.runStage()`와 `OrchestrationLoop` 실행 경로에 `DiagnosticCollector.record()`
호출을 삽입하여 각 LLM 호출마다 tokens/duration/success 메트릭이 `agent_run_metrics`에 기록되게 한다.

## 배경 & 현황

### 문제 발생 경로

```
StageRunnerService.runStage()
  └─> this.runner.execute(request)   ← AgentMetricsService 없음 (사각지대)
       └─> ClaudeApiRunner / OpenRouterRunner
             └─> LLM API 호출 → 결과 반환
DiagnosticCollector.collect()        ← agent_run_metrics 0건 → score=50 고착
```

```
OrchestrationLoop.run(graphDiscovery)
  └─> DiscoveryGraphService.runAll()
       └─> GraphEngine.run()
             └─> 각 노드 execute()   ← AgentMetricsService 없음
```

### 기존 메트릭 기록 경로 (스트리밍만)

`AgentStreamHandler.createHooks()` → `AgentMetricsService.createRunning/complete/failRun()`
이 경로는 SSE 스트리밍을 사용하는 경우만 기록됨. Discovery 단계 실행은 비스트리밍.

## 요구사항 (FX-REQ-564)

1. **R1**: `DiagnosticCollector`에 `record()` 메서드 추가
   - `AgentExecutionResult` + `sessionId` + `agentId`를 받아 `agent_run_metrics` INSERT
2. **R2**: `StageRunnerService.runStage()` 실행 경로에 훅 삽입
   - `record()` 호출: 실행 전 running, 완료 후 completed/failed
3. **R3**: `OrchestrationLoop` graph 분기 실행 경로에 훅 삽입
   - `DiscoveryGraphService.runAll()` 래핑 또는 내부 삽입
4. **R4**: 기존 API 시그니처 변경 최소화 (sessionId는 내부 생성 허용)

## 구현 범위 (변경 파일)

| 파일 | 변경 | 이유 |
|------|------|------|
| `packages/api/src/core/agent/services/diagnostic-collector.ts` | `record()` 메서드 추가 | 훅 삽입 공통 진입점 |
| `packages/api/src/core/discovery/services/stage-runner-service.ts` | `DiagnosticCollector` 주입 + `runStage()` 훅 | R2 |
| `packages/api/src/core/agent/services/orchestration-loop.ts` | graph 분기에 훅 삽입 | R3 |
| `packages/api/src/core/discovery/services/discovery-graph-service.ts` | `DiagnosticCollector` 주입 + 결과 기록 | R3 보조 |

## 테스트 계획

- `diagnostic-collector.test.ts`: `record()` 메서드 단위 테스트
- `stage-runner-service.test.ts`: 메트릭 기록 확인 (in-memory D1)
- 커버리지 대상: record() → INSERT → collect() → score > 50

## 성공 기준

- `runStage()` 1회 실행 후 `agent_run_metrics` 1건 이상 INSERT 됨
- `DiagnosticCollector.collect()` 반환값의 `scores` 중 rawValue > 0인 축 ≥ 2개
- 기존 `StageRunnerService` / `OrchestrationLoop` 테스트 PASS 유지
