---
code: FX-DSGN-014
title: "fx-discovery-v2 — 발굴→형상화 파이프라인 자동화 설계"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-04
updated: 2026-04-04
author: Sinclair Seo
references: "[[FX-PLAN-014]], [[FX-SPEC-001]], docs/specs/fx-discovery-v2/prd-final.md"
---

# fx-discovery-v2 Design Document

> **Summary**: 발굴(2-0~2-10)→형상화(Phase A~F) 전체 파이프라인을 상태 머신 기반으로 자동화
>
> **Project**: Foundry-X
> **Version**: 0.1.0
> **Author**: Sinclair Seo
> **Date**: 2026-04-04
> **Status**: Draft
> **Planning Doc**: [fx-discovery-v2.plan.md](../../01-plan/features/fx-discovery-v2.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **파이프라인 연속성**: 발굴 2-0~2-10 + 형상화 Phase A~F를 하나의 오케스트레이션으로 관리
2. **HITL 통합**: 사업성 체크포인트에서 사용자 승인/거부/건너뛰기 + 타임아웃
3. **실패 복원력**: 각 단계 실패 시 재시도/건너뛰기/중단 + 상태 영속
4. **기존 서비스 재사용**: PipelineService, BdSkillExecutor, ShapingService 확장
5. **Serverless 호환**: Cloudflare Workers 타임아웃(30s) 내 단계별 분할 실행

### 1.2 Design Principles

- **단계 독립성**: 각 단계는 독립적으로 실행/재시도 가능 (순차 의존은 데이터 계약으로만)
- **상태 영속**: 모든 상태 전환은 D1에 기록 → Worker 재시작 후 재개 가능
- **점진적 확장**: Sprint 132 핵심 → 133~136에서 기능 확장 (YAGNI 준수)

---

## 2. Architecture

### 2.1 Component Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                        Web (React)                                 │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ PipelineControl  │  │ HitlCheckpoint   │  │ PipelineStatus   │ │
│  │ Panel            │  │ Dialog           │  │ Bar              │ │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘ │
│           │                     │                      │           │
│           ▼                     ▼                      ▼           │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                api-client.ts (REST + polling)                │ │
│  └──────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
                              │ HTTP
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                      API (Hono Workers)                            │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              pipeline-orchestration route                     │ │
│  │  POST /start  GET /status  POST /hitl  POST /retry  POST /skip│
│  └────────┬─────────────────────────────────────────────────────┘ │
│           │                                                       │
│  ┌────────▼─────────┐  ┌──────────────┐  ┌──────────────────────┐│
│  │ Orchestration     │  │ BdSkill      │  │ ShapingService       ││
│  │ Service           │──│ Executor     │  │ (shaping_runs)       ││
│  │ (상태 머신)       │  │ (스킬 실행)  │  │                      ││
│  └────────┬──────────┘  └──────────────┘  └──────────────────────┘│
│           │                                                       │
│  ┌────────▼──────────────────────────────────────────────────────┐│
│  │                       D1 Database                              ││
│  │  pipeline_orchestration | pipeline_step_log | pipeline_stages  ││
│  └───────────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
[사용자: 파이프라인 시작]
  → POST /orchestration/start { bizItemId, pipelineType: "full" }
  → OrchestrationService.start()
     → D1: pipeline_orchestration INSERT (status=running, step=2-0)
     → D1: pipeline_step_log INSERT (action=start)
     → BdSkillExecutor.execute(step=2-0 스킬)
     → D1: step_log INSERT (action=complete)
     → OrchestrationService.advance()
        → 다음 단계 결정 (2-0→2-1)
        → HITL 체크포인트 여부 확인
           → YES: status=paused, hitl_pending=true
           → NO: 다음 단계 스킬 실행
  ...
  → [2-10 완료]
     → OrchestrationService.transitionToShaping()
        → pipeline_orchestration.current_step = 'shaping-a'
        → ShapingService.createRun({ discoveryBizItemId })
        → Phase A~F 순차 실행
  → [shaping-f 완료]
     → status = completed
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| OrchestrationService | PipelineService | 매크로 단계(DISCOVERY→FORMALIZATION) 전환 |
| OrchestrationService | BdSkillExecutor | 발굴 단계별 스킬 실행 |
| OrchestrationService | ShapingService | 형상화 Phase A~F 실행 |
| OrchestrationService | D1 | 상태 영속 + 이벤트 로그 |
| Web Components | api-client.ts | 오케스트레이션 REST API 호출 |

---

## 3. Data Model

### 3.1 핵심 엔티티

```typescript
// 오케스트레이션 실행 상태
interface PipelineOrchestration {
  id: string;
  bizItemId: string;
  orgId: string;
  pipelineType: 'discovery' | 'shaping' | 'full';  // full = discovery + shaping
  currentStep: string;     // '2-0', '2-1', ..., '2-10', 'shaping-a', ..., 'shaping-f'
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  hitlPending: boolean;
  hitlAction: 'approve' | 'reject' | 'skip' | null;
  hitlDeadline: string | null;  // ISO 8601
  inputData: string | null;     // JSON — 이전 단계 산출물 참조
  outputData: string | null;    // JSON — 현재 단계 산출물 참조
  errorData: string | null;     // JSON — 실패 정보
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

// 단계별 이벤트 로그
interface PipelineStepLog {
  id: string;
  orchestrationId: string;
  step: string;
  action: 'start' | 'complete' | 'fail' | 'retry' | 'skip' | 'hitl_request' | 'hitl_response';
  data: string | null;  // JSON — 이벤트 상세
  createdAt: string;
}
```

### 3.2 발굴→형상화 데이터 계약

발굴 2-10 완료 시 형상화 입력으로 전달되는 데이터:

```typescript
interface DiscoveryToShapingPayload {
  bizItemId: string;
  bizItemTitle: string;
  discoveryType: 'I' | 'M' | 'P' | 'T' | 'S';  // 5유형
  completedStages: Array<{
    stageId: string;       // '2-0' ~ '2-10'
    artifactIds: string[]; // bd_artifacts 참조
    completedAt: string;
  }>;
  checkpointResults: Array<{
    stageId: string;
    passed: boolean;
    hitlAction: string;
    notes: string | null;
  }>;
  finalReportArtifactId: string;  // 2-10 최종보고서
}
```

### 3.3 Database Schema (D1 마이그레이션)

```sql
-- 0090_pipeline_orchestration.sql

CREATE TABLE IF NOT EXISTS pipeline_orchestration (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  pipeline_type TEXT NOT NULL CHECK(pipeline_type IN ('discovery', 'shaping', 'full')),
  current_step TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK(status IN ('running', 'paused', 'completed', 'failed', 'cancelled')),
  hitl_pending INTEGER DEFAULT 0,
  hitl_action TEXT CHECK(hitl_action IN ('approve', 'reject', 'skip') OR hitl_action IS NULL),
  hitl_deadline TEXT,
  input_data TEXT,
  output_data TEXT,
  error_data TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);

CREATE INDEX idx_orch_biz_item ON pipeline_orchestration(biz_item_id);
CREATE INDEX idx_orch_status ON pipeline_orchestration(status);

CREATE TABLE IF NOT EXISTS pipeline_step_log (
  id TEXT PRIMARY KEY,
  orchestration_id TEXT NOT NULL,
  step TEXT NOT NULL,
  action TEXT NOT NULL
    CHECK(action IN ('start', 'complete', 'fail', 'retry', 'skip', 'hitl_request', 'hitl_response')),
  data TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (orchestration_id) REFERENCES pipeline_orchestration(id)
);

CREATE INDEX idx_step_log_orch ON pipeline_step_log(orchestration_id);
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /orchestration/start | 파이프라인 시작 | Required |
| GET | /orchestration/:id | 오케스트레이션 상태 조회 | Required |
| GET | /orchestration/:id/logs | 이벤트 로그 조회 | Required |
| POST | /orchestration/:id/advance | 다음 단계 수동 진행 | Required |
| POST | /orchestration/:id/hitl | HITL 응답 (approve/reject/skip) | Required |
| POST | /orchestration/:id/retry | 실패 단계 재시도 | Required |
| POST | /orchestration/:id/cancel | 파이프라인 취소 | Required |
| GET | /orchestration/active | 활성 파이프라인 목록 | Required |

### 4.2 Detailed Specification

#### `POST /orchestration/start`

```json
// Request
{
  "bizItemId": "uuid",
  "pipelineType": "full",        // "discovery" | "shaping" | "full"
  "startStep": "2-0"             // optional, default: 첫 단계
}

// Response (201)
{
  "id": "uuid",
  "bizItemId": "uuid",
  "pipelineType": "full",
  "currentStep": "2-0",
  "status": "running"
}
```

#### `POST /orchestration/:id/hitl`

```json
// Request
{
  "action": "approve",           // "approve" | "reject" | "skip"
  "notes": "사업성 확인 완료"     // optional
}

// Response (200)
{
  "id": "uuid",
  "currentStep": "2-6",          // 승인 시 다음 단계로 이동
  "status": "running",
  "hitlPending": false
}
```

#### `POST /orchestration/:id/retry`

```json
// Request
{
  "step": "2-3"                  // optional, default: 현재 실패 단계
}

// Response (200)
{
  "id": "uuid",
  "currentStep": "2-3",
  "status": "running",
  "retryCount": 1
}
```

### 4.3 Zod Schema

```typescript
// schemas/pipeline-orchestration.schema.ts

export const DISCOVERY_STEPS = [
  '2-0', '2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-7', '2-8', '2-9', '2-10'
] as const;

export const SHAPING_STEPS = [
  'shaping-a', 'shaping-b', 'shaping-c', 'shaping-d', 'shaping-e', 'shaping-f'
] as const;

export const ALL_STEPS = [...DISCOVERY_STEPS, ...SHAPING_STEPS] as const;

export const HITL_CHECKPOINTS: Record<string, string> = {
  '2-1': '유형 분류 체크포인트',
  '2-2': '레퍼런스 분석 체크포인트',
  '2-3': '고객 니즈 체크포인트',
  '2-4': '솔루션 설계 체크포인트',
  '2-5': 'Commit Gate — 사업 계속 여부 결정',
  '2-6': '시장 분석 체크포인트',
  '2-7': '최종 사업성 체크포인트',
};

export const StartOrchestrationSchema = z.object({
  bizItemId: z.string().uuid(),
  pipelineType: z.enum(['discovery', 'shaping', 'full']).default('full'),
  startStep: z.enum(ALL_STEPS).optional(),
});

export const HitlResponseSchema = z.object({
  action: z.enum(['approve', 'reject', 'skip']),
  notes: z.string().max(2000).optional(),
});

export const RetrySchema = z.object({
  step: z.enum(ALL_STEPS).optional(),
});
```

---

## 5. UI/UX Design

### 5.1 파이프라인 상태 바 (PipelineStatusBar)

Discovery 상세 페이지 상단에 표시:

```
┌─────────────────────────────────────────────────────────────────┐
│  파이프라인 진행  [2-0 ✅] [2-1 ✅] [2-2 🔄] [2-3 ⏳] ... [2-10]│
│  ───────────────────────────■■■■░░░░░░░░░░░░░░  27%            │
│  현재: 2-2 레퍼런스 분석 (실행 중)  |  소요: 3분 12초          │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 HITL 체크포인트 다이얼로그

```
┌─────────────────────────────────────────────┐
│  🔔 체크포인트: 2-5 Commit Gate              │
│                                              │
│  이 사업 아이디어를 계속 진행하시겠어요?      │
│                                              │
│  📊 체크포인트 질문:                         │
│  1. 고객 문제가 충분히 검증되었는가? ✅       │
│  2. 시장 규모가 충분한가? ⚠️                 │
│  3. 기술적 실현 가능성이 있는가? ✅           │
│  4. 경쟁 우위가 있는가? ✅                    │
│                                              │
│  메모: [                               ]     │
│                                              │
│  [승인하고 계속] [거부하고 중단] [건너뛰기]   │
│                                              │
│  ⏰ 타임아웃: 23시간 47분 남음               │
└─────────────────────────────────────────────┘
```

### 5.3 실패 복구 UI

```
┌─────────────────────────────────────────────┐
│  ❌ 2-3 고객 니즈 분석 실패                  │
│                                              │
│  오류: BdSkillExecutor timeout (30s)         │
│  재시도 횟수: 1/3                            │
│                                              │
│  [재시도] [이 단계 건너뛰기] [파이프라인 중단]│
└─────────────────────────────────────────────┘
```

### 5.4 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `PipelineControlPanel` | `components/feature/discovery/PipelineControlPanel.tsx` | 파이프라인 시작/중단 버튼 |
| `PipelineStatusBar` | `components/feature/discovery/PipelineStatusBar.tsx` | 진행률 + 현재 단계 표시 |
| `HitlCheckpointDialog` | `components/feature/discovery/HitlCheckpointDialog.tsx` | 승인/거부/건너뛰기 다이얼로그 |
| `PipelineFailurePanel` | `components/feature/discovery/PipelineFailurePanel.tsx` | 실패 시 재시도/건너뛰기/중단 |

### 5.5 User Flow

```
Discovery 상세 페이지
  → [파이프라인 시작] 클릭
  → PipelineStatusBar 활성화 (폴링 시작)
  → 각 단계 자동 실행 (진행률 업데이트)
  → HITL 체크포인트 도달 시 → HitlCheckpointDialog 표시
     → [승인] → 다음 단계 계속
     → [거부] → 파이프라인 중단 + 이유 기록
     → [건너뛰기] → 다음 단계로 이동 (건너뛰기 기록)
  → 실패 발생 시 → PipelineFailurePanel 표시
     → [재시도] → 같은 단계 재실행
     → [건너뛰기] → 다음 단계로 이동
     → [중단] → 파이프라인 종료
  → 2-10 완료 → 자동으로 형상화 Phase A 전환
  → shaping-f 완료 → "파이프라인 완료" 상태
```

---

## 6. Error Handling

### 6.1 에러 유형 및 처리

| 유형 | 원인 | 처리 | 사용자 액션 |
|------|------|------|------------|
| SKILL_TIMEOUT | BdSkillExecutor 30s 초과 | error_data에 기록, 자동 재시도 1회 | 재시도/건너뛰기/중단 |
| SKILL_ERROR | 스킬 실행 내부 오류 | error_data에 기록 | 재시도/건너뛰기/중단 |
| NETWORK_ERROR | API/외부 서비스 연결 실패 | error_data에 기록, 자동 재시도 1회 | 재시도/건너뛰기/중단 |
| DATA_VALIDATION | 단계 간 데이터 형식 불일치 | error_data에 기록 | 수동 확인 필요 |
| HITL_TIMEOUT | 24시간 이내 사용자 응답 없음 | status=paused 유지 + 알림 | 승인/거부/건너뛰기 |
| HITL_REJECT | 사용자가 체크포인트 거부 | status=cancelled + 이유 기록 | — |

### 6.2 에러 응답 형식

```json
{
  "error": {
    "code": "SKILL_TIMEOUT",
    "message": "스킬 실행 시간 초과 (30초)",
    "step": "2-3",
    "skillId": "customer-needs-analysis",
    "retryCount": 1,
    "recoverable": true
  }
}
```

---

## 7. Security Considerations

- [x] 기존 JWT + RBAC 인증 체계 활용
- [x] HITL 승인은 org_id 기반 권한 확인
- [ ] 파이프라인 시작/취소는 admin/manager 역할만 (Sprint 134)
- [ ] HITL 승인/거부 이력 감사 로그 (Sprint 134)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| Unit Test | OrchestrationService 상태 전환 로직 | Vitest |
| Unit Test | HITL 체크포인트 판정 로직 | Vitest |
| Integration Test | API 엔드포인트 (start/hitl/retry) | Hono app.request() |
| E2E Test | 파이프라인 시작→HITL→완료 흐름 | Playwright (Sprint 135) |

### 8.2 Sprint 132 테스트 케이스

- [ ] Happy path: start → 2-0~2-2 연속 실행 → complete
- [ ] HITL: 2-5 Commit Gate에서 paused → approve → 계속
- [ ] HITL reject: 2-5에서 reject → cancelled 상태
- [ ] Failure + retry: 스킬 실패 → retry → 성공
- [ ] Failure + skip: 스킬 실패 → skip → 다음 단계
- [ ] Cancel: 진행 중 cancel 요청 → cancelled 상태
- [ ] Shaping trigger: 2-10 완료 → shaping-a 자동 전환
- [ ] Data contract: DiscoveryToShapingPayload 검증

---

## 9. State Machine Definition

### 9.1 상태 전환 다이어그램

```
                          ┌──────────┐
                          │  idle    │
                          └────┬─────┘
                               │ start()
                               ▼
                    ┌──────────────────┐
              ┌────▶│  running:{step}  │◀────┐
              │     └──────┬───────────┘     │
              │            │                 │
              │     ┌──────┴───────┐         │
              │     ▼              ▼         │
              │ [is_hitl?]    [complete?]     │
              │     │              │          │
              │     ▼ YES          ▼ YES     │
              │ ┌────────────┐  ┌──────────┐ │
              │ │ paused:hitl│  │ completed│ │
              │ └──┬────┬────┘  └──────────┘ │
              │    │    │                     │
              │ approve skip                  │
              │    │    │                     │
              │    ▼    ▼                     │
              │    └────┘─────────────────────┘
              │
              │  retry()
              │ ┌────────────┐
              └─│  failed    │
                └────────────┘
                     ▲
                     │ fail()
                     │
              ┌──────┴──────┐
              │ running:{step} (error)
              └─────────────┘

          reject() / cancel()
                     │
                     ▼
              ┌─────────────┐
              │  cancelled   │
              └─────────────┘
```

### 9.2 단계 순서 정의

```typescript
const STEP_ORDER: string[] = [
  '2-0',  // 아이디어 분류
  '2-1',  // 유형 분류 + 레퍼런스 분석
  '2-2',  // 시장 기회 분석
  '2-3',  // 고객 니즈 분석
  '2-4',  // 솔루션 설계
  '2-5',  // Commit Gate (HITL 필수)
  '2-6',  // 시장 규모 분석
  '2-7',  // 사업성 평가
  '2-8',  // 경쟁력 분석
  '2-9',  // 리스크 평가
  '2-10', // 최종 보고서
  // --- 발굴→형상화 전환점 ---
  'shaping-a', // 입력 점검
  'shaping-b', // req-interview
  'shaping-c', // O-G-D 형상화 루프
  'shaping-d', // 교차 검토 + Six Hats
  'shaping-e', // 전문가 5종 리뷰
  'shaping-f', // HITL 최종 게이트
];

function getNextStep(current: string): string | null {
  const idx = STEP_ORDER.indexOf(current);
  return idx >= 0 && idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : null;
}

function isHitlCheckpoint(step: string): boolean {
  return step in HITL_CHECKPOINTS;
}
```

---

## 10. Implementation Guide

### 10.1 Sprint 132 파일 구조

```
packages/api/src/
├── db/migrations/
│   └── 0090_pipeline_orchestration.sql        ← 신규
├── schemas/
│   └── pipeline-orchestration.schema.ts       ← 신규
├── services/
│   └── pipeline-orchestration-service.ts      ← 신규 (핵심)
├── routes/
│   └── pipeline-orchestration.ts              ← 신규

packages/web/src/
├── components/feature/discovery/
│   ├── PipelineControlPanel.tsx               ← 신규
│   ├── PipelineStatusBar.tsx                  ← 신규
│   ├── HitlCheckpointDialog.tsx               ← 신규
│   └── PipelineFailurePanel.tsx               ← 신규
├── hooks/
│   └── usePipelineOrchestration.ts            ← 신규 (폴링 + 상태 관리)
└── routes/ax-bd/
    └── discovery-detail.tsx                   ← 수정 (파이프라인 컴포넌트 통합)

packages/shared/src/
└── types/pipeline-orchestration.ts            ← 신규 (공유 타입)
```

### 10.2 Implementation Order (Sprint 132)

1. [ ] `0090_pipeline_orchestration.sql` — D1 마이그레이션
2. [ ] `pipeline-orchestration.schema.ts` — Zod 스키마 + 타입 정의
3. [ ] `pipeline-orchestration-service.ts` — 상태 머신 + CRUD + advance 로직
4. [ ] `pipeline-orchestration.ts` (route) — REST API 엔드포인트
5. [ ] API 단위 테스트 — 상태 전환 + HITL + 실패 복구
6. [ ] `usePipelineOrchestration.ts` — React hook (폴링 + 상태)
7. [ ] `PipelineStatusBar.tsx` — 진행률 UI
8. [ ] `PipelineControlPanel.tsx` — 시작/중단 UI
9. [ ] `HitlCheckpointDialog.tsx` — 승인/거부/건너뛰기
10. [ ] `PipelineFailurePanel.tsx` — 실패 복구 UI
11. [ ] `discovery-detail.tsx` 수정 — 파이프라인 컴포넌트 통합
12. [ ] 통합 테스트 — 2-0→2-10→shaping-a 전환 동작

### 10.3 핵심 서비스 시그니처

```typescript
// services/pipeline-orchestration-service.ts

export class PipelineOrchestrationService {
  constructor(
    private db: D1Database,
    private skillExecutor: BdSkillExecutor,
    private shapingService: ShapingService,
  ) {}

  // 파이프라인 시작
  async start(orgId: string, userId: string, input: StartOrchestrationInput): Promise<PipelineOrchestration>;

  // 상태 조회
  async getStatus(id: string, orgId: string): Promise<PipelineOrchestration | null>;

  // 이벤트 로그 조회
  async getLogs(id: string, orgId: string): Promise<PipelineStepLog[]>;

  // 현재 단계 실행 (내부)
  private async executeStep(orchestration: PipelineOrchestration): Promise<void>;

  // 다음 단계로 진행
  async advance(id: string, orgId: string): Promise<PipelineOrchestration>;

  // HITL 응답 처리
  async respondHitl(id: string, orgId: string, response: HitlResponse): Promise<PipelineOrchestration>;

  // 실패 단계 재시도
  async retry(id: string, orgId: string): Promise<PipelineOrchestration>;

  // 파이프라인 취소
  async cancel(id: string, orgId: string, reason?: string): Promise<PipelineOrchestration>;

  // 발굴→형상화 전환 (내부)
  private async transitionToShaping(orchestration: PipelineOrchestration): Promise<void>;

  // 활성 파이프라인 목록
  async listActive(orgId: string): Promise<PipelineOrchestration[]>;
}
```

---

## 11. Sprint 133~136 확장 포인트

Sprint 132 설계는 확장 가능하도록 다음 포인트를 열어둠:

| Sprint | 확장 | 접합 지점 |
|--------|------|-----------|
| 133 F314 | 자동 순차 실행 루프 | `executeStep()` 내부에서 while 루프 + delay |
| 134 F315 | 알림 | `pipeline_step_log` INSERT 후 webhook 호출 |
| 134 F315 | 권한 | route 미들웨어에 role 체크 추가 |
| 135 F316 | E2E | mock API로 파이프라인 흐름 테스트 |
| 136 F317 | 백업 | `output_data` 컬럼 기반 스냅샷 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-04 | 초안: 전체 아키텍처 + Sprint 132 상세 설계 | Sinclair Seo |
