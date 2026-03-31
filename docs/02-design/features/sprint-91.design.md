---
code: FX-DSGN-S91
title: "Sprint 91 — BD 프로세스 진행 추적 + 사업성 신호등"
version: 1.0
status: Draft
category: DSGN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-PLAN-S91]], [[FX-SPEC-001]], [[FX-DSGN-S90]]"
---

# Sprint 91 Design: BD 프로세스 진행 추적 + 사업성 신호등

## §1 개요

biz-item별 BD 프로세스 진행 상태를 통합 조회하는 Aggregation Layer를 구축한다.
기존 5개 서비스(Pipeline, Viability, Decision, Artifact, DiscoveryProgress)의 데이터를 합쳐서
"현재 어디까지 왔는지 + 사업성은 어떤지 + 다음 단계는 무엇인지"를 한눈에 보여준다.

### 핵심 원칙
- **새 DB 테이블 없음**: 기존 테이블 조합으로 통합 뷰 생성 (Aggregation only)
- **배치 조회**: 포트폴리오 조회 시 N+1 방지를 위해 한 번에 여러 아이템 처리
- **기존 UI 확장**: Discovery 페이지에 Progress Tracker 탭 추가

## §2 D1 스키마

**새 마이그레이션 불필요** — 다음 기존 테이블을 조합:

| 테이블 | 용도 | 핵심 컬럼 |
|--------|------|----------|
| `biz_items` | 아이템 기본 정보 | id, title, status, org_id |
| `pipeline_stages` | 파이프라인 단계 추적 | biz_item_id, stage, entered_at, exited_at |
| `ax_viability_checkpoints` | 사업성 체크포인트 | biz_item_id, stage(2-1~2-7), decision |
| `ax_commit_gates` | Commit Gate 결정 | biz_item_id, final_decision |
| `decisions` | Go/Hold/Drop 이력 | biz_item_id, decision, stage |
| `bd_artifacts` | 산출물 현황 | biz_item_id, stage_id, status |

## §3 API 서비스 설계

### 3.1 BdProcessTracker (`services/bd-process-tracker.ts`)

통합 진행 상태 조회 서비스. 기존 서비스를 직접 호출하지 않고, 효율을 위해 직접 SQL 배치 조회한다.

```typescript
export interface DiscoveryStageProgress {
  stageId: string;       // "2-0" ~ "2-10"
  stageName: string;     // "아이템 등록", "시장 조사", ...
  hasArtifacts: boolean; // 산출물 존재 여부
  artifactCount: number;
  checkpoint?: {         // 사업성 체크포인트 (2-1~2-7만)
    decision: string;    // "go" | "pivot" | "drop"
    decidedAt: string;
  };
}

export interface ProcessProgress {
  bizItemId: string;
  title: string;
  status: string;
  // Pipeline (7단계 상위)
  pipelineStage: string;      // "REGISTERED" | ... | "MVP"
  pipelineEnteredAt: string;
  // Discovery (11단계 내부)
  currentDiscoveryStage: string;  // 가장 최근 산출물이 있는 단계
  discoveryStages: DiscoveryStageProgress[];
  completedStageCount: number;
  totalStageCount: number;      // 11 (2-0 ~ 2-10)
  // 사업성 신호등
  trafficLight: {
    overallSignal: "green" | "yellow" | "red";
    go: number;
    pivot: number;
    drop: number;
    pending: number;
  };
  commitGate: {
    decision: string;
    decidedAt: string;
  } | null;
  // 최근 의사결정
  lastDecision: {
    decision: string;
    stage: string;
    comment: string;
    decidedAt: string;
  } | null;
}

export interface PortfolioSummary {
  totalItems: number;
  bySignal: { green: number; yellow: number; red: number };
  byPipelineStage: Record<string, number>;
  avgCompletionRate: number;
  bottleneck: {
    stageId: string;
    stageName: string;
    itemCount: number;
  } | null;
}
```

**메서드:**

| 메서드 | 설명 |
|--------|------|
| `getItemProgress(bizItemId, orgId)` | 단일 아이템 진행 상태 |
| `getPortfolioProgress(orgId, filters?)` | 포트폴리오 전체 진행 + 요약 |
| `getPortfolioSummary(orgId)` | 신호등 집계 + 병목 탐지 |

### 3.2 Discovery Stage 매핑

