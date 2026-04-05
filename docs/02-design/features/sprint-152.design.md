---
code: FX-DSGN-S152
title: "Sprint 152 — F337 Orchestration Dashboard Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 152
feature: F337
phase: 14
---

# Sprint 152 Design — F337 Orchestration Dashboard

> Phase 14 Feature — Agent Orchestration 관측성 시각화

## 1. 개요

F333~F335에서 구축한 TaskState + EventBus + OrchestrationLoop를 Web 대시보드로 시각화한다. 기존 API 6개 endpoint를 활용하고, 집계 endpoint 1건만 추가한다.

### 1.1 아키텍처 위치 (Layer 4~5 시각화)

```
[Layer 0] TaskState (F333 ✅) ─┐
[Layer 1] Hook System (F334 ✅)─┤
[Layer 2] Event Bus (F334 ✅)  ─┤── 데이터 생산자
[Layer 3] Orchestration (F335 ✅)┘
    ↓ (기존 API endpoints)
[Layer 4+5] Dashboard (F337 🎯) ── 데이터 소비자 (Web 시각화)
```

## 2. API 설계

### 2.1 신규 endpoint: 상태별 집계

```
GET /api/task-states/summary
Response: { counts: { INTAKE: 2, CODE_GENERATING: 1, ... }, total: 10 }
```

TaskStateService에 `getSummary(tenantId)` 메서드 추가.

### 2.2 기존 API 활용

| API | 용도 | 대시보드 영역 |
|-----|------|-------------|
| `GET /task-states?state=X&limit=20` | 상태별 목록 | Kanban 카드 |
| `GET /task-states/:taskId` | 상태+이력+가용전이 | 태스크 상세 모달 |
| `POST /task-states/:taskId/transition` | 수동 전이 | 상세 모달 버튼 |
| `GET /task-states/:taskId/loop-history` | 루프 이력 | Loop History 탭 |
| `GET /telemetry/events?taskId=X` | 이벤트 로그 | Telemetry 탭 |
| `GET /telemetry/counts` | 소스별 집계 | Telemetry 바 차트 |

## 3. 컴포넌트 설계

### 3.1 페이지 구조

```
orchestration.tsx (라우트)
├── 3탭 네비게이션: [Tasks] [Loop History] [Telemetry]
├── Tab 1: TaskKanbanBoard
│   └── TaskCard × N (상태별 그룹)
│       └── TaskDetailModal (클릭 시)
├── Tab 2: LoopHistoryView
│   ├── TaskSelector (드롭다운)
│   ├── QualityScoreChart (SVG 라인 차트)
│   └── RoundDetailList (라운드별 카드)
└── Tab 3: TelemetryDashboard
    ���── SourceCountBar (SVG 바 차트)
    ├── TimeFilter (since 선택)
    └── EventLogTable (최근 이벤트)
```

### 3.2 TaskKanbanBoard

**Props**: 없음 (내부에서 API fetch)

**상태 그룹 및 색상**:

| 그룹 | 상태 | 색상 | 라벨 |
|------|------|------|------|
| 대기 | INTAKE | gray | 접수 |
| 진행 | SPEC_DRAFTING, CODE_GENERATING, TEST_RUNNING, SYNC_VERIFYING | blue | 진행 중 |
| PR | PR_OPENED, REVIEW_PENDING | purple | 리뷰 |
| 루프 | FEEDBACK_LOOP | orange | 피드백 |
| 완료 | COMPLETED | green | 완료 |
| 실패 | FAILED | red | 실패 |

**태스크 카드 필드**: taskId, agentId, currentState, updatedAt

**상세 모달**:
- 현재 상태 + 가용 전이 목록
- 전이 이력 테이블 (fromState → toState, trigger, timestamp)
- 수동 전이 버튼 (admin only — POST transition)

### 3.3 LoopHistoryView

**동작 흐름**:
1. 태스크 드롭다운으로 taskId 선택 (목록은 task-states API에서)
2. 선택 시 `GET /task-states/:taskId/loop-history` 호출
3. 라운드별 qualityScore를 SVG 라인 차트로 표시
   - X축: round (1, 2, 3...)
   - Y축: qualityScore (0.0~1.0)
   - 수평 기준선: minQualityScore (기본 0.7, dashed line)
   - 점 색상: pass=green, fail=red, error=gray
