# Sprint 156 Design — 발굴 완료 리포트 9탭 프레임 + 4탭 선 구현

> **Plan**: `docs/01-plan/features/sprint-156.plan.md`
> **Sprint**: 156
> **Phase**: 15 — Discovery UI/UX 고도화 v2
> **Date**: 2026-04-05
> **Status**: Draft

---

## 1. 설계 목표

Sprint 156에서 구현하는 항목:

| F-item | 범위 | 핵심 산출물 |
|--------|------|------------|
| **F346** | 리포트 공통 컴포넌트 + 9탭 프레임 + 집계 API | 5개 공통 컴포넌트, 리포트 페이지, GET API, CSS 토큰 |
| **F347** | 리포트 탭 4종 선 구현 (2-1~2-4) | 4개 탭 컴포넌트 + Recharts 차트 통합 |

---

## 2. DB 스키마

### 2.1 신규 마이그레이션 (Sprint 154 미merge 대응)

`0098_discovery_reports.sql`:

```sql
-- Sprint 156: F346 — 발굴 완료 리포트 테이블
CREATE TABLE IF NOT EXISTS ax_discovery_reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  report_json TEXT NOT NULL DEFAULT '{}',  -- 9탭 데이터 JSON
  overall_verdict TEXT CHECK (overall_verdict IN ('go','conditional','hold','drop')),
  team_decision TEXT CHECK (team_decision IN ('go','hold','drop')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(biz_item_id)  -- 아이템당 1개 리포트
);

CREATE INDEX IF NOT EXISTS idx_adr_biz_item ON ax_discovery_reports(biz_item_id);
CREATE INDEX IF NOT EXISTS idx_adr_org ON ax_discovery_reports(org_id);
```

### 2.2 기존 테이블 활용

| 테이블 | 용도 | 핵심 컬럼 |
|--------|------|-----------|
| `biz_items` | 발굴 아이템 정보 | id, title, discovery_type, status |
| `biz_item_discovery_stages` | 단계 진행 상태 | stage(2-0~2-10), status, output_json |

> 참고: 집계 API는 `biz_item_discovery_stages`에서 stage별 데이터를 조회하여 리포트 데이터를 구성해요.
> `ax_discovery_reports.report_json`에는 집계된 결과를 캐싱.

---

## 3. API 설계

### 3.1 GET /api/ax-bd/discovery-report/:itemId

발굴 아이템의 단계별 output_json을 집계하여 9탭 리포트 데이터를 반환.

**Request**: `GET /api/ax-bd/discovery-report/:itemId`

**Response** (200):
```typescript
{
  id: string;
  bizItemId: string;
  title: string;
  type: 'I' | 'M' | 'P' | 'T' | 'S';
  completedStages: string[];      // ['2-1', '2-2', ...]
  overallProgress: number;         // 0~100
  tabs: {
    '2-1'?: ReferenceAnalysisData;
    '2-2'?: MarketValidationData;
    '2-3'?: CompetitiveLandscapeData;
    '2-4'?: OpportunityIdeationData;
    '2-5'?: Record<string, unknown>;  // Sprint 157
    '2-6'?: Record<string, unknown>;
    '2-7'?: Record<string, unknown>;
    '2-8'?: Record<string, unknown>;
    '2-9'?: Record<string, unknown>;
  };
}
```

**Error**: 404 (아이템 미존재), 401 (미인증)

**로직**:
1. `biz_items` 존재 + orgId 검증
2. `biz_item_discovery_stages` WHERE biz_item_id + status = 'completed' 조회
3. 각 stage의 `output_json` 파싱 → 탭별 데이터 구조로 정규화
4. `ax_discovery_reports`에 캐싱 (있으면 갱신, 없으면 생성)
5. 응답 반환

### 3.2 Zod 스키마

```typescript
// packages/api/src/schemas/discovery-report.ts
import { z } from "zod";

export const DiscoveryReportParamsSchema = z.object({
  itemId: z.string().min(1),
});

export const DiscoveryReportResponseSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  title: z.string(),
  type: z.enum(["I", "M", "P", "T", "S"]).nullable(),
  completedStages: z.array(z.string()),
  overallProgress: z.number(),
  tabs: z.record(z.string(), z.unknown()),
});
```

