---
code: FX-DSGN-S132
title: "Sprint 132 — 형상화 자동 전환 + 파이프라인 상태 머신 Design"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-04
updated: 2026-04-04
author: Sinclair Seo
references: "[[FX-PLAN-S132]], [[FX-SPEC-001]]"
---

# Sprint 132 Design: 형상화 자동 전환 + 파이프라인 상태 머신

## 1. 개요

F312 (형상화 자동 전환 + Phase A~F 자동 실행) + F313 (파이프라인 상태 머신 + 실패/예외 관리)를 구현한다.
핵심: 발굴 2-10 완료 → 형상화 자동 트리거, 이벤트 기반 상태 머신으로 전체 파이프라인 오케스트레이션.

## 2. D1 스키마

### 마이그레이션: `0085_discovery_pipeline.sql`

```sql
-- F312+F313: Discovery Pipeline 오케스트레이션 + 상태 머신

-- 1. discovery_pipeline_runs — 발굴→형상화 통합 파이프라인 실행
CREATE TABLE IF NOT EXISTS discovery_pipeline_runs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle'
    CHECK(status IN ('idle','discovery_running','discovery_complete','shaping_queued','shaping_running','shaping_complete','paused','failed','aborted')),
  current_step TEXT,              -- 예: '2-3', 'phase-B'
  discovery_start_at TEXT,
  discovery_end_at TEXT,
  shaping_run_id TEXT,            -- FK → shaping_runs.id
  trigger_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK(trigger_mode IN ('manual','auto')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_dpr_tenant_status ON discovery_pipeline_runs(tenant_id, status);
CREATE INDEX idx_dpr_biz_item ON discovery_pipeline_runs(biz_item_id);

-- 2. pipeline_events — 이벤트 로그 (상태 전이 추적)
CREATE TABLE IF NOT EXISTS pipeline_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  pipeline_run_id TEXT NOT NULL,
  event_type TEXT NOT NULL
    CHECK(event_type IN ('START','STEP_COMPLETE','STEP_FAILED','RETRY','SKIP','ABORT','PAUSE','RESUME','TRIGGER_SHAPING','SHAPING_PHASE_COMPLETE','COMPLETE')),
  from_status TEXT,
  to_status TEXT,
  step_id TEXT,                   -- 예: '2-0', '2-3', 'phase-A'
  payload TEXT,                   -- JSON 상세 데이터
  error_code TEXT,
  error_message TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_pe_run ON pipeline_events(pipeline_run_id, created_at);
CREATE INDEX idx_pe_type ON pipeline_events(event_type);
```

## 3. API 스키마 (Zod)

### `packages/api/src/schemas/discovery-pipeline.ts`

```typescript
import { z } from "zod";

// ── Pipeline Status ──
export const PIPELINE_STATUSES = [
  "idle", "discovery_running", "discovery_complete",
  "shaping_queued", "shaping_running", "shaping_complete",
  "paused", "failed", "aborted",
] as const;
export type DiscoveryPipelineStatus = (typeof PIPELINE_STATUSES)[number];

// ── Event Types ──
export const EVENT_TYPES = [
  "START", "STEP_COMPLETE", "STEP_FAILED", "RETRY", "SKIP",
  "ABORT", "PAUSE", "RESUME", "TRIGGER_SHAPING",
  "SHAPING_PHASE_COMPLETE", "COMPLETE",
] as const;
export type PipelineEventType = (typeof EVENT_TYPES)[number];

// ── Create Pipeline Run ──
export const createPipelineRunSchema = z.object({
  bizItemId: z.string().min(1),
  triggerMode: z.enum(["manual", "auto"]).default("manual"),
  maxRetries: z.number().int().min(0).max(10).optional().default(3),
});
export type CreatePipelineRunInput = z.infer<typeof createPipelineRunSchema>;

// ── List Pipeline Runs ──
export const listPipelineRunsSchema = z.object({
  status: z.enum(PIPELINE_STATUSES).optional(),
  bizItemId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Step Action (retry/skip/abort) ──
export const stepActionSchema = z.object({
  action: z.enum(["retry", "skip", "abort"]),
  reason: z.string().max(2000).optional(),
});
export type StepAction = z.infer<typeof stepActionSchema>;

// ── Trigger Shaping ──
export const triggerShapingSchema = z.object({
  mode: z.enum(["hitl", "auto"]).default("auto"),
  maxIterations: z.number().int().min(1).max(10).optional().default(3),
});

// ── Step Complete Event ──
export const stepCompleteSchema = z.object({
  stepId: z.string().min(1),   // '2-0', '2-3', 'phase-A' 등
  payload: z.record(z.unknown()).optional(),
});
```

## 4. 서비스 설계

### 4.1 PipelineStateMachine (`pipeline-state-machine.ts`)

