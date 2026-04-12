---
code: FX-DSGN-S133
title: "Sprint 133 — 발굴 연속 스킬 파이프라인 + HITL 체크포인트 Design"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-04
updated: 2026-04-04
author: Sinclair Seo
references: "[[FX-PLAN-S133]], [[FX-DSGN-S132]], [[FX-SPEC-001]]"
---

# Sprint 133 Design: 발굴 연속 스킬 파이프라인 + HITL 체크포인트

## 1. 개요

F314: 발굴 2-0~2-10 자동 순차 실행 + HITL 체크포인트(사업성 Commit Gate) 사용자 승인 UI.
Sprint 132의 상태 머신 기반 위에, 자동 실행 엔진과 사용자 승인 레이어를 추가한다.

**핵심 의존 (Sprint 132)**:
- `PipelineStateMachine` — FSM 엔진
- `DiscoveryPipelineService` — 파이프라인 CRUD
- `PipelineErrorHandler` — 에러 복구
- `ShapingOrchestratorService` — 형상화 자동 실행

**기존 서비스 활용**:
- `BdSkillExecutor` (F260) — 스킬 실행 엔진
- `ViabilityCheckpointService` (F213) — 사업성 Go/Pivot/Drop 판단
- `DiscoveryStageService` (F263) — 단계 진행 추적

## 2. D1 스키마

### 마이그레이션: `0091_pipeline_checkpoints.sql`

```sql
-- F314: HITL 파이프라인 체크포인트

CREATE TABLE IF NOT EXISTS pipeline_checkpoints (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  pipeline_run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,          -- '2-1', '2-3', '2-5', '2-7'
  checkpoint_type TEXT NOT NULL DEFAULT 'viability'
    CHECK(checkpoint_type IN ('viability', 'commit_gate')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'approved', 'rejected', 'expired')),
  questions TEXT,                  -- JSON: 체크포인트 질문 목록
  response TEXT,                   -- JSON: 사용자 응답
  decided_by TEXT,
  decided_at TEXT,
  deadline TEXT,                   -- 만료 시간 (24h 기본)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_pc_run ON pipeline_checkpoints(pipeline_run_id, step_id);
CREATE INDEX idx_pc_status ON pipeline_checkpoints(status);
```

## 3. Zod 스키마 확장

### `packages/api/src/schemas/discovery-pipeline.ts` 추가

```typescript
// ── HITL Checkpoint ──
export const CHECKPOINT_STEPS = ["2-1", "2-3", "2-5", "2-7"] as const;
export const COMMIT_GATE_STEP = "2-5";

export const checkpointDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  responses: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    signal: z.enum(["go", "pivot", "drop"]).optional(),
  })).optional(),
  reason: z.string().max(2000).optional(),
});
export type CheckpointDecision = z.infer<typeof checkpointDecisionSchema>;

// ── Auto Advance Request ──
export const autoAdvanceSchema = z.object({
  fromStep: z.string().min(1).optional(),
  skipCheckpoints: z.boolean().default(false),
});
export type AutoAdvanceInput = z.infer<typeof autoAdvanceSchema>;
```

## 4. 서비스 설계

### 4.1 SkillPipelineRunner (`skill-pipeline-runner.ts`)

발굴 2-0~2-10 자동 순차 실행 엔진.

**핵심 로직**:
```
runNextStep(pipelineRunId, currentStep):
  1. currentStep의 스킬 조회 (bd_skills WHERE stage_id = currentStep)
  2. 스킬이 있으면 BdSkillExecutor.execute() 호출
  3. reportStepComplete(runId, currentStep)
  4. nextStep = getNextStep(currentStep)
  5. isCheckpoint(nextStep)?
     → 예: createCheckpoint + pipeline pause
     → 아니오: return { nextStep, autoAdvance: true }
```

**체크포인트 단계 정의**:
```typescript
const CHECKPOINT_CONFIG: Record<string, { type: string; questions: string[] }> = {
  "2-1": {
    type: "viability",
    questions: ["이 아이디어는 우리 역량에 부합하나요?", "기존 사업과의 시너지가 있나요?"],
  },
  "2-3": {
    type: "viability",
    questions: ["시장 규모(TAM)가 충분한가요?", "경쟁 강도가 적정한가요?"],
  },
  "2-5": {
    type: "commit_gate",
    questions: [
      "TAM이 최소 기준(100억원)을 충족하나요?",
      "차별화된 경쟁 우위가 있나요?",
      "검증 가능한 수익 모델이 있나요?",
      "실행 가능한 팀 역량이 있나요?",
    ],
  },
  "2-7": {
    type: "viability",
    questions: ["파일럿 결과가 기대에 부합하나요?", "스케일 업이 가능한 구조인가요?"],
  },
};
```

**핵심 메서드**:
- `runNextStep(pipelineRunId, orgId, userId): Promise<StepResult>` — 다음 단계 실행
- `executeStepSkills(bizItemId, stepId, orgId, userId): Promise<void>` — 해당 단계의 스킬들 실행
- `isCheckpoint(stepId): boolean` — 체크포인트 여부
- `getStepSkills(stepId): Promise<Skill[]>` — 단계별 스킬 목록

### 4.2 PipelineCheckpointService (`pipeline-checkpoint-service.ts`)