---

## 4. 공유 타입 정의

### 4.1 packages/shared/src/types/discovery-report.ts

```typescript
/** 탭 2-1: 레퍼런스 분석 */
export interface ReferenceAnalysisData {
  threeLayers?: {
    macro: Array<{ factor: string; trend: string; impact: string }>;
    meso: Array<{ factor: string; trend: string; impact: string }>;
    micro: Array<{ factor: string; trend: string; impact: string }>;
  };
  jtbd?: Array<{
    job: string;
    current: string;
    painLevel: number;
    frequency: string;
  }>;
  competitors?: Array<{
    name: string;
    strength: string;
    weakness: string;
    share?: string;
  }>;
}

/** 탭 2-2: 시장 검증 */
export interface MarketValidationData {
  tam?: { value: number; unit: string; description: string };
  sam?: { value: number; unit: string; description: string };
  som?: { value: number; unit: string; description: string };
  painPoints?: Array<{
    pain: string;
    severity: number;  // 1~10
    frequency: string;
    segment: string;
  }>;
  roi?: {
    investment: number;
    return: number;
    period: string;
    metrics: Array<{ label: string; value: string }>;
  };
}

/** 탭 2-3: 경쟁 구도 */
export interface CompetitiveLandscapeData {
  swot?: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  porter?: {
    axes: Array<{ axis: string; score: number; description: string }>;
  };
  positioning?: Array<{
    name: string;
    x: number; // 예: 가격
    y: number; // 예: 품질
    isOurs?: boolean;
  }>;
}

/** 탭 2-4: 기회 도출 */
export interface OpportunityIdeationData {
  hmw?: Array<{
    question: string;
    category: string;
    priority: number;
  }>;
  bmc?: {
    keyPartners: string[];
    keyActivities: string[];
    keyResources: string[];
    valuePropositions: string[];
    customerRelationships: string[];
    channels: string[];
    customerSegments: string[];
    costStructure: string[];
    revenueStreams: string[];
  };
  phases?: Array<{
    phase: string;
    description: string;
    duration: string;
    deliverables: string[];
  }>;
}

/** 전체 리포트 응답 */
export interface DiscoveryReportResponse {
  id: string;
  bizItemId: string;
  title: string;
  type: 'I' | 'M' | 'P' | 'T' | 'S' | null;
  completedStages: string[];
  overallProgress: number;
  tabs: {
    '2-1'?: ReferenceAnalysisData;
    '2-2'?: MarketValidationData;
    '2-3'?: CompetitiveLandscapeData;
    '2-4'?: OpportunityIdeationData;
    [key: string]: unknown;
  };
}
```

---

## 5. 컴포넌트 설계

### 5.1 공통 컴포넌트 (F346)

| 컴포넌트 | Props | 설명 |
|----------|-------|------|
| `StepHeader` | `stepNum: string, title: string, color: string` | 탭 헤더 — 단계 번호 원형 배지 + 제목 + 색상 라인 |
| `InsightBox` | `icon?: ReactNode, title: string, children: ReactNode, collapsible?: boolean` | AI 인사이트 카드 — 아이콘 + 텍스트 + 접기/펼치기 |
| `MetricCard` | `label: string, value: string \| number, trend?: 'up' \| 'down' \| 'neutral', unit?: string` | 숫자 메트릭 카드 — 라벨 + 큰 숫자 + 트렌드 화살표 |
| `NextStepBox` | `stepNum: string, title: string, description: string, href?: string` | 다음 단계 안내 CTA — 화살표 아이콘 + 설명 + 링크 |
| `HITLBadge` | `status?: 'pending' \| 'approved' \| 'rejected'` | Human-in-the-Loop 상태 배지 |

**위치**: `packages/web/src/components/feature/discovery/report/`

### 5.2 디자인 토큰 (F346)

`packages/web/src/styles/discovery-tokens.css`:

