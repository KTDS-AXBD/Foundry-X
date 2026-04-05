---
code: FX-PLAN-S150
title: "Sprint 150 — F335 Orchestration Loop (Phase 14 Foundation v3)"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 150
feature: F335
phase: 14
---

# Sprint 150 Plan — F335 Orchestration Loop

> **Phase 14 Foundation v3** — 전체 사이클 최초 동작

## 1. 목표

F333(TaskState Machine) + F334(Hook+EventBus)를 기반으로, **OrchestrationLoop**를 구현하여 이벤트 기반 피드백 루프가 실제로 동작하는 전체 사이클을 완성한다.

### 1.1 핵심 산출물

| # | 산출물 | 설명 | LOC 추정 |
|---|--------|------|---------|
| 1 | OrchestrationLoop 서비스 | retry + adversarial + fix 3모드 루프 엔진 | ~400 |
| 2 | FeedbackLoopContext | 루프 진입/탈출 상태 관리 + maxRounds | ~150 |
| 3 | AgentAdapter 인터페이스 | provider + role + handleFeedback() | ~100 |
| 4 | 텔레메트리 수집 미들웨어 | Event Bus 구독 → D1 execution_events 기록 | ~200 |
| 5 | E2E 통합 테스트 | Hook→Event→Transition→Loop→Telemetry 전체 흐름 | ~300 |
| **합계** | | | **~1150** |

### 1.2 GAN 잔여이슈 해결

| 이슈 | 내용 | 해결 방법 |
|------|------|----------|
| N1 | FeedbackContext 상세 정의 부재 | FeedbackLoopContext 타입 구현 |
| N4 | Guard 서비스 확장 필요 | TransitionGuard에 convergence 가드 등록 |
| N5 | 수렴 기준 미정의 | maxRounds(3) + qualityScore 임계값(0.7) 기반 수렴 판정 |

## 2. 의존성

| 의존 | 상태 | 설명 |
|------|------|------|
| F333 TaskState Machine | ✅ (Sprint 148) | task-state.ts, TaskStateService, TransitionGuard |
| F334 Hook + EventBus | ✅ (Sprint 149) | event-bus.ts, HookResultProcessor, TaskEvent |
| D1 0095_task_states | ✅ 적용됨 | task_states, task_state_history 테이블 |
| D1 0096_execution_events | ✅ 적용됨 | execution_events 테이블 |

## 3. 구현 계획

### Phase A: shared 타입 확장 (~250 LOC)

1. `packages/shared/src/orchestration.ts` 신규
   - `LoopMode` 타입 (`retry` | `adversarial` | `fix`)
   - `FeedbackLoopContext` 인터페이스
   - `LoopOutcome` 타입 (resolved | exhausted | escalated)
   - `AgentAdapter` 인터페이스
   - `ConvergenceCriteria` 인터페이스
2. `packages/shared/src/index.ts` export 추가

### Phase B: OrchestrationLoop 서비스 (~400 LOC)

1. `packages/api/src/services/orchestration-loop.ts` 신규
   - `OrchestrationLoop` 클래스
   - 3모드 분기: retry / adversarial / fix
   - round 추적 + convergence 판정
   - EventBus 이벤트 발행 (루프 시작/종료/라운드 완료)
2. `packages/api/src/services/feedback-loop-context.ts` 신규
   - FeedbackLoopContext 생성/갱신/완료 관리
   - D1 persistence (loop_contexts 테이블)

### Phase C: 텔레메트리 미들웨어 (~200 LOC)

1. `packages/api/src/services/telemetry-collector.ts` 신규
   - EventBus '*' 구독 → execution_events D1 기록
   - 라운드별 비용/품질 집계
2. API 라우트: `GET /telemetry/events` 조회

### Phase D: API 라우트 확장 (~150 LOC)

1. `packages/api/src/routes/orchestration.ts` 신규
   - `POST /task-states/:taskId/loop` — 루프 시작
   - `GET /task-states/:taskId/loop-history` — 루프 이력 조회
2. 스키마: `packages/api/src/schemas/orchestration.ts`

### Phase E: D1 마이그레이션 (~50 LOC)

1. `0097_loop_contexts.sql` — FeedbackLoopContext 저장 테이블

### Phase F: 통합 테스트 (~300 LOC)

1. `orchestration-loop.test.ts` — 3모드 단위 테스트
2. `telemetry-collector.test.ts` — 이벤트 수집 테스트
3. `orchestration-e2e.test.ts` — Hook→Event→Transition→Loop→Telemetry 전체 흐름

## 4. 변경 파일 요약

### 신규 파일
| 파일 | 용도 |
|------|------|
| `packages/shared/src/orchestration.ts` | 오케스트레이션 타입 |
| `packages/api/src/services/orchestration-loop.ts` | OrchestrationLoop 엔진 |
| `packages/api/src/services/feedback-loop-context.ts` | 루프 컨텍스트 관리 |
| `packages/api/src/services/telemetry-collector.ts` | 텔레메트리 수집 |
| `packages/api/src/routes/orchestration.ts` | 오케스트레이션 API |
| `packages/api/src/schemas/orchestration.ts` | Zod 스키마 |
| `packages/api/src/db/migrations/0097_loop_contexts.sql` | D1 마이그레이션 |
| `packages/api/src/__tests__/orchestration-loop.test.ts` | 루프 단위 테스트 |
| `packages/api/src/__tests__/telemetry-collector.test.ts` | 텔레메트리 테스트 |
| `packages/api/src/__tests__/orchestration-e2e.test.ts` | E2E 통합 테스트 |

### 수정 파일
| 파일 | 변경 |
|------|------|
| `packages/shared/src/index.ts` | orchestration 타입 export 추가 |
| `packages/api/src/app.ts` | orchestration 라우트 등록 |
| `packages/api/src/services/transition-guard.ts` | convergence 가드 등록 |

## 5. 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| AgentAdapter에 실제 에이전트 연동은 F336 범위 | 낮음 | F335에서는 인터페이스 + MockAdapter만 구현 |
| D1 마이그레이션 번호 충돌 (병렬 Sprint) | 중간 | Sprint 150은 단독이므로 0097 안전 |

## 6. 완료 기준

- [ ] OrchestrationLoop 3모드(retry/adversarial/fix) 동작
- [ ] FeedbackLoopContext 진입/탈출 정상 동작
- [ ] 텔레메트리 수집 → D1 기록 확인
- [ ] 통합 테스트 전체 통과
- [ ] typecheck + lint 0 error
