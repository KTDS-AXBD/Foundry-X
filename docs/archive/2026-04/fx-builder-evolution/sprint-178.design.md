---
code: FX-DSGN-S178
title: "Sprint 178 Design — M4: Builder Quality 대시보드 + 사용자 피드백 루프"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-06
updated: 2026-04-06
author: Claude Autopilot
sprint: 178
features: [F390, F391]
plan: "[[FX-PLAN-S178]]"
---

# Sprint 178 Design — M4: Builder Quality 대시보드 + 사용자 피드백 루프

## §1 개요

Sprint 178은 Phase 19 Builder Evolution의 마지막 마일스톤(M4)으로, 5차원 품질 점수를 시각화하는 대시보드(F390)와 사용자 수동 평가 + 자동-수동 상관관계 캘리브레이션(F391)을 구현해요.

**선행 코드**: Sprint 176의 `prototype_quality` D1 테이블 + `PrototypeQualityService`, Sprint 177의 Enhanced O-G-D 루프.

## §2 D1 마이그레이션

### 0112_user_evaluations.sql

```sql
-- Sprint 178: F391 — 사용자 수동 평가 테이블
CREATE TABLE IF NOT EXISTS user_evaluations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  job_id TEXT NOT NULL REFERENCES prototype_jobs(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  evaluator_role TEXT NOT NULL DEFAULT 'bd_team',
  build_score INTEGER NOT NULL CHECK(build_score BETWEEN 1 AND 5),
  ui_score INTEGER NOT NULL CHECK(ui_score BETWEEN 1 AND 5),
  functional_score INTEGER NOT NULL CHECK(functional_score BETWEEN 1 AND 5),
  prd_score INTEGER NOT NULL CHECK(prd_score BETWEEN 1 AND 5),
  code_score INTEGER NOT NULL CHECK(code_score BETWEEN 1 AND 5),
  overall_score INTEGER NOT NULL CHECK(overall_score BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ue_job_id ON user_evaluations(job_id);
CREATE INDEX IF NOT EXISTS idx_ue_org_id ON user_evaluations(org_id);
```

**설계 결정**: 수동 평가는 1~5 정수 스케일 (자동 점수의 0~1 실수와 매핑: 수동 1→자동 0.2, 수동 5→자동 1.0). `evaluator_role`은 `bd_team`, `customer`, `executive` 3종.

## §3 API Schema

### quality-dashboard-schema.ts

```typescript
import { z } from "zod";

export const QualityDashboardSummarySchema = z.object({
  totalPrototypes: z.number(),
  averageScore: z.number(),
  above80Count: z.number(),
  above80Pct: z.number(),
  totalCostSaved: z.number(),
  generationModes: z.record(z.string(), z.number()),
});

export const DimensionAverageSchema = z.object({
  build: z.number(),
  ui: z.number(),
  functional: z.number(),
  prd: z.number(),
  code: z.number(),
});

export const TrendPointSchema = z.object({
  date: z.string(),
  avgScore: z.number(),
  count: z.number(),
});

export const QualityTrendSchema = z.object({
  points: z.array(TrendPointSchema),
  period: z.string(),
});
```

### user-evaluation-schema.ts

```typescript
import { z } from "zod";

export const EVALUATOR_ROLES = ["bd_team", "customer", "executive"] as const;

export const CreateUserEvaluationSchema = z.object({
  jobId: z.string().min(1),
  evaluatorRole: z.enum(EVALUATOR_ROLES).default("bd_team"),
  buildScore: z.number().int().min(1).max(5),
  uiScore: z.number().int().min(1).max(5),
  functionalScore: z.number().int().min(1).max(5),
  prdScore: z.number().int().min(1).max(5),
  codeScore: z.number().int().min(1).max(5),
  overallScore: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export type CreateUserEvaluationInput = z.infer<typeof CreateUserEvaluationSchema>;

export const CorrelationResultSchema = z.object({
  dimension: z.string(),
  pearson: z.number(),
  sampleSize: z.number(),
  autoMean: z.number(),
  manualMean: z.number(),
});

export const CorrelationSummarySchema = z.object({
  correlations: z.array(CorrelationResultSchema),
  overallPearson: z.number(),
  totalEvaluations: z.number(),
  calibrationStatus: z.enum(["good", "needs_attention", "insufficient_data"]),
});
```