HITL 체크포인트 CRUD + 승인/거부/타임아웃.

**핵심 메서드**:
- `createCheckpoint(runId, stepId): Promise<Checkpoint>` — 체크포인트 생성 (질문 포함, deadline=24h)
- `approve(checkpointId, userId, decision): Promise<void>` — 승인 + 다음 단계 자동 시작
- `reject(checkpointId, userId, reason): Promise<void>` — 거부 + 파이프라인 paused
- `listByRun(runId): Promise<Checkpoint[]>` — 체크포인트 목록
- `getActive(runId): Promise<Checkpoint | null>` — 현재 대기 중인 체크포인트

## 5. API 엔드포인트 (추가 4개)

### `packages/api/src/routes/discovery-pipeline.ts` 확장

| # | Method | Path | 설명 |
|---|--------|------|------|
| 11 | POST | `/discovery-pipeline/runs/:id/auto-advance` | 다음 단계 자동 실행 (체크포인트 시 정지) |
| 12 | GET | `/discovery-pipeline/runs/:id/checkpoints` | 체크포인트 목록 |
| 13 | POST | `/discovery-pipeline/runs/:id/checkpoints/:cpId/approve` | 체크포인트 승인 |
| 14 | POST | `/discovery-pipeline/runs/:id/checkpoints/:cpId/reject` | 체크포인트 거부 |

## 6. Web 컴포넌트

### 6.1 CheckpointReviewPanel (`CheckpointReviewPanel.tsx`)

체크포인트 대기 상태에서 사용자에게 질문을 보여주고 승인/거부를 받는 패널.

- 체크포인트 유형 표시 (사업성 체크 / Commit Gate)
- 질문 목록 + 각 질문에 대한 응답 입력
- Commit Gate(2-5): 4개 질문 모두 응답 필수, Go/Pivot/Drop 신호등
- 승인/거부 버튼 + 거부 사유 입력
- 마감 시한(deadline) 카운트다운

### 6.2 AutoAdvanceToggle (`AutoAdvanceToggle.tsx`)

파이프라인의 자동 진행 on/off 토글.

- 현재 단계 + 다음 단계 표시
- "자동 진행" 버튼 → POST auto-advance 호출
- 체크포인트 대기 중이면 "승인 필요" 뱃지 표시
- 진행 상태 로딩 인디케이터

### 6.3 PipelineTimeline 확장

기존 PipelineTimeline에 체크포인트 마커 추가.
- 체크포인트 단계(2-1, 2-3, 2-5, 2-7)에 방패 아이콘 + 노란색 링
- 2-5 Commit Gate는 빨간 방패 (특별 표시)
- 체크포인트 pending 시 깜빡이는 애니메이션

## 7. 테스트 설계

### 7.1 `skill-pipeline-runner.test.ts`
- runNextStep: 2-0 → 2-1 진행 + 스킬 실행 확인
- 체크포인트 단계: 2-1에서 자동 정지 + checkpoint 생성
- 비체크포인트 단계: 2-2에서 자동 진행
- 2-10 완료 시 shouldTriggerShaping=true

### 7.2 `pipeline-checkpoint-service.test.ts`
- createCheckpoint: 질문 목록 + deadline 설정
- approve: status=approved + 파이프라인 resume
- reject: status=rejected + 파이프라인 paused
- Commit Gate: 4개 질문 응답 검증

### 7.3 `discovery-pipeline-route-extended.test.ts`
- POST /auto-advance: 다음 단계 실행 + 결과 반환
- GET /checkpoints: 목록 조회
- POST /checkpoints/:cpId/approve: 승인 + 자동 진행
- POST /checkpoints/:cpId/reject: 거부 + paused
- 인증 없이 접근: 401

## 8. 파일 목록 (구현 순서)

| # | 파일 | 유형 | 설명 |
|---|------|------|------|
| 1 | `packages/api/src/db/migrations/0091_pipeline_checkpoints.sql` | D1 | 체크포인트 테이블 |
| 2 | `packages/api/src/schemas/discovery-pipeline.ts` | Schema | 스키마 확장 (체크포인트, auto-advance) |
| 3 | `packages/api/src/services/skill-pipeline-runner.ts` | Service | 자동 순차 실행 엔진 |
| 4 | `packages/api/src/services/pipeline-checkpoint-service.ts` | Service | HITL 체크포인트 CRUD |
| 5 | `packages/api/src/routes/discovery-pipeline.ts` | Route | 4 EP 추가 |
| 6 | `packages/web/src/components/feature/discovery/CheckpointReviewPanel.tsx` | Web | 체크포인트 승인 UI |
| 7 | `packages/web/src/components/feature/discovery/AutoAdvanceToggle.tsx` | Web | 자동 진행 토글 |
| 8 | `packages/web/src/components/feature/discovery/PipelineTimeline.tsx` | Web | 체크포인트 마커 추가 |
| 9 | `packages/api/src/__tests__/skill-pipeline-runner.test.ts` | Test | 러너 테스트 |
| 10 | `packages/api/src/__tests__/pipeline-checkpoint-service.test.ts` | Test | 체크포인트 테스트 |
| 11 | `packages/api/src/__tests__/discovery-pipeline-route-extended.test.ts` | Test | 라우트 확장 테스트 |
