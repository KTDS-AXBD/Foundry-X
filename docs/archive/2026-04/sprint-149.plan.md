---
code: FX-PLAN-S149
title: "Sprint 149 — F334 Hook Layer + Event Bus"
version: "1.0"
status: Active
category: PLAN
feature: F334
sprint: 149
phase: "Phase 14 — Agent Orchestration Infrastructure"
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
req: FX-REQ-326
---

# Sprint 149 Plan — F334 Hook Layer + Event Bus

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F334 Hook Layer + Event Bus |
| Sprint | 149 |
| Phase | Phase 14 — Agent Orchestration Infrastructure (Foundation v2) |
| REQ | FX-REQ-326 (P0) |
| 목표 | HookResultProcessor + TaskEvent 타입 + Event Bus(이벤트 정규화+라우팅) + FEEDBACK_LOOP_TRIGGERS 매핑 + D1 execution_events + ~45 테스트 |
| LOC 추정 | ~1090 |
| 근거 | FX-Unified-Integration-Plan.md §4.3 (GAN R2 CONDITIONAL_PASS) |
| 선행 | F333 ✅ (Sprint 148 — TaskState Machine) |

| 관점 | 내용 |
|------|------|
| **Problem** | Hook 결과(shell exit code)가 TaskState 전이와 연결되지 않아, 에러 감지→자동 복구 파이프라인 불가 |
| **Solution** | HookResultProcessor로 exit code→TaskEvent 변환 + Event Bus가 이기종 이벤트를 정규화하여 상태 전이 자동 트리거 |
| **Function UX Effect** | Hook 실패 시 FEEDBACK_LOOP 자동 진입 + execution_events 테이블에 모든 이벤트 기록 → 관측성 확보 |
| **Core Value** | Phase 14 Layer 1+2 — Hook(마이크로)과 State Machine(매크로)를 Event Bus로 연결하는 핵심 접착 레이어 |

## 1. 배경 및 목적

### 1.1 Phase 14 진행 상황

FX-Unified-Integration-Plan.md의 2계층 루프 아키텍처에서 Layer 0가 완료되었고, **Layer 1(Hook) + Layer 2(Event Bus)**를 구현한다.

```
[Layer 0] TaskState 정의 ✅ (Sprint 148, F333)
    ↓
[Layer 1] Hook System ← 이번 Sprint
    ↓
[Layer 2] Event Bus ← 이번 Sprint
    ↓
[Layer 3] Orchestration Loop (Sprint 150, F335)
```

### 1.2 F334 목표

- **HookResultProcessor**: Shell exit code + stderr → TaskEvent 변환 서비스
- **TaskEvent 타입 체계**: 5종 이벤트(Hook/CI/Review/Discriminator/Sync) 통합 shape
- **Event Bus**: 이벤트 정규화 + 구독/발행 + FEEDBACK_LOOP_TRIGGERS 매핑 기반 상태 전이 트리거
- **D1 migration**: `execution_events` 테이블 — 모든 이벤트 텔레메트리 기록
- **GAN 잔여이슈 해결**: N2(Event 소스 정규화), N6(Hook 환경 변수 전달)

### 1.3 관련 문서

- PRD: [[FX-Unified-Integration-Plan]] §3.2 (2계층 루프 아키텍처), §4.3 (Foundation v2)
- 선행: [[FX-PLAN-S148]] — F333 TaskState Machine
- REQ: FX-REQ-326

## 2. 범위

### 2.1 In Scope

- [ ] TaskEvent 타입 정의 (shared 패키지)
- [ ] EventBus 서비스 구현 (발행/구독/정규화)
- [ ] HookResultProcessor 서비스 (exit code → TaskEvent)
- [ ] FEEDBACK_LOOP_TRIGGERS 기반 자동 전이 연결
- [ ] D1 migration: execution_events 테이블
- [ ] execution_events CRUD 서비스
- [ ] API route: execution events 조회
- [ ] 단위 테스트 ~45건

### 2.2 Out of Scope

- Orchestration Loop (Sprint 150, F335)
- AgentAdapter 인터페이스 (Sprint 151, F336)
- 대시보드 UI (Sprint 152, F337)
- 실제 .claude/hooks/ shell script 수정 (기존 hooks는 그대로 유지)

## 3. 요구사항

### 3.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| FR-01 | TaskEvent 타입 5종 (HookEvent, CIEvent, ReviewEvent, DiscriminatorEvent, SyncEvent) 통합 shape 정의 | High | Pending |
| FR-02 | EventBus: emit/subscribe 패턴, 이벤트 정규화, 다중 구독자 지원 | High | Pending |
| FR-03 | HookResultProcessor: exit code=0→info, exit code≠0→error 변환 + stderr payload | High | Pending |
| FR-04 | FEEDBACK_LOOP_TRIGGERS 참조하여 해당 TaskState에서 특정 이벤트 소스 발생 시 자동 전이 | High | Pending |
| FR-05 | D1 execution_events 테이블: 모든 TaskEvent 영구 기록 | High | Pending |
| FR-06 | API GET /execution-events: 태스크별/소스별 이벤트 이력 조회 | Medium | Pending |
| FR-07 | EventBus→TaskStateService 연동: 이벤트 기반 상태 전이 트리거 | High | Pending |

### 3.2 비기능 요구사항

| 카테고리 | 기준 | 측정 방법 |
|---------|------|---------|
| 성능 | EventBus emit→처리 < 10ms (in-process) | Vitest 벤치마크 |
| 하위호환 | 기존 API 89개 route 무변경 | turbo typecheck + test |
| 테스트 | 커버리지 80%+ | vitest --coverage |

