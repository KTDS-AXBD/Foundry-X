---
code: FX-DSGN-S141
title: "Sprint 141 — F323 대시보드 ToDo + F324 발굴 탭 통합 Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 141
f_items: [F323, F324]
plan_ref: "[[FX-PLAN-S141]]"
---

# FX-DSGN-S141 — 대시보드 ToDo + 발굴 탭 통합 Design

## §1 설계 목표

1. dashboard.tsx에 ToDo List(아이템별 단계+다음 할 일) + 업무 가이드 추가 (F323)
2. /discovery를 3탭(대시보드/프로세스/BMC) 통합 페이지로 전환 (F324)

## §2 기존 자산 분석

| 자산 | 위치 | Lines | 활용 |
|------|------|:-----:|------|
| `dashboard.tsx` | `src/routes/dashboard.tsx` | 314 | 하단에 TodoSection + WorkGuide 추가 |
| `discover-dashboard.tsx` | `src/routes/ax-bd/discover-dashboard.tsx` | 188 | 발굴 대시보드 탭 콘텐츠 (이미 Tabs 사용) |
| `discovery.tsx` | `src/routes/ax-bd/discovery.tsx` | 39 | 프로세스 탭 콘텐츠 |
| `ideas-bmc.tsx` | `src/routes/ax-bd/ideas-bmc.tsx` | 44 | BMC 탭 콘텐츠 |
| `ProcessStageGuide` | `src/components/feature/ProcessStageGuide.tsx` | — | STAGES 상수 재활용 |
| `Tabs` | `src/components/ui/tabs.tsx` | — | shadcn/ui Tabs (이미 사용 중) |

## §3 상세 설계

### 파일 1: `src/components/feature/TodoSection.tsx` (신규)

```tsx
/**
 * F323 — 대시보드 ToDo List
 * 아이템별 현재 단계 + 다음 할 일 + 의사결정 대기
 */
interface TodoItem {
  bizItemId: string;
  title: string;
  currentStage: number; // 1~6
  stageName: string;
  nextAction: string;
  nextActionHref: string;
  pendingDecision?: boolean; // Go/Hold/Drop 투표 대기
}

export function TodoSection() {
  // API: GET /biz-items/summary → 아이템별 단계 정보
  // 클라이언트에서 nextAction 계산 (stage 기반)
  // 렌더: 카드 리스트 + Stage Indicator (6단계 도트)
}
```

**Stage Indicator 컴포넌트:**
- 6개 원형 도트 (수집→발굴→형상화→검증→제품화→GTM)
- 현재 단계: primary 색상 + 확대
- 완료 단계: success 색상 + 체크
- 미도달: muted 색상

**다음 할 일 계산 로직:**
| 현재 단계 | nextAction | nextActionHref |
|:---------:|-----------|----------------|
| 1 (수집) | "아이디어 등록" | /discovery |
| 2 (발굴) | "평가 실행" | /discovery?tab=process |
| 3 (형상화) | "사업기획서 작성" | /shaping/business-plan |
| 4 (검증) | "검증 기록" | /validation |
| 5 (제품화) | "MVP/PoC 추적" | /product |
| 6 (GTM) | "선제안 작성" | /gtm/outreach |

검증 기준:
- [x] TodoSection 컴포넌트 신규 생성
- [x] Stage Indicator 6단계 시각화
- [x] 아이템별 nextAction + href 계산
- [x] 의사결정 대기 뱃지 (pendingDecision)
- [x] 아이템이 없을 때 빈 상태 UI
- [x] API 로딩/에러 상태 처리

### 파일 2: `src/components/feature/WorkGuideSection.tsx` (신규)

```tsx
/**
 * F323 — 업무 가이드
 * 검증 흐름 / 제품화 / 개발 파이프라인 / 오프라인 활동 안내
 */
const GUIDES = [
  {
    title: "4단계 검증 흐름",
    description: "본부 검증 → 전사 검증 → Pre-PRB(비용투자 심의) → 임원 보고 → 최종 의사결정",
    icon: CheckCircle,
    href: "/validation",
  },
  {
    title: "5단계 제품화",
    description: "MVP와 PoC를 병렬 진행 가능. Offering Pack으로 최종 패키징",
    icon: Rocket,
    href: "/product",
  },
  {
    title: "개발 파이프라인",
    description: "PRD → 요구사항 인터뷰 → PDCA 문서 → Sprint 실행 → 배포",
    icon: GitBranch,
    href: "/shaping/prd",
  },
  {
    title: "오프라인 활동",
    description: "전문가 인터뷰, 유관부서 미팅 일정 관리",
    icon: CalendarDays,
    href: "/validation?tab=meetings",
  },
] as const;

export function WorkGuideSection() {
  // Collapsible 카드 4개 — 접기/펼치기
  // 각 카드 클릭 시 해당 메뉴로 이동
}
```

검증 기준:
- [x] WorkGuideSection 컴포넌트 신규 생성
- [x] 4개 가이드 카드 렌더링
- [x] 접기/펼치기 동작
- [x] 정적 콘텐츠 (API 호출 없음)

### 파일 3: `src/routes/dashboard.tsx` (수정)

