---
code: FX-PLAN-S148
title: "Sprint 148 — F333 TaskState Machine"
version: "1.0"
status: Active
category: PLAN
feature: F333
sprint: 148
phase: "Phase 14 — Agent Orchestration Infrastructure"
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
req: FX-REQ-325
---

# Sprint 148 Plan — F333 TaskState Machine

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F333 TaskState Machine |
| Sprint | 148 |
| Phase | Phase 14 — Agent Orchestration Infrastructure (Foundation v1) |
| REQ | FX-REQ-325 (P0) |
| 목표 | TaskState enum(10상태) + D1 task_states + API 2건 + TransitionGuard + ~50 단위 테스트 |
| LOC 추정 | ~620 |
| 근거 | FX-Unified-Integration-Plan.md (GAN R2 CONDITIONAL_PASS, Score 0.78) |

| 관점 | 내용 |
|------|------|
| **Problem** | 에이전트 태스크의 상태 추적 인프라가 없어 오케스트레이션 자동화 불가 |
| **Solution** | 10-state 상태머신 + D1 이력 테이블 + REST API로 상태 조회/전이 |
| **Function UX Effect** | 태스크 상태를 DB에 기록하고 API로 조회 가능 → 대시보드 연동 기반 |
| **Core Value** | Phase 14 Foundation Layer 0 — 후속 Hook/EventBus/Loop의 토대 |

## 1. 배경 및 목적

### 1.1 Phase 14 개요

FX-Unified-Integration-Plan.md의 2계층 루프 아키텍처에서 **Layer 0: TaskState 정의**를 구현한다.

```
[Layer 0] TaskState 정의 (enum + transition rules) ← 이번 Sprint
    ↓
[Layer 1] Hook System (Sprint 149)
    ↓
[Layer 2] Event Bus (Sprint 149)
    ↓
[Layer 3] Orchestration Loop (Sprint 150)
```

### 1.2 F333 목표

- TaskState enum 10개 상태 정의
- D1 `task_states` 테이블 — 태스크 상태 이력 기록
- API 2건: `GET /tasks/:id/state`, `POST /tasks/:id/transition`
- TransitionGuard — 허용 전이 목록 검증
- GAN 잔여이슈 N7 해결 (Agent→Task 연결)

### 1.3 독립 가치

> **이 Sprint만으로 얻는 가치:** 태스크 상태를 DB에 기록하고 API로 조회/전이 가능. F334(Hook) 없이도 수동 상태 관리 가능.

## 2. 구현 계획

### 2.1 파일 매핑

| # | 파일 | 신규/수정 | 설명 | LOC |
|---|------|----------|------|-----|
| 1 | `packages/shared/src/task-state.ts` | 신규 | TaskState enum + TRANSITIONS + FEEDBACK_LOOP_TRIGGERS + 타입 | ~120 |
| 2 | `packages/api/src/db/migrations/0095_task_states.sql` | 신규 | task_states + task_state_history 테이블 | ~40 |
| 3 | `packages/api/src/services/task-state-service.ts` | 신규 | 상태 조회/전이/이력 기록 서비스 | ~120 |
| 4 | `packages/api/src/services/transition-guard.ts` | 신규 | 전이 허용 검증 + 커스텀 가드 확장점 | ~80 |
| 5 | `packages/api/src/schemas/task-state.ts` | 신규 | Zod 스키마 (요청/응답) | ~60 |
| 6 | `packages/api/src/routes/task-state.ts` | 신규 | GET/POST 라우트 | ~80 |
| 7 | `packages/api/src/app.ts` | 수정 | taskStateRoute import + 등록 | ~3 |
| 8 | `packages/api/src/index.ts` | 수정 (필요시) | — |
| 9 | `packages/api/src/__tests__/task-state-service.test.ts` | 신규 | 서비스 단위 테스트 ~25건 | ~200 |
| 10 | `packages/api/src/__tests__/transition-guard.test.ts` | 신규 | 가드 단위 테스트 ~15건 | ~120 |
| 11 | `packages/api/src/__tests__/task-state-route.test.ts` | 신규 | API 통합 테스트 ~10건 | ~150 |