## §4 API Services

### quality-dashboard-service.ts

기존 `PrototypeQualityService.getStats()` 확장. 추가 메서드:

| 메서드 | 설명 |
|--------|------|
| `getSummary()` | 전체 통계 + 80점+ 비율 |
| `getDimensionAverages()` | 5차원 평균 (최신 라운드 기준) |
| `getTrend(days: number)` | 일별 평균 점수 추이 |

### user-evaluation-service.ts

| 메서드 | 설명 |
|--------|------|
| `create(orgId, input)` | 수동 평가 저장 |
| `listByJob(orgId, jobId)` | Job별 평가 목록 |
| `listAll(orgId)` | 전체 평가 (상관관계 계산용) |

### calibration-service.ts

| 메서드 | 설명 |
|--------|------|
| `computeCorrelation(orgId)` | 자동-수동 5차원 + overall Pearson 상관관계 + calibrationStatus 판정 |

**상관관계 계산**: Pearson r = Σ[(xi-x̄)(yi-ȳ)] / √[Σ(xi-x̄)²·Σ(yi-ȳ)²]. 최소 3쌍 이상에서만 계산.

**수동→자동 스케일 변환**: `(manualScore - 1) / 4` (1→0, 5→1)

## §5 API Routes

### quality-dashboard.ts

| Method | Path | 설명 |
|--------|------|------|
| GET | `/quality-dashboard/summary` | 전체 통계 (점수카드용) |
| GET | `/quality-dashboard/dimensions` | 5차원 평균 (레이더차트용) |
| GET | `/quality-dashboard/trend?days=30` | 시간별 추이 |

### user-evaluations.ts

| Method | Path | 설명 |
|--------|------|------|
| POST | `/user-evaluations` | 수동 평가 등록 |
| GET | `/user-evaluations/:jobId` | Job별 수동 평가 목록 |
| GET | `/user-evaluations/correlation` | 자동-수동 상관관계 |

## §6 Web 컴포넌트

### 페이지: builder-quality.tsx (신규)

라우트: `/builder-quality` — 사이드바 "Prototype" 하위에 "Quality" 추가.

**레이아웃 구성:**
```
┌──────────────────────────────────────┐
│  Builder Quality Dashboard    [F390] │
├──────────┬──────────┬────────┬───────┤
│ 평균점수 │ 80점+%  │ 절감액 │ 총 N  │  ← ScoreCardGrid (4칸)
├──────────┴──────────┴────────┴───────┤
│  [5차원 레이더]    │  [점수 추이]    │  ← 2-column
├────────────────────┴─────────────────┤
│  [비용 비교 CLI/API]                 │  ← CostComparison
├──────────────────────────────────────┤
│  [상관관계 분석]   [F391]            │  ← CorrelationPanel
└──────────────────────────────────────┘
```

### 컴포넌트 목록

| 컴포넌트 | 파일 | 설명 |
|----------|------|------|
| ScoreCardGrid | `components/feature/builder/ScoreCardGrid.tsx` | 4개 KPI 카드 |
| DimensionRadar | `components/feature/builder/DimensionRadar.tsx` | 5축 SVG 레이더 차트 |
| QualityTrendLine | `components/feature/builder/QualityTrendLine.tsx` | 일별 추이 SVG 라인 차트 |
| CostComparison | `components/feature/builder/CostComparison.tsx` | CLI/API 모드 비율 바 |
| CorrelationPanel | `components/feature/builder/CorrelationPanel.tsx` | 자동-수동 상관관계 표 |
| UserEvaluationModal | `components/feature/builder/UserEvaluationModal.tsx` | 5차원 수동 평가 폼 (prototype-detail에서 호출) |

### prototype-detail.tsx 수정

- "평가하기" 버튼 추가 → `UserEvaluationModal` 열기
- 수동 평가 목록 탭 추가 (기존 피드백 탭 옆)

### api-client.ts 추가 함수

```typescript
// F390 Quality Dashboard
export async function fetchQualityDashboardSummary() { ... }
export async function fetchQualityDimensions() { ... }
export async function fetchQualityTrend(days?: number) { ... }

// F391 User Evaluations
export async function submitUserEvaluation(data: CreateUserEvaluationInput) { ... }
export async function fetchUserEvaluations(jobId: string) { ... }
export async function fetchCorrelation() { ... }
```