```css
:root {
  /* Discovery 시맨틱 토큰 — PRD §8.5 */
  --discovery-mint: #00b493;      /* 2-1, 2-2 */
  --discovery-blue: #3182f6;      /* 2-3, 2-4 */
  --discovery-amber: #f59e0b;     /* 2-5, 2-6, 2-7 */
  --discovery-red: #f04452;       /* 2-8 */
  --discovery-purple: #8b5cf6;    /* 2-9 */

  --discovery-mint-bg: #e6f9f4;
  --discovery-blue-bg: #e8f1fe;
  --discovery-amber-bg: #fef3c7;
  --discovery-red-bg: #fee2e2;
  --discovery-purple-bg: #f3e8ff;
}
```

### 5.3 9탭 리포트 프레임 (F346)

**파일**: `packages/web/src/routes/ax-bd/discovery-report.tsx`
**라우트**: `/discovery/items/:id/report`

```
┌──────────────────────────────────────────────────────┐
│ ← 뒤로    아이템명    Type M — 시장·타겟형    Badge  │
├──────────────────────────────────────────────────────┤
│ [2-1][2-2][2-3][2-4][2-5][2-6][2-7][2-8][2-9]       │
├──────────────────────────────────────────────────────┤
│                                                      │
│  (active tab content — Lazy Loaded)                  │
│                                                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**핵심 구현**:
- `React.lazy()` + `Suspense`로 각 탭 Lazy Loading
- `useParams`에서 itemId 추출, `useSearchParams`에서 tab 파라미터
- 탭별 색상은 discovery-tokens.css 활용
- 미구현 탭(2-5~2-9)은 "Coming Soon" placeholder

### 5.4 탭 컴포넌트 (F347)

**위치**: `packages/web/src/components/feature/discovery/report/tabs/`

#### ReferenceAnalysisTab (2-1)

```
┌─ StepHeader ─────────────────────────────────┐
│ 2-1  레퍼런스 분석                    🟢 mint │
├──────────────────────────────────────────────┤
│ ┌─ 3-Layer Table ──────────────────────────┐ │
│ │ Macro | Meso | Micro                     │ │
│ │ 각 row: factor, trend, impact            │ │
│ └──────────────────────────────────────────┘ │
│ ┌─ JTBD 비교 카드 ────────────────────────┐ │
│ │ Job | Current | Pain Level | Frequency   │ │
│ └──────────────────────────────────────────┘ │
│ ┌─ 경쟁 비교표 ──────────────────────────┐  │
│ │ Name | Strength | Weakness | Share       │ │
│ └──────────────────────────────────────────┘ │
│ ┌─ InsightBox ─────────────────────────────┐ │
│ │ 💡 AI 분석 요약                          │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

#### MarketValidationTab (2-2)

```
┌─ StepHeader ─────────────────────────────────┐
│ 2-2  시장 검증                        🟢 mint │
├──────────────────────────────────────────────┤
│ ┌─ MetricCard x3 ─────────────────────────┐ │
│ │ TAM: 1.2조원 │ SAM: 3,000억 │ SOM: 500억│ │
│ └──────────────────────────────────────────┘ │
│ ┌─ TAM/SAM/SOM PieChart (Recharts) ───────┐ │
│ │       🟢 TAM                             │ │
│ │     🔵 SAM                               │ │
│ │   🟡 SOM                                 │ │
│ └──────────────────────────────────────────┘ │
│ ┌─ Pain Point 맵 ─────────────────────────┐ │
│ │ Severity × Frequency scatter             │ │
│ └──────────────────────────────────────────┘ │
│ ┌─ ROI 표 ────────────────────────────────┐ │
│ │ Investment | Return | Period             │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

#### CompetitiveLandscapeTab (2-3)

```
┌─ StepHeader ─────────────────────────────────┐
│ 2-3  경쟁 구도                        🔵 blue │
├──────────────────────────────────────────────┤
│ ┌─ SWOT 4분면 ────────────────────────────┐ │
│ │  Strengths   │  Weaknesses              │ │
│ │ ─────────────┼──────────────────────     │ │
│ │ Opportunities│  Threats                  │ │
│ └──────────────────────────────────────────┘ │
│ ┌─ Porter Radar (Recharts RadarChart) ────┐ │
│ │ 5 Forces 기반 축                         │ │
│ └──────────────────────────────────────────┘ │
│ ┌─ 포지셔닝맵 (Recharts ScatterChart) ───┐  │
│ │ X: 가격 / Y: 품질 (경쟁사 점 표시)      │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

