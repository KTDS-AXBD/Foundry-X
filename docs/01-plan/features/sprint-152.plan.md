---
code: FX-PLAN-S152
title: "Sprint 152 — F337 Orchestration Dashboard (Phase 14 Feature)"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 152
feature: F337
phase: 14
---

# Sprint 152 Plan — F337 Orchestration Dashboard

> **Phase 14 Feature** — Agent Orchestration 관측성 시각화

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F337 Orchestration Dashboard |
| Sprint | 152 (2026-04-05) |
| Duration | ~1 Sprint |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | F333~F335에서 구축한 TaskState Machine + EventBus + OrchestrationLoop의 실행 상태를 확인할 방법이 API 직접 호출뿐이라, 팀이 에이전트 오케스트레이션 현황을 실시간으로 파악할 수 없음 |
| **Solution** | 태스크 상태 Kanban + 루프 이력 뷰 + 텔레메트리 대시보드 3-탭 구성의 웹 대시보드를 구축하여, 기존 API를 시각화 |
| **Function UX Effect** | 관리자가 에이전트 태스크 현황을 한 눈에 파악하고, 루프 수렴 과정을 그래프로 추적하며, 소스별 이벤트 비용을 실시간 모니터링할 수 있음 |
| **Core Value** | Phase 14 Agent Orchestration Infrastructure의 관측성 완성 — "보이지 않으면 관리할 수 없다" 원칙 실현 |

## 1. 목표

F333(TaskState) + F334(EventBus) + F335(OrchestrationLoop)에서 구축한 에이전트 오케스트레이션 인프라를 **웹 대시보드**로 시각화하여, 팀이 에이전트 태스크 상태/루프 이력/텔레메트리를 실시간으로 모니터링할 수 있게 한다.

### 1.1 핵심 산출물

| # | 산출물 | 설명 | LOC 추정 |
|---|--------|------|---------|
| 1 | Orchestration Dashboard 페이지 | 3탭 구성 (Kanban + Loop History + Telemetry) | ~200 |
| 2 | TaskKanbanBoard 컴포넌트 | 10-state Kanban 보드 — drag-drop 없이 상태별 그룹 뷰 | ~150 |
| 3 | LoopHistoryView 컴포넌트 | 라운드별 품질 점수 추이 그래프 + 상태 타임라인 | ~150 |
| 4 | TelemetryDashboard 컴포넌트 | 소스별 이벤트 카운트 + 최근 이벤트 로그 | ~120 |
| 5 | API 확장 (집계 endpoint) | 상태별 태스크 수 집계 API 1건 | ~60 |
| 6 | 테스트 | API 테스트 + Web 컴포넌트 기본 테스트 | ~200 |
| **합계** | | | **~880** |

### 1.2 SPEC 연동

| 항목 | 값 |
|------|---|
| F-item | F337 |
| REQ | FX-REQ-329 |
| Sprint | 152 |
| Phase | 14 — Agent Orchestration Infrastructure |

## 2. 의존성

| 의존 | 상태 | 설명 |
|------|------|------|
| F333 TaskState Machine | ✅ (S148, PR #284) | TaskState enum, TaskStateService, D1 task_states |
| F334 Hook + EventBus | ✅ (S149, PR #286) | EventBus, TaskEvent, D1 execution_events |
| F335 OrchestrationLoop | ✅ (S150, PR #287) | OrchestrationLoop, TelemetryCollector, shared/orchestration.ts |
| F336 Agent Adapter 통합 | 🔧 (S151, 병렬) | 병렬 진행 중이나 F337은 독립 — MockAdapter로 충분 |

## 3. 구현 계획

### Phase A: API 확장 — 집계 endpoint (~60 LOC)

1. `packages/api/src/routes/task-state.ts`에 `GET /task-states/summary` 추가
   - 상태별 태스크 수 집계 (10-state별 count)
   - 대시보드 Kanban 헤더 카운트용

### Phase B: Web 페이지 + 라우트 설정 (~200 LOC)

1. `packages/web/src/routes/orchestration.tsx` 신규 — 3탭 컨테이너
2. `packages/web/src/router.tsx`에 `{ path: "orchestration", lazy: () => import("@/routes/orchestration") }` 추가
3. Sidebar "관리" 그룹에 "오케스트레이션" 메뉴 항목 추가

### Phase C: TaskKanbanBoard 컴포넌트 (~150 LOC)

1. `packages/web/src/components/feature/TaskKanbanBoard.tsx` 신규
   - 10-state 컬럼 (INTAKE → ... → COMPLETED/FAILED)
   - 각 컬럼에 태스크 카드 표시 (taskId, agentId, updatedAt)
   - 상태 뱃지 색상 분류 (진행 중: blue, 루프: orange, 완료: green, 실패: red)
   - 카드 클릭 → 상세 모달 (이력 + 가용 전이 표시)

### Phase D: LoopHistoryView 컴포넌트 (~150 LOC)

1. `packages/web/src/components/feature/LoopHistoryView.tsx` 신규
   - 태스크별 루프 이력 조회 (`/task-states/:taskId/loop-history`)
   - 라운드별 qualityScore 추이를 SVG 기반 간단 라인 차트로 표시
   - 각 라운드: agentName, status(pass/fail/error), durationMs, feedback
   - convergence criteria 기준선 표시 (minQualityScore 수평선)

### Phase E: TelemetryDashboard 컴포넌트 (~120 LOC)

1. `packages/web/src/components/feature/TelemetryDashboard.tsx` 신규
   - 소스별 이벤트 카운트 바 차트 (`/telemetry/counts`)
   - 최근 이벤트 로그 테이블 (`/telemetry/events`)
   - 필터: taskId, source (hook/ci/review/discriminator/sync/manual)
   - 시간대 필터 (since 파라미터)

### Phase F: 테스트 (~200 LOC)

1. `packages/api/src/__tests__/task-state-summary.test.ts` — 집계 API 테스트
2. `packages/web/e2e/orchestration.spec.ts` — E2E 기본 동작 검증

## 4. 기존 API 활용 매핑

| 대시보드 영역 | 기존 API | 용도 |
|--------------|---------|------|
| Kanban 보드 | `GET /task-states?state=X` | 상태별 태스크 목록 |
| Kanban 헤더 | `GET /task-states/summary` (신규) | 상태별 카운트 |
| 태스크 상세 | `GET /task-states/:taskId` | 상태 + 이력 + 가용 전이 |
| 상태 전이 | `POST /task-states/:taskId/transition` | 수동 전이 (관리자용) |
| 루프 이력 | `GET /task-states/:taskId/loop-history` | 라운드별 결과 |
| 텔레메트리 이벤트 | `GET /telemetry/events` | 이벤트 로그 |
| 텔레메트리 집계 | `GET /telemetry/counts` | 소스별 카운트 |

## 5. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 차트 라이브러리 추가 부담 | 번들 사이즈 증가 | SVG 직접 렌더링으로 외부 의존성 없이 구현 |
| 데이터 없을 때 UX | 빈 화면 노출 | EmptyState 컴포넌트로 "아직 태스크가 없어요" 안내 |
| F336 미완료 시 영향 | AgentAdapter가 Mock | 대시보드는 데이터 구조만 보므로 Mock/실제 무관 |