11단계(2-0~2-10)의 이름 매핑:

```typescript
export const DISCOVERY_STAGES = [
  { id: "2-0", name: "아이템 등록" },
  { id: "2-1", name: "시장 조사" },
  { id: "2-2", name: "경쟁 분석" },
  { id: "2-3", name: "고객 분석" },
  { id: "2-4", name: "비즈니스 모델" },
  { id: "2-5", name: "Commit Gate" },
  { id: "2-6", name: "기술 검증" },
  { id: "2-7", name: "시제품 검증" },
  { id: "2-8", name: "사업 계획서" },
  { id: "2-9", name: "투자 심사" },
  { id: "2-10", name: "최종 보고" },
] as const;
```

진행 상태 판단 로직:
- `bd_artifacts`에 해당 `stage_id`의 `completed` 산출물이 있으면 → 해당 단계 완료
- `ax_viability_checkpoints`에 해당 stage 체크포인트가 있으면 → 체크포인트 결정 포함
- `currentDiscoveryStage` = 산출물이 있는 가장 높은 단계 번호

### 3.3 배치 조회 전략

포트폴리오 조회 시 N+1 방지:

```sql
-- 1회 쿼리: 모든 아이템의 현재 pipeline stage
SELECT ps.biz_item_id, ps.stage, ps.entered_at, bi.title, bi.status
FROM pipeline_stages ps
JOIN biz_items bi ON bi.id = ps.biz_item_id
WHERE ps.org_id = ? AND ps.exited_at IS NULL;

-- 1회 쿼리: 모든 체크포인트
SELECT biz_item_id, stage, decision, decided_at
FROM ax_viability_checkpoints
WHERE org_id = ?;

-- 1회 쿼리: 모든 commit gates
SELECT cg.biz_item_id, cg.final_decision, cg.decided_at
FROM ax_commit_gates cg
JOIN biz_items bi ON bi.id = cg.biz_item_id
WHERE bi.org_id = ?;

-- 1회 쿼리: 단계별 산출물 카운트
SELECT biz_item_id, stage_id, COUNT(*) as cnt
FROM bd_artifacts
WHERE org_id = ? AND status = 'completed'
GROUP BY biz_item_id, stage_id;

-- 1회 쿼리: 최근 의사결정
SELECT DISTINCT biz_item_id, decision, stage, comment, created_at
FROM decisions
WHERE org_id = ?
ORDER BY created_at DESC;
```

총 5회 쿼리로 전체 포트폴리오를 조립한다.

## §4 API 라우트 설계

### `routes/ax-bd-progress.ts`

| Method | Path | 설명 | 응답 |
|--------|------|------|------|
| GET | `/ax-bd/progress/:bizItemId` | 단일 아이템 진행 상태 | `ProcessProgress` |
| GET | `/ax-bd/progress` | 포트폴리오 진행 목록 | `{ items: ProcessProgress[], summary: PortfolioSummary }` |
| GET | `/ax-bd/progress/summary` | 포트폴리오 요약만 | `PortfolioSummary` |

쿼리 파라미터 (목록):
- `signal?: "green" | "yellow" | "red"` — 신호등 필터
- `pipelineStage?: PipelineStage` — 파이프라인 단계 필터
- `page?: number` (default 1)
- `limit?: number` (default 20, max 100)

## §5 Zod 스키마 (`schemas/bd-progress.schema.ts`)

```typescript
export const progressQuerySchema = z.object({
  signal: z.enum(["green", "yellow", "red"]).optional(),
  pipelineStage: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

## §6 Web UI 설계

### 6.1 컴포넌트 구조

```
packages/web/src/
├── routes/ax-bd/
│   └── progress.tsx           # Progress Tracker 페이지
├── components/feature/
│   ├── ProcessProgressCard.tsx # 아이템별 진행 카드
│   └── PortfolioSummary.tsx   # 포트폴리오 신호등 요약
└── lib/
    └── api-client.ts          # (기존) fetchApi + 타입 추가
