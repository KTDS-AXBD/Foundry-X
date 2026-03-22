---
code: FX-DSGN-043
title: "Sprint 43 — 온보딩 데이터 수집 결과 + 모델 품질 대시보드 UI 상세 설계 (F114+F143)"
version: 1.0
status: Active
category: DSGN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-43
sprint: 43
phase: "Phase 5a"
references:
  - "[[FX-PLAN-043]]"
  - "[[FX-DSGN-041]]"
---

## 1. 설계 개요

### 1.1 목적

Sprint 35에서 완성된 `ModelMetricsService` API(2 endpoints)의 프론트엔드 시각화를 구현하고,
F114 온보딩 4주 데이터 수집 결과를 정리하여 Phase 4 최종 Go 판정을 완료한다.

### 1.2 설계 원칙

| 원칙 | 적용 |
|------|------|
| **기존 패턴 준수** | TokensPage의 Card+Table 패턴 유지, fetchApi 활용 |
| **차트 라이브러리 미도입** | CSS Grid + 조건부 배경색으로 히트맵 구현 (외부 의존성 0) |
| **Tabs 컴포넌트 재사용** | `@axis-ds/ui-react` Tabs 이미 설치됨 — 추가 설치 불필요 |
| **shared 타입 동기화** | API 서비스 인터페이스를 shared/web.ts에 프론트엔드용으로 복제 |
| **API 변경 없음** | 기존 2 endpoints 그대로 소비 |

---

## 2. 아키텍처

### 2.1 컴포넌트 트리

```
TokensPage (page.tsx)
├── Tabs
│   ├── TabsTrigger: "Usage"
│   │   └── [기존] Summary Card + TokenUsageChart × 2
│   │
│   └── TabsTrigger: "Model Quality"
│       └── ModelQualityTab
│           ├── PeriodFilter (7d / 30d / 90d)
│           ├── QualityMetricCard × N (모델 수)
│           │   ├── 성공률 프로그레스 바
│           │   ├── 평균 응답시간
│           │   ├── 실행당 비용
│           │   └── 토큰 효율
│           └── AgentModelHeatmap
│               ├── 행: Agent 이름
│               ├── 열: Model 이름
│               └── 셀: 실행횟수 + 성공률 기반 배경색
```

### 2.2 데이터 흐름

```
TokensPage
  │
  ├─ [Usage 탭] useEffect → fetchApi("/tokens/summary") → setSummary
  │
  └─ [Model Quality 탭] useEffect → Promise.all([
  │     fetchApi("/tokens/model-quality?days={days}"),
  │     fetchApi("/tokens/agent-model-matrix?days={days}")
  │   ]) → setMetrics, setMatrix
  │
  └─ PeriodFilter onChange → days 상태 변경 → re-fetch
```

### 2.3 Lazy Loading 전략

탭 전환 시 데이터를 불필요하게 로드하지 않도록:
- **Usage 탭**: 페이지 로드 시 즉시 fetch (기존 동작 유지)
- **Model Quality 탭**: 탭 최초 활성화 시에만 fetch (lazy)
- `activeTab` 상태로 조건부 fetch — `useEffect` deps에 `[activeTab, days]`

---

## 3. 상세 설계

### 3.1 shared 타입 추가 (`packages/shared/src/web.ts`)

```typescript
// ─── Sprint 43: Model Quality Types (F143 UI) ───

/** F143: 모델별 품질 메트릭 (GET /tokens/model-quality 응답) */
export interface ModelQualityMetric {
  model: string;
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  successRate: number;        // 0~100
  avgDurationMs: number;
  totalCostUsd: number;
  avgCostPerExecution: number;
  tokenEfficiency: number;    // tokens/dollar
}

/** F143: 에이전트×모델 교차 셀 (GET /tokens/agent-model-matrix 응답) */
export interface AgentModelCell {
  agentName: string;
  model: string;
  executions: number;
  totalCostUsd: number;
  avgDurationMs: number;
  successRate: number;        // 0~100
}

/** F143: 모델 품질 API 응답 */
export interface ModelQualityResponse {
  metrics: ModelQualityMetric[];
  period: { from: string; to: string };
}

/** F143: 에이전트×모델 매트릭스 API 응답 */
export interface AgentModelMatrixResponse {
  matrix: AgentModelCell[];
  period: { from: string; to: string };
}
```