#### OpportunityIdeationTab (2-4)

```
┌─ StepHeader ─────────────────────────────────┐
│ 2-4  기회 도출                        🔵 blue │
├──────────────────────────────────────────────┤
│ ┌─ HMW 카드 리스트 ──────────────────────┐  │
│ │ "How Might We..." 카드 × N개            │ │
│ │ 카테고리 배지 + 우선순위 표시            │ │
│ └──────────────────────────────────────────┘ │
│ ┌─ BMC 9블록 그리드 ─────────────────────┐  │
│ │ KP │ KA │ VP │ CR │ CS                  │ │
│ │    │ KR │    │ CH │                     │ │
│ │────┴────┴────┴────┴────                 │ │
│ │ Cost Structure  │  Revenue Streams      │ │
│ └──────────────────────────────────────────┘ │
│ ┌─ Phase 타임라인 ────────────────────────┐ │
│ │ Phase 1 → Phase 2 → Phase 3 → ...       │ │
│ │ 각 phase: 설명 + 기간 + 산출물          │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

---

## 6. 구현 순서 + 검증 체크리스트

| 순서 | 작업 | 파일 | 검증 |
|------|------|------|------|
| 1 | D1 마이그레이션 0098 | `packages/api/src/db/migrations/0098_discovery_reports.sql` | ✅ CREATE TABLE 성공 |
| 2 | Zod 스키마 | `packages/api/src/schemas/discovery-report.ts` | ✅ 타입 체크 |
| 3 | DiscoveryReportService | `packages/api/src/services/discovery-report-service.ts` | ✅ 집계 로직 테스트 |
| 4 | GET /ax-bd/discovery-report/:itemId 라우트 | `packages/api/src/routes/discovery-report.ts` | ✅ API 응답 200 |
| 5 | app.ts 라우트 등록 | `packages/api/src/app.ts` | ✅ 라우트 등록 |
| 6 | 공유 타입 | `packages/shared/src/types/discovery-report.ts` | ✅ 타입 체크 |
| 7 | recharts 설치 | `packages/web/package.json` | ✅ import 성공 |
| 8 | CSS 시맨틱 토큰 | `packages/web/src/styles/discovery-tokens.css` | ✅ CSS 변수 동작 |
| 9 | 공통 컴포넌트 5종 | `packages/web/src/components/feature/discovery/report/` | ✅ 각 렌더 테스트 |
| 10 | API 클라이언트 함수 | `packages/web/src/lib/api-client.ts` | ✅ 타입 체크 |
| 11 | 9탭 프레임 페이지 | `packages/web/src/routes/ax-bd/discovery-report.tsx` | ✅ 탭 전환 동작 |
| 12 | 라우터 등록 | `packages/web/src/router.tsx` | ✅ 라우트 접근 |
| 13 | ReferenceAnalysisTab | `report/tabs/ReferenceAnalysisTab.tsx` | ✅ 테이블 렌더 |
| 14 | MarketValidationTab | `report/tabs/MarketValidationTab.tsx` | ✅ PieChart 렌더 |
| 15 | CompetitiveLandscapeTab | `report/tabs/CompetitiveLandscapeTab.tsx` | ✅ RadarChart 렌더 |
| 16 | OpportunityIdeationTab | `report/tabs/OpportunityIdeationTab.tsx` | ✅ BMC 그리드 렌더 |
| 17 | discovery-detail → 리포트 링크 | `packages/web/src/routes/ax-bd/discovery-detail.tsx` | ✅ 링크 동작 |

---

## 7. 데이터 fallback 전략

output_json이 비정형이거나 누락된 경우:

```typescript
// 각 탭 컴포넌트에서 사용하는 안전 파싱 패턴
function parseTabData<T>(raw: unknown, fallback: T): T {
  if (!raw || typeof raw !== 'object') return fallback;
  return raw as T; // Zod 검증은 API 레이어에서 수행
}

