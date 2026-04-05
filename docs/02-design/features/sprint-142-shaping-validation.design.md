---
code: FX-DSGN-S142
title: "Sprint 142 — F325 형상화 재구성 + F326 검증 탭 통합 Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 142
f_items: [F325, F326]
plan_ref: "[[FX-PLAN-S142]]"
---

# FX-DSGN-S142 — 형상화 재구성 + 검증 탭 통합 Design

## §1 설계 목표

1. 형상화 4메뉴에 공통 버전관리 UI(VersionBadge) 적용 (F325)
2. 검증을 4탭(인터뷰·미팅/본부/전사/임원) 통합 페이지로 전환 (F326)

## §2 기존 자산 분석

| 자산 | 위치 | Lines | 활용 |
|------|------|:-----:|------|
| `ax-bd/index.tsx` | 사업제안서 (→사업기획서 리네임) | 18 | VersionBadge 추가 |
| `offering-packs.tsx` | Offering 목록 | 228 | VersionBadge 추가 |
| `spec-generator.tsx` | PRD | 172 | VersionBadge 추가 |
| `shaping-prototype.tsx` | Prototype | 152 | VersionBadge 추가 |
| `validation-division.tsx` | 본부 검증 | 90 | 탭 콘텐츠 |
| `validation-company.tsx` | 전사 검증 | 94 | 탭 콘텐츠 |
| `validation-meetings.tsx` | 미팅 관리 | 160 | 탭 콘텐츠 (인터뷰·미팅 탭) |
| `discovery-unified.tsx` | F324 탭 래퍼 | 61 | **패턴 참조** |

## §3 상세 설계

### 파일 1: `src/components/feature/VersionBadge.tsx` (신규)

```tsx
/**
 * F325 — 산출물 버전관리 공통 컴포넌트
 * 버전 목록 드롭다운 + 현재 버전 표시 + "새 버전" 버튼
 */
interface Version {
  id: string;
  label: string; // "v1", "v2", ...
  createdAt: string;
  isCurrent: boolean;
}

interface VersionBadgeProps {
  artifactType: "business-plan" | "offering" | "prd" | "prototype";
  artifactId?: string;
  versions?: Version[]; // 없으면 기본 v1 표시
  onVersionChange?: (versionId: string) => void;
  onNewVersion?: () => void;
}

export function VersionBadge({ artifactType, versions, onVersionChange, onNewVersion }: VersionBadgeProps) {
  // 버전이 없으면 "v1 (초안)" 단일 표시
  // 버전이 있으면 DropdownMenu로 선택 가능
  // "새 버전" 버튼 → onNewVersion 콜백 (API 미연동 시 toast 안내)
}
```

**UI 스펙:**
- 컴팩트 뱃지 스타일 (h-7, rounded-full)
- 드롭다운: 버전 목록 + 날짜 + "현재" 표시
- "새 버전" 버튼: outline variant, 작은 사이즈
- API 미연동 상태: versions prop 없으면 "v1 (초안)" 정적 표시

검증 기준:
- [x] VersionBadge 컴포넌트 신규 생성
- [x] versions prop 없을 때 "v1 (초안)" 표시
- [x] versions prop 있을 때 드롭다운
- [x] onNewVersion 콜백 동작

### 파일 2: 형상화 4개 라우트 (수정)

각 페이지 제목 옆에 VersionBadge 추가:

```tsx
// 패턴 (4개 파일 공통)
import { VersionBadge } from "@/components/feature/VersionBadge";

// 제목 영역에 추가
<div className="flex items-center gap-3">
  <h1 className="text-2xl font-bold font-display">사업기획서</h1>
  <VersionBadge artifactType="business-plan" />
</div>
```

대상 파일 + 제목 변경:
| 파일 | 현재 제목 | 새 제목 | artifactType |
|------|----------|---------|:------------:|
| `ax-bd/index.tsx` | AX BD | 사업기획서 | `business-plan` |
| `offering-packs.tsx` | Offering Packs | Offering | `offering` |
| `spec-generator.tsx` | PRD 생성 | PRD | `prd` |
| `shaping-prototype.tsx` | Prototype | Prototype | `prototype` |

검증 기준:
- [x] 4개 페이지에 VersionBadge 표시
- [x] 페이지 제목 v1.3 기준으로 갱신
- [x] 기존 기능 영향 없음

### 파일 3: `src/routes/validation-unified.tsx` (신규)