### 3.2 API 클라이언트 함수 추가 (`packages/web/src/lib/api-client.ts`)

```typescript
// ─── Sprint 43: Model Quality API (F143 UI) ───

export async function getModelQuality(
  days = 30,
  projectId?: string,
): Promise<ModelQualityResponse> {
  const params = new URLSearchParams({ days: String(days) });
  if (projectId) params.set("projectId", projectId);
  return fetchApi<ModelQualityResponse>(`/tokens/model-quality?${params}`);
}

export async function getAgentModelMatrix(
  days = 30,
  projectId?: string,
): Promise<AgentModelMatrixResponse> {
  const params = new URLSearchParams({ days: String(days) });
  if (projectId) params.set("projectId", projectId);
  return fetchApi<AgentModelMatrixResponse>(`/tokens/agent-model-matrix?${params}`);
}
```

### 3.3 TokensPage 리팩토링 (`packages/web/src/app/(app)/tokens/page.tsx`)

현재 구조를 Tabs로 감싸고, 기존 내용을 "Usage" 탭으로, 새 ModelQualityTab을 "Model Quality" 탭으로 배치:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ModelQualityTab from "@/components/feature/ModelQualityTab";

export default function TokensPage() {
  // ... 기존 summary state 유지

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Token & Cost Management</h1>
      <Tabs defaultValue="usage">
        <TabsList className="mb-4">
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="quality">Model Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="usage">
          {/* 기존 Summary Card + TokenUsageChart × 2 — 그대로 이동 */}
        </TabsContent>

        <TabsContent value="quality">
          <ModelQualityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 3.4 ModelQualityTab 컴포넌트 (`packages/web/src/components/feature/ModelQualityTab.tsx`)

```
Props: 없음 (자체 상태 관리)

State:
  - metrics: ModelQualityMetric[] | null
  - matrix: AgentModelCell[] | null
  - days: 7 | 30 | 90 (기본 30)
  - loading: boolean
  - error: string | null

Effect:
  - [days] 변경 시 → Promise.all([getModelQuality(days), getAgentModelMatrix(days)])

Render:
  1. PeriodFilter: 3개 버튼 (7일 / 30일 / 90일), active 상태 표시
  2. loading → "Loading model quality data..."
  3. error → 에러 메시지
  4. metrics 비어있을 때 → "No model execution data available."
  5. QualityMetricCard 목록 (metrics.map)
  6. AgentModelHeatmap (matrix)
```

### 3.5 QualityMetricCard 컴포넌트 (`packages/web/src/components/feature/QualityMetricCard.tsx`)

```
Props:
  - metric: ModelQualityMetric

Render:
  Card 안에:
  ┌───────────────────────────────────────┐
  │ claude-3-sonnet               98% ✅  │  ← 모델명 + 성공률 배지
  │─────────────────────────────────────── │
  │ ████████████████████░░  98%           │  ← 성공률 프로그레스 바
  │─────────────────────────────────────── │
  │ Executions   Duration   Cost    Eff.  │
  │ 1,245        320ms      $0.12   8.5K  │  ← 4개 지표
  └───────────────────────────────────────┘

  성공률 색상 규칙:
  - >= 90%: text-green-500
  - >= 70%: text-yellow-500
  - < 70%: text-destructive
```

### 3.6 AgentModelHeatmap 컴포넌트 (`packages/web/src/components/feature/AgentModelHeatmap.tsx`)

```
Props:
  - matrix: AgentModelCell[]

데이터 변환:
  1. matrix flat array → 2D grid 변환
     - rows = unique agentNames (정렬)
     - cols = unique models (정렬)
     - grid[agent][model] = { executions, successRate, totalCostUsd }
  2. 빈 셀 → null

Render:
  CSS Grid 기반 테이블:
  ┌──────────┬──────────┬──────────┬──────────┐
  │          │ sonnet   │ haiku    │ opus     │  ← 모델 헤더
  ├──────────┼──────────┼──────────┼──────────┤
  │ reviewer │ 120/98%  │ 45/95%   │   —      │  ← 실행횟수/성공률
  │ planner  │ 80/92%   │   —      │ 30/100%  │
  │ test     │ 200/96%  │ 150/88%  │   —      │
  └──────────┴──────────┴──────────┴──────────┘

  셀 배경색 (성공률 기반):
  - >= 90%: bg-green-100 dark:bg-green-900/20
  - >= 70%: bg-yellow-100 dark:bg-yellow-900/20
  - < 70%:  bg-red-100 dark:bg-red-900/20
  - null:   bg-muted (빈 셀)

  셀 내용:
  - 첫 줄: 실행횟수 (bold)
  - 둘째 줄: 성공률% (작은 텍스트)
  - 호버 툴팁: 비용 + 평균 응답시간

  구현: HTML <table> + Tailwind CSS classes (shadcn Table 재사용)
```

### 3.7 PeriodFilter 패턴

별도 컴포넌트 분리하지 않고 ModelQualityTab 내부에 인라인 구현:

```tsx
const PERIODS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
] as const;

// 버튼 그룹 렌더링
<div className="mb-4 flex gap-2">
  {PERIODS.map((p) => (
    <button
      key={p.value}
      onClick={() => setDays(p.value)}
      className={cn(
        "rounded-md px-3 py-1 text-sm",
        days === p.value
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-accent"
      )}
    >
      {p.label}
    </button>
  ))}
</div>
```

---

## 4. F114 Phase 4 최종 판정 설계

### 4.1 판정 문서 구조 (`docs/specs/phase4-final-verdict.md`)

```markdown
# Phase 4 최종 Go/No-Go 판정서

## 1. 판정 요약
- 판정: Go / No-Go / Conditional
- 판정일: 2026-03-22
- 판정자: Sinclair Seo

## 2. 판정 기준 충족 현황

| 기준 | 목표 | 실측 | 달성 |
|------|------|------|:----:|
| NPS 평균 | ≥ 7.0 | {실측값} | ✅/❌ |
| 체크리스트 완료율 | ≥ 80% | {실측값} | ✅/❌ |
| 주요 블로커 | 0건 | {실측값} | ✅/❌ |
| API 테스트 패스율 | 100% | 925/925 | ✅ |
| Track A 완료율 | 18/18 | 18/18 | ✅ |
| 프로덕션 배포 | 정상 | Workers+Pages OK | ✅ |

## 3. 온보딩 데이터 요약
- 대상: 내부 5명
- 기간: 4주
- NPS 분포, 주요 피드백, 개선 제안

## 4. 결론 및 Phase 5 전환 근거
```

### 4.2 데이터 수집 방법

온보딩 데이터는 2가지 소스에서 수집:
1. **D1 remote**: `onboarding_feedback` 테이블 (NPS 점수 + 코멘트)
2. **D1 remote**: `onboarding_steps` 테이블 (체크리스트 완료 이력)

```bash
# NPS 데이터 조회
wrangler d1 execute foundry-x-db --remote --command \
  "SELECT nps_score, comment, created_at FROM onboarding_feedback ORDER BY created_at DESC"

# 온보딩 진행률 조회
wrangler d1 execute foundry-x-db --remote --command \
  "SELECT user_id, step_id, completed_at FROM onboarding_steps WHERE completed_at IS NOT NULL"
```

---

## 5. 테스트 전략

### 5.1 컴포넌트 테스트 (Vitest + @testing-library/react)

| 테스트 파일 | 대상 | 케이스 |
|------------|------|--------|
| `ModelQualityTab.test.tsx` | ModelQualityTab | 로딩 상태, 데이터 렌더링, 기간 변경, 빈 데이터, 에러 상태 |
| `QualityMetricCard.test.tsx` | QualityMetricCard | 높은 성공률(녹색), 중간(노랑), 낮은(빨강), 포맷팅 |
| `AgentModelHeatmap.test.tsx` | AgentModelHeatmap | 매트릭스 렌더링, 빈 셀 처리, 색상 코딩, 빈 데이터 |
| `TokensPage.test.tsx` | TokensPage (수정) | 탭 전환, Usage 탭 유지, Model Quality 탭 렌더링 |

### 5.2 Mock 전략

```typescript
// API mock — vi.mock("@/lib/api-client")
vi.mock("@/lib/api-client", () => ({
  fetchApi: vi.fn(),
  getModelQuality: vi.fn().mockResolvedValue({
    metrics: [
      {
        model: "claude-3-sonnet",
        totalExecutions: 100,
        successCount: 95,
        failedCount: 5,
        successRate: 95,
        avgDurationMs: 320,
        totalCostUsd: 12.5,
        avgCostPerExecution: 0.125,
        tokenEfficiency: 8500,
      },
    ],
    period: { from: "2026-02-20", to: "2026-03-22" },
  }),
  getAgentModelMatrix: vi.fn().mockResolvedValue({
    matrix: [
      { agentName: "reviewer", model: "claude-3-sonnet", executions: 50, totalCostUsd: 5.0, avgDurationMs: 300, successRate: 96 },
      { agentName: "planner", model: "claude-3-sonnet", executions: 30, totalCostUsd: 3.0, avgDurationMs: 450, successRate: 90 },
    ],
    period: { from: "2026-02-20", to: "2026-03-22" },
  }),
}));
```

### 5.3 예상 테스트 수

| 파일 | 케이스 |
|------|:------:|
| ModelQualityTab.test.tsx | 5 |
| QualityMetricCard.test.tsx | 4 |
| AgentModelHeatmap.test.tsx | 4 |
| TokensPage.test.tsx (수정) | 3 |
| **합계** | **16** |

---

## 6. 구현 순서

```
Step 1: shared/web.ts — ModelQualityMetric, AgentModelCell 등 4개 타입 추가
Step 2: api-client.ts — getModelQuality(), getAgentModelMatrix() 함수 추가
Step 3: QualityMetricCard.tsx — 개별 모델 카드 컴포넌트
Step 4: AgentModelHeatmap.tsx — Agent×Model 히트맵 컴포넌트
Step 5: ModelQualityTab.tsx — 컨테이너 (API 연동 + 기간 필터)
Step 6: TokensPage 리팩토링 — Tabs 적용 (Usage / Model Quality)
Step 7: 테스트 작성 (4 파일, 16+ 케이스)
Step 8: typecheck + lint 통과 확인
Step 9: F114 Phase 4 최종 판정 문서 작성
```

---

## 7. 파일 변경 요약

| 파일 | 변경 | 설명 |
|------|:----:|------|
| `packages/shared/src/web.ts` | 수정 | 4개 타입 추가 |
| `packages/web/src/lib/api-client.ts` | 수정 | 2개 함수 추가 |
| `packages/web/src/app/(app)/tokens/page.tsx` | 수정 | Tabs 리팩토링 |
| `packages/web/src/components/feature/ModelQualityTab.tsx` | **신규** | 모델 품질 탭 컨테이너 |
| `packages/web/src/components/feature/QualityMetricCard.tsx` | **신규** | 모델 품질 카드 |
| `packages/web/src/components/feature/AgentModelHeatmap.tsx` | **신규** | 히트맵 |
| `packages/web/src/__tests__/ModelQualityTab.test.tsx` | **신규** | 탭 테스트 |
| `packages/web/src/__tests__/QualityMetricCard.test.tsx` | **신규** | 카드 테스트 |
| `packages/web/src/__tests__/AgentModelHeatmap.test.tsx` | **신규** | 히트맵 테스트 |
| `docs/specs/phase4-final-verdict.md` | **신규** | Phase 4 최종 판정서 |