4. 하단 라운드 카드: agentName, status, durationMs, feedback 목록

**SVG 차트 사양**:
- viewBox: 0 0 400 200
- 마진: top 20, right 20, bottom 30, left 40
- 축 눈금: Y축 0.0~1.0 (0.2 간격), X축 라운드 번호
- 연결선: stroke #6366f1 (indigo-500), strokeWidth 2
- 기준선: stroke #f59e0b (amber-500), strokeDasharray 4,4

### 3.4 TelemetryDashboard

**소스별 카운트 바 차트**:
- `GET /telemetry/counts?since=2026-04-01` 결과를 SVG 수평 바로 표시
- 소스 라벨: hook, ci, review, discriminator, sync, manual
- 색상: 소스별 고유색 (hook=#3b82f6, ci=#10b981, review=#8b5cf6, discriminator=#f59e0b, sync=#6366f1, manual=#6b7280)

**이벤트 로그 테이블**:
- `GET /telemetry/events?taskId=X&limit=20` 결과
- 컬럼: timestamp, source, severity, payload(JSON 축약)
- 소스 필터 드롭다운
- severity 뱃지: info(gray), warn(yellow), error(red)

## 4. 파일 매핑

| # | 파일 | 변경 | LOC |
|---|------|------|-----|
| 1 | `packages/api/src/services/task-state-service.ts` | getSummary() 추가 | +20 |
| 2 | `packages/api/src/schemas/task-state.ts` | TaskStateSummarySchema 추가 | +10 |
| 3 | `packages/api/src/routes/task-state.ts` | GET /task-states/summary 추가 | +30 |
| 4 | `packages/web/src/routes/orchestration.tsx` | 신규 — 3탭 페이지 | +200 |
| 5 | `packages/web/src/components/feature/TaskKanbanBoard.tsx` | 신규 | +150 |
| 6 | `packages/web/src/components/feature/TaskDetailModal.tsx` | 신규 | +100 |
| 7 | `packages/web/src/components/feature/LoopHistoryView.tsx` | 신규 | +150 |
| 8 | `packages/web/src/components/feature/TelemetryDashboard.tsx` | 신규 | +120 |
| 9 | `packages/web/src/router.tsx` | orchestration 라우트 추가 | +1 |
| 10 | `packages/web/src/components/sidebar.tsx` | 오케스트레이션 메뉴 추가 | +5 |
| 11 | `packages/api/src/__tests__/task-state-summary.test.ts` | 신규 | +80 |
| 12 | `packages/web/e2e/orchestration.spec.ts` | 신규 | +60 |
| **합계** | | | **~926** |

## 5. 테스트 설계

### 5.1 API 테스트

| 테스트 | 검증 항목 |
|--------|----------|
| GET /task-states/summary — 빈 DB | `{ counts: {}, total: 0 }` |
| GET /task-states/summary — 3개 태스크 | 상태별 카운트 정확성 |
| GET /task-states/summary — tenant 격리 | 다른 org 데이터 미포함 |

### 5.2 E2E 테스트

| 테스트 | 검증 항목 |
|--------|----------|
| 오케스트레이션 페이지 접근 | 제목 + 3탭 존재 |
| Tasks 탭 | Kanban 컬럼 존재 (INTAKE, COMPLETED 등) |
| Telemetry 탭 | 이벤트 로그 테이블 존재 |
| Empty state | 데이터 없을 때 안내 메시지 |

## 6. 리스크 & Skip 사유

| 리스크 | 대응 | Skip 여부 |
|--------|------|-----------|
| SVG 차트 외부 라이브러리 없이 구현 | viewBox 기반 직접 렌더링 — 단순 라인/바 차트에 충분 | N/A |
| 수동 전이 오남용 | admin 전용 확인 — Sidebar visibility 활용 | N/A |
| 대시보드 데이터 없을 때 | EmptyState 컴포넌트로 "아직 오케스트레이션 데이터가 없어요" 안내 | N/A |
