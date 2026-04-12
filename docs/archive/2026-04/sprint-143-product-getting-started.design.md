---
code: FX-DSGN-S143
title: "Sprint 143 — F327 제품화 탭 통합 + F328 시작하기 통합 Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 143
f_items: [F327, F328]
plan_ref: "[[FX-PLAN-S143]]"
---

# FX-DSGN-S143 — 제품화 탭 통합 + 시작하기 통합 Design

## §1 설계 목표

1. /product를 2탭(MVP/PoC) 통합 페이지로 전환 + Offering Pack에 VersionBadge (F327)
2. /getting-started를 5영역 원스톱 허브로 확장 (F328)

## §2 기존 자산 분석

| 자산 | 위치 | Lines | 활용 |
|------|------|:-----:|------|
| `mvp-tracking.tsx` | 제품화 MVP | 246 | 탭 콘텐츠 |
| `product-poc.tsx` | 제품화 PoC | 260 | 탭 콘텐츠 |
| `offering-packs.tsx` | Offering Pack | 232 | VersionBadge 추가 |
| `getting-started.tsx` | 시작하기 | 668 | 5영역 확장 |
| `discovery-unified.tsx` | 발굴 탭 래퍼 | 61 | **패턴 참조** |
| `validation-unified.tsx` | 검증 탭 래퍼 | 70 | **패턴 참조** |

## §3 상세 설계

### 파일 1: `src/routes/product-unified.tsx` (신규)

```tsx
/**
 * F327 — 제품화 통합 페이지
 * 2탭: MVP / PoC
 * URL: /product?tab=mvp|poc
 */
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, TestTubes } from "lucide-react";
import { Component as MvpTracking } from "@/routes/mvp-tracking";
import { Component as ProductPoc } from "@/routes/product-poc";

export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "mvp";

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold font-display">제품화</h1>
        <p className="text-muted-foreground">MVP · PoC 추적 관리</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <TabsList>
          <TabsTrigger value="mvp">
            <Target className="mr-2 size-4" /> MVP
          </TabsTrigger>
          <TabsTrigger value="poc">
            <TestTubes className="mr-2 size-4" /> PoC
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mvp"><MvpTracking /></TabsContent>
        <TabsContent value="poc"><ProductPoc /></TabsContent>
      </Tabs>
    </div>
  );
}
```

검증 기준:
- [x] 2탭 (MVP/PoC) 렌더링
- [x] URL searchParams 탭 연동
- [x] MVP 기본 랜딩
- [x] 기존 컴포넌트 직접 import (F324 패턴)

### 파일 2: `src/router.tsx` (수정)

```typescript
// 기존:
// { path: "product", lazy: () => import("@/routes/mvp-tracking") },
// 변경:
{ path: "product", lazy: () => import("@/routes/product-unified") },
```

검증 기준:
- [x] /product → product-unified
- [x] /product/offering-pack 별도 라우트 유지
- [x] 기존 /product/mvp, /product/poc 리다이렉트 유지 (F322)

### 파일 3: `offering-packs.tsx` (수정)

제목 영역에 VersionBadge 추가:

```tsx
import { VersionBadge } from "@/components/feature/VersionBadge";

// 제목 영역
<div className="flex items-center gap-3">
  <h1 className="text-2xl font-bold font-display">Offering Pack</h1>
  <VersionBadge artifactType="offering" />
</div>
```

검증 기준:
- [x] VersionBadge 표시
- [x] 기존 기능 영향 없음

### 파일 4: `src/routes/getting-started.tsx` (수정)

기존 온보딩 콘텐츠 하단에 4개 추가 섹션 카드:

```tsx
// 기존 온보딩 콘텐츠 유지 ...

{/* F328: 5영역 허브 섹션 */}
<section className="mt-8">
  <h2 className="text-lg font-bold mb-4">더 알아보기</h2>
  <div className="grid gap-4 md:grid-cols-2">
    <HubCard
      title="BD 스킬 가이드"
      description="68개 발굴 스킬의 용도와 실행 방법"
      icon={Library}
      href="/wiki"
    />
    <HubCard
      title="Cowork / Claude Code"
      description="AI 에이전트 협업 환경 설정과 사용법"
      icon={Bot}
      href="/wiki"
    />
    <HubCard
      title="데모 시나리오"
      description="헬스케어 AI + GIVC 시드 데이터 체험"
      icon={Presentation}
      href="/ax-bd/demo"
      external
    />
    <HubCard
      title="도구 가이드"
      description="Marker.io, TinaCMS 등 팀 도구 사용법"
      icon={PenTool}
      href="/tools-guide"
      external
    />
  </div>
</section>
```

**HubCard**: 기존 getting-started.tsx 내부에 간단한 인라인 컴포넌트로 추가 (별도 파일 불필요)

**주의**: /ax-bd/demo, /tools-guide는 F322에서 /getting-started로 리다이렉트 설정됨. 내부 링크는 실제 라우트 경로 사용 (리다이렉트 무한 루프 방지를 위해 리다이렉트 전 원본 라우트가 아직 존재하므로 direct import 또는 section anchor로 처리)

→ **실제 구현**: 데모/도구가이드 카드는 getting-started 페이지 내의 섹션 앵커로 이동하거나, 기존 라우트 컴포넌트를 Accordion으로 인라인 표시

검증 기준:
- [x] 기존 온보딩 콘텐츠 유지
- [x] 4개 HubCard 추가 (BD스킬/Cowork/데모/도구)
- [x] 카드 클릭 시 적절한 네비게이션
- [x] 리다이렉트 루프 없음

## §4 구현 순서

| 단계 | F# | 파일 | 예상 |
|:----:|:--:|------|:----:|
| 1 | F327 | `product-unified.tsx` 신규 | 20m |
| 2 | F327 | `router.tsx` 수정 | 5m |
| 3 | F327 | `offering-packs.tsx` VersionBadge | 10m |
| 4 | F328 | `getting-started.tsx` 5영역 확장 | 45m |
| 5 | 공통 | typecheck + build | 20m |
| | | **합계** | **~2h** |

## §5 수정 허용 파일 목록

```
packages/web/src/routes/product-unified.tsx (신규)
packages/web/src/routes/getting-started.tsx
packages/web/src/routes/offering-packs.tsx
packages/web/src/router.tsx
packages/web/e2e/**/*.spec.ts
```

**수정 금지**: SPEC.md, MEMORY.md, CLAUDE.md, packages/api/**, packages/cli/**

## §6 검증 매트릭스

| # | 검증 항목 | 기준 |
|:-:|----------|------|
| V1 | 제품화 2탭 | MVP/PoC 탭 전환 |
| V2 | URL 탭 연동 | /product?tab=poc → PoC 활성 |
| V3 | MVP 기본 랜딩 | /product → MVP 탭 |
| V4 | Offering Pack VersionBadge | "v1 (초안)" 뱃지 표시 |
| V5 | 시작하기 5영역 | 온보딩 + 4개 HubCard |
| V6 | HubCard 네비게이션 | 클릭 시 올바른 경로 이동 |
| V7 | 기존 리다이렉트 | /product/mvp → /product, /tools-guide → /getting-started |
| V8 | typecheck | 0 errors |
| V9 | build | 성공 |