FSM 패턴으로 파이프라인 상태 전이를 관리한다.

```
상태 전이 맵:
  idle → discovery_running           (START)
  discovery_running → discovery_running  (STEP_COMPLETE: 중간 단계)
  discovery_running → discovery_complete (STEP_COMPLETE: step='2-10')
  discovery_running → failed         (STEP_FAILED + retries exhausted)
  discovery_running → paused         (PAUSE)
  discovery_complete → shaping_queued (TRIGGER_SHAPING)
  shaping_queued → shaping_running   (shaping run 시작)
  shaping_running → shaping_running  (SHAPING_PHASE_COMPLETE: 중간)
  shaping_running → shaping_complete (SHAPING_PHASE_COMPLETE: phase='F')
  shaping_running → paused           (PAUSE: Phase F HITL 대기)
  shaping_running → failed           (STEP_FAILED + retries exhausted)
  paused → discovery_running | shaping_running  (RESUME)
  failed → discovery_running | shaping_running  (RETRY from error recovery)
  * → aborted                        (ABORT)
```

**핵심 메서드:**
- `transition(runId, event): Promise<{fromStatus, toStatus, valid}>` — 전이 실행 + pipeline_events 기록
- `getValidActions(status): string[]` — 현재 상태에서 가능한 액션 목록
- `isTerminal(status): boolean` — 종료 상태 여부

### 4.2 DiscoveryPipelineService (`discovery-pipeline-service.ts`)

파이프라인 CRUD + 오케스트레이션 로직.

**핵심 메서드:**
- `createRun(orgId, input): Promise<Run>` — 파이프라인 생성
- `getRun(id, orgId): Promise<RunDetail>` — 상세 조회 (이벤트 포함)
- `listRuns(orgId, filters): Promise<{items, total}>` — 목록
- `reportStepComplete(runId, stepId, payload): Promise<void>` — 단계 완료 보고
- `reportStepFailed(runId, stepId, error): Promise<void>` — 단계 실패 보고
- `handleAction(runId, action): Promise<void>` — 사용자 액션 (retry/skip/abort)
- `getEvents(runId): Promise<Event[]>` — 이벤트 로그 조회

### 4.3 ShapingOrchestratorService (`shaping-orchestrator-service.ts`)

형상화 Phase A~F 자동 순차 실행 오케스트레이터.

**핵심 메서드:**
- `startAutoShaping(pipelineRunId, bizItemId, orgId, options): Promise<shapingRunId>` — 발굴 산출물 수집 → shaping_runs 생성 → Phase A 시작
- `advancePhase(shapingRunId, pipelineRunId): Promise<{nextPhase, completed}>` — 현재 Phase 완료 → 다음 Phase 시작
- `collectDiscoveryArtifacts(bizItemId): Promise<ArtifactBundle>` — 발굴 산출물 JSON 집계

**형상화 자동 트리거 흐름:**
1. `reportStepComplete(runId, '2-10', payload)` 호출
2. PipelineStateMachine이 `discovery_complete`로 전이
3. DiscoveryPipelineService가 `TRIGGER_SHAPING` 이벤트 발행
4. ShapingOrchestratorService.startAutoShaping() 호출
5. Phase A 시작 → 순차 실행

### 4.4 PipelineErrorHandler (`pipeline-error-handler.ts`)

에러 복구 로직 전담.

**핵심 메서드:**
- `handleFailure(runId, stepId, error): Promise<{retryable, retryCount, maxRetries}>` — 실패 처리 + 재시도 가능 여부 판단
- `retry(runId): Promise<void>` — 마지막 실패 단계 재실행
- `skip(runId, reason): Promise<void>` — 현재 단계 건너뛰기
- `abort(runId, reason): Promise<void>` — 파이프라인 중단

## 5. API 엔드포인트

### `packages/api/src/routes/discovery-pipeline.ts`

| # | Method | Path | 설명 |
|---|--------|------|------|
| 1 | POST | `/discovery-pipeline/runs` | 파이프라인 생성 + 시작 |
| 2 | GET | `/discovery-pipeline/runs` | 목록 조회 (필터) |
| 3 | GET | `/discovery-pipeline/runs/:id` | 상세 조회 (이벤트 포함) |
| 4 | POST | `/discovery-pipeline/runs/:id/step-complete` | 단계 완료 보고 |
| 5 | POST | `/discovery-pipeline/runs/:id/step-failed` | 단계 실패 보고 |
| 6 | POST | `/discovery-pipeline/runs/:id/action` | 에러 복구 액션 (retry/skip/abort) |
| 7 | POST | `/discovery-pipeline/runs/:id/trigger-shaping` | 수동 형상화 트리거 |
| 8 | POST | `/discovery-pipeline/runs/:id/pause` | 일시 중지 |
| 9 | POST | `/discovery-pipeline/runs/:id/resume` | 재개 |
| 10 | GET | `/discovery-pipeline/runs/:id/events` | 이벤트 로그 조회 |