// 탭 컴포넌트 내부
const data = parseTabData<ReferenceAnalysisData>(tabData, {});
if (!data.threeLayers) {
  return <EmptyState message="레퍼런스 분석 데이터가 아직 없어요" />;
}
```

---

## 8. 테스트 전략

### 8.1 API 테스트

```typescript
// packages/api/src/__tests__/discovery-report.test.ts
describe("GET /api/ax-bd/discovery-report/:itemId", () => {
  it("should return aggregated report for item with stages", ...);
  it("should return 404 for non-existent item", ...);
  it("should return empty tabs for item with no completed stages", ...);
  it("should cache report in ax_discovery_reports", ...);
});
```

### 8.2 컴포넌트 테스트

- 각 공통 컴포넌트: 렌더 테스트 (props → 출력)
- 각 탭 컴포넌트: 데이터 있을 때 + 없을 때 (EmptyState)
- 9탭 프레임: 탭 전환 + URL 파라미터 동기화

---

## 9. Worker 파일 매핑

### Worker 1: API (Backend)

**수정 허용 파일:**
- `packages/api/src/db/migrations/0098_discovery_reports.sql`
- `packages/api/src/services/discovery-report-service.ts`
- `packages/api/src/schemas/discovery-report.ts`
- `packages/api/src/routes/discovery-report.ts`
- `packages/api/src/app.ts` (라우트 등록 1줄)
- `packages/api/src/__tests__/discovery-report.test.ts`
- `packages/api/src/__tests__/helpers/mock-d1.ts` (테이블 추가)
- `packages/shared/src/types/discovery-report.ts`

### Worker 2: Web (Frontend)

**수정 허용 파일:**
- `packages/web/package.json` (recharts 추가)
- `packages/web/src/styles/discovery-tokens.css`
- `packages/web/src/components/feature/discovery/report/StepHeader.tsx`
- `packages/web/src/components/feature/discovery/report/InsightBox.tsx`
- `packages/web/src/components/feature/discovery/report/MetricCard.tsx`
- `packages/web/src/components/feature/discovery/report/NextStepBox.tsx`
- `packages/web/src/components/feature/discovery/report/HITLBadge.tsx`
- `packages/web/src/components/feature/discovery/report/tabs/ReferenceAnalysisTab.tsx`
- `packages/web/src/components/feature/discovery/report/tabs/MarketValidationTab.tsx`
- `packages/web/src/components/feature/discovery/report/tabs/CompetitiveLandscapeTab.tsx`
- `packages/web/src/components/feature/discovery/report/tabs/OpportunityIdeationTab.tsx`
- `packages/web/src/routes/ax-bd/discovery-report.tsx`
- `packages/web/src/routes/ax-bd/discovery-detail.tsx` (리포트 링크 추가)
- `packages/web/src/router.tsx` (라우트 등록 1줄)
- `packages/web/src/lib/api-client.ts` (fetchDiscoveryReport 함수 추가)

---

## 10. 의사결정 기록

| 결정 | 대안 | 선택 | 이유 |
|------|------|------|------|
| 리포트 라우트 경로 | `/discovery/report/:id` | `/discovery/items/:id/report` | 기존 detail 경로(`/discovery/items/:id`) 하위로 자연스러운 계층 |
| 탭 상태 관리 | Zustand | URL searchParams | 북마크/공유 가능, 브라우저 뒤로가기 지원 |
| 차트 라이브러리 | Chart.js, D3 | Recharts | React 네이티브, tree-shaking, 기존 생태계 호환 |
| output_json 파싱 | strict Zod | 관용적 파싱 + fallback | 비정형 데이터 대응. strict하면 기존 데이터 파싱 실패 위험 |
| Lazy Loading | 전탭 한 번에 | `React.lazy` 탭별 | 초기 번들 절감, 미활성 탭은 불필요 |