```tsx
/**
 * F326 — 검증 통합 페이지
 * 4탭: 인터뷰·미팅 / 본부 검증 / 전사 검증 / 임원 검증
 * URL: /validation?tab=meetings|division|company|executive
 */
import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Shield, Building2, Users } from "lucide-react";

const ValidationMeetings = lazy(() => import("@/routes/validation-meetings"));
const ValidationDivision = lazy(() => import("@/routes/validation-division"));
const ValidationCompany = lazy(() => import("@/routes/validation-company"));

export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "meetings";

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold font-display">검증</h1>
        <p className="text-muted-foreground">본부 · 전사 · 임원 검증 + 인터뷰/미팅 관리</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <TabsList>
          <TabsTrigger value="meetings">
            <CalendarDays className="mr-2 size-4" /> 인터뷰/미팅
          </TabsTrigger>
          <TabsTrigger value="division">
            <Shield className="mr-2 size-4" /> 본부 검증
          </TabsTrigger>
          <TabsTrigger value="company">
            <Building2 className="mr-2 size-4" /> 전사 검증
          </TabsTrigger>
          <TabsTrigger value="executive">
            <Users className="mr-2 size-4" /> 임원 검증
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meetings">
          <Suspense fallback={<div>로딩 중...</div>}>
            <ValidationMeetings />
          </Suspense>
        </TabsContent>
        <TabsContent value="division">
          <Suspense fallback={<div>로딩 중...</div>}>
            <ValidationDivision />
          </Suspense>
        </TabsContent>
        <TabsContent value="company">
          <Suspense fallback={<div>로딩 중...</div>}>
            <ValidationCompany />
          </Suspense>
        </TabsContent>
        <TabsContent value="executive">
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <Users className="mx-auto mb-3 size-8" />
            <p className="font-medium">임원 검증</p>
            <p className="text-sm">준비 중이에요</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

검증 기준:
- [x] 4탭 (인터뷰·미팅/본부/전사/임원) 렌더링
- [x] URL searchParams 탭 연동
- [x] 인터뷰·미팅 기본 랜딩
- [x] 임원 검증 placeholder
- [x] 기존 컴포넌트 lazy import

### 파일 4: `src/router.tsx` (수정)

```typescript
// 기존:
// { path: "validation", lazy: () => import("@/routes/validation-division") },
// 변경:
{ path: "validation", lazy: () => import("@/routes/validation-unified") },
```

검증 기준:
- [x] /validation → validation-unified 라우트 연결
- [x] 기존 /validation/division 등 리다이렉트 유지 (F322)
- [x] /validation/share (산출물 공유) 별도 라우트 유지

## §4 구현 순서

| 단계 | F# | 파일 | 예상 |
|:----:|:--:|------|:----:|
| 1 | F325 | `VersionBadge.tsx` 신규 | 40m |
| 2 | F325 | 형상화 4개 라우트 수정 | 30m |
| 3 | F326 | `validation-unified.tsx` 신규 | 30m |
| 4 | F326 | `router.tsx` 수정 | 10m |
| 5 | 공통 | typecheck + build | 20m |
| | | **합계** | **~2.5h** |

## §5 수정 허용 파일 목록

```
packages/web/src/components/feature/VersionBadge.tsx (신규)
packages/web/src/routes/ax-bd/index.tsx
packages/web/src/routes/offering-packs.tsx
packages/web/src/routes/spec-generator.tsx
packages/web/src/routes/shaping-prototype.tsx
packages/web/src/routes/validation-unified.tsx (신규)
packages/web/src/router.tsx
packages/web/e2e/**/*.spec.ts
```

**수정 금지**: SPEC.md, MEMORY.md, CLAUDE.md, packages/api/**, packages/cli/**

## §6 검증 매트릭스

| # | 검증 항목 | 기준 |
|:-:|----------|------|
| V1 | VersionBadge 기본 | versions 없을 때 "v1 (초안)" 표시 |
| V2 | VersionBadge 드롭다운 | versions 있을 때 선택 가능 |
| V3 | 형상화 4페이지 | 각각 VersionBadge 표시 + 제목 갱신 |
| V4 | 검증 4탭 | 인터뷰·미팅/본부/전사/임원 탭 전환 |
| V5 | URL 탭 연동 | /validation?tab=company → 전사 검증 활성 |
| V6 | 인터뷰·미팅 기본 랜딩 | /validation → 인터뷰·미팅 탭 |
| V7 | 임원 검증 placeholder | "준비 중이에요" 표시 |
| V8 | 기존 리다이렉트 | /validation/pipeline → /validation 동작 |
| V9 | typecheck | 0 errors |
| V10 | build | 성공 |