## 6. Web 컴포넌트

### 6.1 PipelineTimeline (`PipelineTimeline.tsx`)

파이프라인 진행 상황을 타임라인으로 시각화.
- 발굴 단계 (2-0 ~ 2-10) + 형상화 단계 (Phase A ~ F) 표시
- 현재 단계 하이라이트, 완료/실패/대기 상태 아이콘
- 클릭 시 해당 단계의 이벤트 로그 표시

### 6.2 ShapingTriggerPanel (`ShapingTriggerPanel.tsx`)

발굴 완료 후 형상화 트리거 패널.
- 자동 트리거 활성화 시 카운트다운 + 토스트 알림
- 수동 트리거 버튼 (mode 선택: hitl/auto)
- 발굴 산출물 요약 미리보기

### 6.3 PipelineErrorPanel (`PipelineErrorPanel.tsx`)

에러 발생 시 복구 옵션 제공.
- 에러 메시지 + 스택 표시
- 재시도/건너뛰기/중단 버튼 3개
- 재시도 횟수 표시 (N/3)

### 6.4 PipelineStatusBadge (`PipelineStatusBadge.tsx`)

파이프라인 상태를 컬러 뱃지로 표시.
- idle: gray, running: blue, complete: green, failed: red, paused: yellow, aborted: gray-dark

## 7. 테스트 설계

### 7.1 `pipeline-state-machine.test.ts`
- 정상 전이: idle → discovery_running → discovery_complete → shaping_complete
- 에러 전이: discovery_running → failed (retries 소진)
- 무효 전이: idle에서 STEP_COMPLETE 시 에러
- 액션 목록: 각 상태별 유효 액션 확인
- ABORT: 모든 비터미널 상태에서 aborted 전이

### 7.2 `discovery-pipeline-service.test.ts`
- createRun: 정상 생성 + status=idle
- reportStepComplete('2-10'): discovery_complete 전이 + 형상화 자동 트리거
- reportStepFailed: 재시도 카운트 증가 + 이벤트 기록
- handleAction(retry/skip/abort): 각 액션 동작

### 7.3 `shaping-orchestrator-service.test.ts`
- startAutoShaping: shaping_runs 생성 + phase_logs[A] 기록
- advancePhase: A→B→...→F 순차 진행
- collectDiscoveryArtifacts: bd_artifacts 조회 + JSON 번들

### 7.4 `discovery-pipeline-route.test.ts`
- POST /runs: 201 + 파이프라인 생성
- GET /runs/:id: 200 + 상세+이벤트
- POST /runs/:id/step-complete: 상태 전이
- POST /runs/:id/action: retry/skip/abort
- POST /runs/:id/trigger-shaping: 형상화 트리거
- 인증 없이 접근: 401

## 8. 파일 목록 (구현 순서)

| # | 파일 | 유형 | 설명 |
|---|------|------|------|
| 1 | `packages/api/src/db/migrations/0085_discovery_pipeline.sql` | D1 | 테이블 2개 |
| 2 | `packages/api/src/schemas/discovery-pipeline.ts` | Schema | Zod 스키마 |
| 3 | `packages/api/src/services/pipeline-state-machine.ts` | Service | FSM 엔진 |
| 4 | `packages/api/src/services/pipeline-error-handler.ts` | Service | 에러 복구 |
| 5 | `packages/api/src/services/discovery-pipeline-service.ts` | Service | 파이프라인 CRUD+오케스트레이션 |
| 6 | `packages/api/src/services/shaping-orchestrator-service.ts` | Service | 형상화 자동 실행 |
| 7 | `packages/api/src/routes/discovery-pipeline.ts` | Route | 10 EP |
| 8 | `packages/web/src/components/feature/discovery/PipelineStatusBadge.tsx` | Web | 상태 뱃지 |
| 9 | `packages/web/src/components/feature/discovery/PipelineTimeline.tsx` | Web | 타임라인 |
| 10 | `packages/web/src/components/feature/discovery/ShapingTriggerPanel.tsx` | Web | 형상화 트리거 |
| 11 | `packages/web/src/components/feature/discovery/PipelineErrorPanel.tsx` | Web | 에러 복구 UI |
| 12 | `packages/api/src/__tests__/pipeline-state-machine.test.ts` | Test | FSM 테스트 |
| 13 | `packages/api/src/__tests__/discovery-pipeline-service.test.ts` | Test | 서비스 테스트 |
| 14 | `packages/api/src/__tests__/shaping-orchestrator-service.test.ts` | Test | 오케스트레이터 테스트 |
| 15 | `packages/api/src/__tests__/discovery-pipeline-route.test.ts` | Test | 라우트 테스트 |