### 2.2 TaskState enum 설계 (PRD §3.3 기반)

```typescript
enum TaskState {
  INTAKE          = 'INTAKE',
  SPEC_DRAFTING   = 'SPEC_DRAFTING',
  CODE_GENERATING = 'CODE_GENERATING',
  TEST_RUNNING    = 'TEST_RUNNING',
  SYNC_VERIFYING  = 'SYNC_VERIFYING',
  PR_OPENED       = 'PR_OPENED',
  FEEDBACK_LOOP   = 'FEEDBACK_LOOP',
  REVIEW_PENDING  = 'REVIEW_PENDING',
  COMPLETED       = 'COMPLETED',
  FAILED          = 'FAILED',
}
```

### 2.3 전이 규칙 (PRD §3.3 TRANSITIONS)

```
INTAKE → [SPEC_DRAFTING]
SPEC_DRAFTING → [CODE_GENERATING, FEEDBACK_LOOP]
CODE_GENERATING → [TEST_RUNNING, FEEDBACK_LOOP]
TEST_RUNNING → [SYNC_VERIFYING, FEEDBACK_LOOP]
SYNC_VERIFYING → [PR_OPENED, FEEDBACK_LOOP]
PR_OPENED → [FEEDBACK_LOOP, REVIEW_PENDING]
FEEDBACK_LOOP → [SPEC_DRAFTING, CODE_GENERATING, TEST_RUNNING, FAILED]
REVIEW_PENDING → [COMPLETED, FEEDBACK_LOOP]
COMPLETED → []
FAILED → [INTAKE]
```

### 2.4 D1 스키마

```sql
-- task_states: 현재 태스크 상태
CREATE TABLE IF NOT EXISTS task_states (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  current_state TEXT NOT NULL DEFAULT 'INTAKE',
  agent_id TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- task_state_history: 전이 이력
CREATE TABLE IF NOT EXISTS task_state_history (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  trigger_source TEXT,
  trigger_event TEXT,
  guard_result TEXT,
  transitioned_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 2.5 API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/tasks/:taskId/state` | 현재 상태 + 최근 이력 조회 |
| POST | `/api/tasks/:taskId/transition` | 상태 전이 요청 (TransitionGuard 검증) |

### 2.6 하위 호환

- 기존 89개 routes 변경 없음 (Additive)
- `task_states` 테이블은 새 테이블이므로 기존 데이터 영향 없음
- shared 패키지에 타입 추가만 (기존 타입 수정 없음)

## 3. 위험 및 완화

| 위험 | 심각도 | 완화 |
|------|--------|------|
| D1 migration 번호 충돌 | Low | 최신 번호 확인 (현재 0094) → 0095 사용 |
| 기존 agent route와 혼동 | Low | 별도 `task-state` 라우트로 분리 |
| FEEDBACK_LOOP_TRIGGERS 미사용 | Info | F333에서는 정의만, F334(Hook)에서 실제 연결 |

## 4. 테스트 전략

### 4.1 단위 테스트 (~40건)
- TaskState 전이 규칙 검증 (유효/무효 전이)
- TransitionGuard 허용/거부 로직
- task-state-service CRUD 및 이력 기록

### 4.2 통합 테스트 (~10건)
- API GET/POST 정상/에러 케이스
- 인증 미들웨어 통과
- 존재하지 않는 task 처리

## 5. 완료 기준

- [ ] TaskState enum + 전이 규칙 정의 (shared)
- [ ] D1 migration 0095 작성
- [ ] task-state-service 구현
- [ ] transition-guard 구현
- [ ] API 2건 (GET/POST) 구현
- [ ] 단위 테스트 ~40건 통과
- [ ] 통합 테스트 ~10건 통과
- [ ] typecheck 통과
- [ ] lint 통과