```

### 6.2 ProcessProgressCard

아이템별 진행 상태를 한 장의 카드로 표현:

```
┌────────────────────────────────────────────┐
│ 🔵 AI Chatbot                   🟢 Green  │
│ Pipeline: DISCOVERY → 2/11 단계 완료       │
│                                            │
│ [■■□□□□□□□□□] 2-0 ✓ 2-1 ✓ 2-2 ... 2-10  │
│                                            │
│ 신호등: Go 2 | Pivot 0 | Drop 0 | 대기 5  │
│ Commit Gate: —                             │
│ 최근 결정: GO (2026-03-30) "시장 검증 완료"│
└────────────────────────────────────────────┘
```

### 6.3 PortfolioSummary

포트폴리오 수준 집계:

```
┌─────────────────────────────────────────┐
│ 📊 포트폴리오 요약                       │
│                                         │
│ 전체 12건 | 평균 완료율 34%              │
│                                         │
│ 🟢 8  🟡 3  🔴 1                       │
│                                         │
│ 병목: 2-4 비즈니스 모델 (4건 정체)       │
└─────────────────────────────────────────┘
```

### 6.4 페이지 라우팅

기존 Discovery 사이드바 하위에 `progress` 경로 추가:
- `/ax-bd/progress` — 포트폴리오 Progress Tracker

## §7 테스트 계획

### API 테스트 (`__tests__/bd-process-tracker.test.ts`)

| # | 테스트 | 검증 항목 |
|---|--------|----------|
| 1 | 산출물 없는 아이템 진행 조회 | 모든 단계 미완료, signal=green |
| 2 | 2-1, 2-2 산출물 있는 아이템 | completedStageCount=2, currentDiscoveryStage="2-2" |
| 3 | drop 체크포인트 포함 | trafficLight.overallSignal="red" |
| 4 | pivot 2개 포함 | trafficLight.overallSignal="yellow" |
| 5 | Commit Gate 있는 아이템 | commitGate 필드 populated |
| 6 | 포트폴리오 요약 | bySignal 집계 + bottleneck 탐지 |
| 7 | signal 필터 동작 | green/yellow/red 필터링 |
| 8 | 빈 포트폴리오 | 0건 정상 응답 |

### 라우트 테스트 (`__tests__/bd-progress-route.test.ts`)

| # | 테스트 | 검증 항목 |
|---|--------|----------|
| 1 | GET /ax-bd/progress/:bizItemId | 200 + ProcessProgress 스키마 |
| 2 | GET /ax-bd/progress | 200 + items + summary |
| 3 | GET /ax-bd/progress/summary | 200 + PortfolioSummary |
| 4 | GET /ax-bd/progress?signal=red | 필터 동작 |
| 5 | 존재하지 않는 아이템 | 404 |

### Web 테스트 (`__tests__/process-progress.test.tsx`)

| # | 테스트 | 검증 항목 |
|---|--------|----------|
| 1 | ProcessProgressCard 렌더링 | 단계 바 + 신호등 표시 |
| 2 | PortfolioSummary 렌더링 | 집계 수치 + 병목 표시 |
| 3 | 빈 상태 | 데이터 없음 안내 |
| 4 | 에러 상태 | 에러 메시지 표시 |

## §8 파일 매핑

| # | 파일 | 동작 | 설명 |
|---|------|------|------|
| 1 | `packages/api/src/services/bd-process-tracker.ts` | 신규 | Progress Tracker 서비스 |
| 2 | `packages/api/src/routes/ax-bd-progress.ts` | 신규 | Progress API 라우트 |
| 3 | `packages/api/src/schemas/bd-progress.schema.ts` | 신규 | Zod 스키마 |
| 4 | `packages/api/src/app.ts` | 수정 | 라우트 등록 |
| 5 | `packages/api/src/__tests__/bd-process-tracker.test.ts` | 신규 | 서비스 테스트 |
| 6 | `packages/api/src/__tests__/bd-progress-route.test.ts` | 신규 | 라우트 테스트 |
| 7 | `packages/web/src/routes/ax-bd/progress.tsx` | 신규 | Progress 페이지 |
| 8 | `packages/web/src/components/feature/ProcessProgressCard.tsx` | 신규 | 아이템 진행 카드 |
| 9 | `packages/web/src/components/feature/PortfolioSummary.tsx` | 신규 | 포트폴리오 요약 |
| 10 | `packages/web/src/__tests__/process-progress.test.tsx` | 신규 | Web 컴포넌트 테스트 |
| 11 | `packages/web/src/lib/api-client.ts` | 수정 | 타입 추가 |
| 12 | `packages/web/src/routes/ax-bd/index.tsx` | 수정 | 네비게이션 추가 |