## 4. 성공 기준

### 4.1 Definition of Done

- [ ] TaskEvent 타입 5종 정의 (shared)
- [ ] EventBus 서비스 구현 + 테스트
- [ ] HookResultProcessor 서비스 + 테스트
- [ ] FEEDBACK_LOOP_TRIGGERS 자동 전이 동작 확인
- [ ] D1 execution_events migration 적용
- [ ] API route 구현 + 테스트
- [ ] turbo typecheck 통과
- [ ] turbo test 통과
- [ ] 코드 리뷰 완료

### 4.2 품질 기준

- [ ] 테스트 ~45건 통과
- [ ] Zero lint errors
- [ ] Zero typecheck errors
- [ ] 기존 테스트 회귀 없음

## 5. 리스크 및 대응

| 리스크 | 영향 | 가능성 | 대응 |
|--------|------|--------|------|
| EventBus 메모리 누수 (구독 해제 누락) | Medium | Medium | WeakRef 기반 구독 또는 dispose 패턴 강제 |
| HookResultProcessor가 다양한 exit code 케이스 미처리 | Low | Low | 표준 exit code 매핑 테이블 정의 (0=OK, 1=Error, 2=Warning) |
| 기존 TransitionGuard와 EventBus 간 race condition | Medium | Low | EventBus→TransitionGuard 호출은 동기 순차 처리 |

## 6. 아키텍처

### 6.1 프로젝트 레벨

- **Level**: Enterprise (모노리포 + Cloudflare Workers + D1)
- **패턴**: 서비스 레이어 (route → schema → service → D1)

### 6.2 핵심 아키텍처 결정

| 결정 | 선택 | 근거 |
|------|------|------|
| Event Bus 구현 | In-process EventEmitter 패턴 (TS) | Workers 환경에서 외부 MQ 불가, 단일 요청 스코프 |
| 이벤트 저장 | D1 execution_events 테이블 | 기존 D1 인프라 활용, 추가 서비스 불필요 |
| Hook 결과 변환 | HookResultProcessor (독립 서비스) | Hook Layer↔Event Bus 경계 명확화 |
| 자동 전이 | EventBus 구독자가 TaskStateService.transition() 호출 | 느슨한 결합, 테스트 용이 |

### 6.3 데이터 흐름

```
Hook Script (exit code + stderr)
        │
        ▼
HookResultProcessor
  ├─ exitCode === 0 → TaskEvent { source:'hook', severity:'info' }
  └─ exitCode !== 0 → TaskEvent { source:'hook', severity:'error', payload: stderr }
        │
        ▼
EventBus.emit(event)
  ├─ 구독자 1: ExecutionEventService.record(event) → D1 execution_events
  └─ 구독자 2: TransitionTrigger
          │
          ▼
     FEEDBACK_LOOP_TRIGGERS[currentState]에 event.source 포함?
       ├─ Yes → TaskStateService.transition(taskId, FEEDBACK_LOOP)
       └─ No  → skip (텔레메트리만 기록)
```

## 7. 구현 계획

### 7.1 파일 목록

| # | 파일 | 패키지 | 내용 | LOC 추정 |
|---|------|--------|------|---------|
| 1 | `packages/shared/src/task-event.ts` | shared | TaskEvent 타입 5종 + EventSeverity | ~80 |
| 2 | `packages/api/src/services/event-bus.ts` | api | EventBus 클래스 (emit/subscribe/unsubscribe) | ~120 |
| 3 | `packages/api/src/services/hook-result-processor.ts` | api | Shell exit code → TaskEvent 변환 | ~80 |
| 4 | `packages/api/src/services/execution-event-service.ts` | api | D1 execution_events CRUD | ~120 |
| 5 | `packages/api/src/services/transition-trigger.ts` | api | EventBus 구독 → FEEDBACK_LOOP 자동 전이 | ~100 |
| 6 | `packages/api/src/schemas/execution-event.ts` | api | Zod 스키마 | ~60 |
| 7 | `packages/api/src/routes/execution-events.ts` | api | GET /execution-events API | ~80 |
| 8 | `packages/api/src/db/migrations/0096_execution_events.sql` | api | D1 테이블 | ~30 |
| 9 | `packages/api/src/__tests__/event-bus.test.ts` | api | EventBus 단위 테스트 | ~120 |
| 10 | `packages/api/src/__tests__/hook-result-processor.test.ts` | api | HookResultProcessor 테스트 | ~80 |
| 11 | `packages/api/src/__tests__/transition-trigger.test.ts` | api | 자동 전이 통합 테스트 | ~100 |
| 12 | `packages/api/src/__tests__/execution-event-service.test.ts` | api | CRUD 테스트 | ~80 |
| | **합계** | | | **~1050** |

### 7.2 구현 순서

1. **shared 타입** (task-event.ts) — 나머지 모두의 기반
2. **EventBus** — 이벤트 인프라
3. **HookResultProcessor** — Hook→Event 변환
4. **D1 migration + ExecutionEventService** — 저장
5. **TransitionTrigger** — EventBus→TaskState 연동
6. **API route + schema** — 조회 엔드포인트
7. **테스트** — 각 단계별 테스트 병행

## 8. 다음 단계

1. [ ] Design 문서 작성 (`sprint-149.design.md`)
2. [ ] 구현
3. [ ] Gap Analysis
4. [ ] 완료 보고서

## Version History

| 버전 | 날짜 | 변경 | 작성자 |
|------|------|------|--------|
| 1.0 | 2026-04-05 | 초안 | Claude Opus 4.6 |