기존 대시보드 하단에 두 섹션 추가:

```tsx
import { TodoSection } from "@/components/feature/TodoSection";
import { WorkGuideSection } from "@/components/feature/WorkGuideSection";

// ... 기존 코드 유지 ...

{/* F323: ToDo List + 업무 가이드 */}
<section className="mt-8 space-y-6">
  <TodoSection />
  <WorkGuideSection />
</section>
```

검증 기준:
- [x] TodoSection 임포트 + 렌더링
- [x] WorkGuideSection 임포트 + 렌더링
- [x] 기존 대시보드 콘텐츠 영향 없음
- [x] 레이아웃 일관성 유지

### 파일 4: `src/routes/discovery-unified.tsx` (신규)

```tsx
/**
 * F324 — 발굴 통합 페이지
 * 3탭: 대시보드 / 프로세스 / BMC
 * URL: /discovery?tab=dashboard|process|bmc
 */
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Map, Lightbulb } from "lucide-react";

// 기존 페이지 컴포넌트를 lazy import
const DiscoverDashboard = lazy(() => import("@/routes/ax-bd/discover-dashboard"));
const DiscoveryProcess = lazy(() => import("@/routes/ax-bd/discovery"));
const IdeasBmc = lazy(() => import("@/routes/ax-bd/ideas-bmc"));

export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "dashboard";

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold font-display">발굴</h1>
        <p className="text-muted-foreground">사업 아이템 발굴 · 분석 · 평가</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <TabsList>
          <TabsTrigger value="dashboard">
            <BarChart3 className="mr-2 size-4" /> 대시보드
          </TabsTrigger>
          <TabsTrigger value="process">
            <Map className="mr-2 size-4" /> 프로세스
          </TabsTrigger>
          <TabsTrigger value="bmc">
            <Lightbulb className="mr-2 size-4" /> BMC
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Suspense fallback={<div>로딩 중...</div>}>
            <DiscoverDashboard />
          </Suspense>
        </TabsContent>
        <TabsContent value="process">
          <Suspense fallback={<div>로딩 중...</div>}>
            <DiscoveryProcess />
          </Suspense>
        </TabsContent>
        <TabsContent value="bmc">
          <Suspense fallback={<div>로딩 중...</div>}>
            <IdeasBmc />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

검증 기준:
- [x] 3탭 (대시보드/프로세스/BMC) 렌더링
- [x] URL searchParams로 탭 상태 관리
- [x] 대시보드 탭이 기본 랜딩
- [x] 기존 컴포넌트를 lazy import로 래핑
- [x] /discovery?tab=bmc 등 URL 직접 접근 동작

### 파일 5: `src/router.tsx` (수정)

```typescript
// 기존:
// { path: "discovery", lazy: () => import("@/routes/ax-bd/discover-dashboard") },
// 변경:
{ path: "discovery", lazy: () => import("@/routes/discovery-unified") },
```

검증 기준:
- [x] /discovery → discovery-unified 라우트 연결
- [x] 기존 /discovery/items, /discovery/ideas-bmc 리다이렉트 유지 (F322)
- [x] /discovery/report (평가 결과서) 라우트 유지 (별도 메뉴)

## §4 구현 순서 (Sprint Worktree용)

| 단계 | F# | 파일 | 예상 |
|:----:|:--:|------|:----:|
| 1 | F323 | `TodoSection.tsx` 신규 | 60m |
| 2 | F323 | `WorkGuideSection.tsx` 신규 | 30m |
| 3 | F323 | `dashboard.tsx` 수정 | 15m |
| 4 | F324 | `discovery-unified.tsx` 신규 | 45m |
| 5 | F324 | `router.tsx` 수정 | 10m |
| 6 | 공통 | typecheck + build + E2E | 30m |
| | | **합계** | **~3h** |

## §5 수정 허용 파일 목록

```
packages/web/src/components/feature/TodoSection.tsx (신규)
packages/web/src/components/feature/WorkGuideSection.tsx (신규)
packages/web/src/routes/dashboard.tsx
packages/web/src/routes/discovery-unified.tsx (신규)
packages/web/src/router.tsx
packages/web/e2e/**/*.spec.ts
```

**수정 금지**: SPEC.md, MEMORY.md, CLAUDE.md, packages/api/**, packages/cli/**

## §6 검증 매트릭스

| # | 검증 항목 | 기준 |
|:-:|----------|------|
| V1 | TodoSection 렌더 | 아이템 0건: 빈 상태 UI / N건: 카드 리스트 |
| V2 | Stage Indicator | 6단계 도트, 현재 단계 하이라이트 |
| V3 | nextAction 계산 | stage 1→6 각각 올바른 href |
| V4 | WorkGuideSection | 4개 카드 렌더 + 접기/펼치기 |
| V5 | 발굴 3탭 | 대시보드/프로세스/BMC 탭 전환 |
| V6 | URL 탭 연동 | /discovery?tab=bmc → BMC 탭 활성 |
| V7 | 대시보드 기본 랜딩 | /discovery → 대시보드 탭 |
| V8 | 기존 리다이렉트 | /discovery/items → /discovery 동작 |
| V9 | typecheck | 0 errors |
| V10 | build | 성공 |