### router.tsx 추가

```typescript
{ path: "builder-quality", lazy: () => import("@/routes/builder-quality") },
```

### sidebar.tsx 추가

"Prototype" 아래에 `{ href: "/builder-quality", label: "Quality", icon: BarChart3 }` 추가.

## §7 테스트 계획

### API 테스트

| 파일 | 테스트 내용 | 수 |
|------|-----------|-----|
| `quality-dashboard.test.ts` | summary/dimensions/trend API | 4 |
| `user-evaluations.test.ts` | CRUD + 유효성 검증 | 5 |
| `calibration-service.test.ts` | 상관관계 계산 정확성 | 4 |

### Web 테스트

| 파일 | 테스트 내용 | 수 |
|------|-----------|-----|
| `builder-quality.test.tsx` | 대시보드 렌더링 | 3 |
| `user-evaluation-modal.test.tsx` | 수동 평가 폼 | 2 |

**총 18개 테스트 예상**

## §8 파일 변경 매핑

### 신규 파일

| 패키지 | 파일 | 용도 |
|--------|------|------|
| api | `src/db/migrations/0112_user_evaluations.sql` | D1 마이그레이션 |
| api | `src/schemas/quality-dashboard-schema.ts` | 대시보드 Zod 스키마 |
| api | `src/schemas/user-evaluation-schema.ts` | 수동 평가 Zod 스키마 |
| api | `src/services/quality-dashboard-service.ts` | 대시보드 집계 서비스 |
| api | `src/services/user-evaluation-service.ts` | 수동 평가 CRUD 서비스 |
| api | `src/services/calibration-service.ts` | 상관관계 계산 서비스 |
| api | `src/routes/quality-dashboard.ts` | 대시보드 API 라우트 |
| api | `src/routes/user-evaluations.ts` | 수동 평가 API 라우트 |
| api | `src/__tests__/quality-dashboard.test.ts` | 대시보드 API 테스트 |
| api | `src/__tests__/user-evaluations.test.ts` | 수동 평가 API 테스트 |
| api | `src/__tests__/calibration-service.test.ts` | 상관관계 계산 테스트 |
| web | `src/routes/builder-quality.tsx` | 대시보드 페이지 |
| web | `src/components/feature/builder/ScoreCardGrid.tsx` | KPI 카드 |
| web | `src/components/feature/builder/DimensionRadar.tsx` | 레이더 차트 |
| web | `src/components/feature/builder/QualityTrendLine.tsx` | 추이 차트 |
| web | `src/components/feature/builder/CostComparison.tsx` | 비용 비교 |
| web | `src/components/feature/builder/CorrelationPanel.tsx` | 상관관계 패널 |
| web | `src/components/feature/builder/UserEvaluationModal.tsx` | 수동 평가 폼 |
| web | `src/__tests__/builder-quality.test.tsx` | 대시보드 테스트 |

### 수정 파일

| 패키지 | 파일 | 변경 내용 |
|--------|------|-----------|
| api | `src/app.ts` | 2 route 등록 |
| web | `src/router.tsx` | builder-quality 라우트 추가 |
| web | `src/components/sidebar.tsx` | Quality 메뉴 항목 추가 |
| web | `src/lib/api-client.ts` | 6 함수 추가 |
| web | `src/routes/prototype-detail.tsx` | 평가하기 버튼 + 수동 평가 탭 |

## §9 E2E Skip 항목

해당 없음 — 모든 기능이 코드로 구현 가능.

## §10 완료 기준 체크리스트

- [ ] D1 마이그레이션 `0112_user_evaluations.sql` 생성
- [ ] API: quality-dashboard route (3 endpoints) 동작
- [ ] API: user-evaluations route (3 endpoints) 동작
- [ ] API: calibration-service 상관관계 계산 정확
- [ ] Web: builder-quality 페이지 4섹션 렌더링
- [ ] Web: UserEvaluationModal 수동 평가 등록
- [ ] Web: CorrelationPanel 상관관계 시각화
- [ ] 18개+ 테스트 전부 pass
- [ ] typecheck 통과
- [ ] lint 통과
