---
code: FX-ANLS-026
title: "Sprint 25 Gap Analysis — 기술 스택 점검 + AXIS DS 전환"
version: 0.1
status: Active
category: ANLS
system-version: 2.0.0
created: 2026-03-20
updated: 2026-03-20
author: Sinclair Seo
---

# Sprint 25 Gap Analysis — 기술 스택 점검 + AXIS DS 전환

> **Design Reference**: [[FX-DSGN-026]]
> **Match Rate**: 97% (28 full + 2 partial / 30 items)

---

## Match Rate: 97%

| Category | Score | Status |
|----------|:-----:|:------:|
| F98 기술 스택 점검 | 100% | ✅ |
| F104 의존성 | 100% | ✅ |
| F104 CSS 토큰 | 90% | ✅ |
| F104 테마 인프라 | 100% | ✅ |
| F104 Tier 1 컴포넌트 | 100% | ✅ |
| F104 Tier 2 컴포넌트 | 92% | ✅ |
| 추가 수정 (Design 외) | 100% | ✅ |
| **Overall** | **97%** | ✅ |

---

## Detailed Checklist

### F98 기술 스택 점검 (4/4 = 100%)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 1 | 호환성 매트릭스 (8행) | ✅ | docs/specs/tech-stack-audit.md 8행 존재 |
| 2 | 통합 전략 요약 (5 Step) | ✅ | Step 1~5 모두 기술 |
| 3 | Kill 조건 판정 | ✅ | "Go" 판정 + 3개 조건 검증 |
| 4 | tech-stack-audit.md 존재 | ✅ | 파일 존재 확인 |

### F104 의존성 (6/6 = 100%)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 5 | @axis-ds/tokens 설치 | ✅ | package.json "1.1.1" |
| 6 | @axis-ds/ui-react 설치 | ✅ | package.json "1.1.1" |
| 7 | @axis-ds/theme 설치 | ✅ | package.json "1.1.1" |
| 8 | @base-ui/react 제거 | ✅ | package.json에 없음 |
| 9 | next-themes 제거 | ✅ | package.json에 없음 |
| 10 | transpilePackages 추가 | ✅ | next.config.js 3개 포함 |

### F104 CSS 토큰 (4.5/5 = 90%)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 11 | @axis-ds/tokens/css/shadcn import | ✅ | globals.css 상단 |
| 12 | 기존 oklch 변수 제거 | ✅ | :root에 --sidebar-*만 잔존 |
| 13 | --sidebar-* 유지 | ✅ | :root + .dark 모두 유지 |
| 14 | --axis-* 수동 변수 제거 | ✅ | grep 0건 |
| 15 | @theme inline 정리 | ⚠️ | 브리징 블록 유지 — Tailwind v4 연결용, 의도적 |

### F104 테마 인프라 (3/3 = 100%)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 16 | theme-provider.tsx | ✅ | @axis-ds/theme ThemeProvider |
| 17 | theme-toggle.tsx | ✅ | @axis-ds/theme useTheme |
| 18 | layout.tsx props | ✅ | attribute/enableSystem 제거됨 |

### F104 Tier 1 컴포넌트 (5/5 = 100%)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 19 | card.tsx | ✅ | @axis-ds/ui-react re-export |
| 20 | table.tsx | ✅ | @axis-ds/ui-react re-export |
| 21 | skeleton.tsx | ✅ | @axis-ds/ui-react re-export |
| 22 | input.tsx | ✅ | @axis-ds/ui-react re-export |
| 23 | textarea.tsx | ✅ | @axis-ds/ui-react re-export |

### F104 Tier 2 컴포넌트 (5.5/6 = 92%)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 24 | button.tsx | ⚠️ | CVA 커스텀 유지 (AXIS variant 비호환), @base-ui 제거 완료 |
| 25 | badge.tsx | ✅ | @axis-ds/ui-react re-export |
| 26 | avatar.tsx | ✅ | @axis-ds/ui-react re-export |
| 27 | tabs.tsx | ✅ | @axis-ds/ui-react re-export |
| 28 | dropdown-menu.tsx | ✅ | @axis-ds/ui-react 16개 export |
| 29 | sheet.tsx | ✅ | @axis-ds/ui-react 10개 export |

### 추가 수정 — Design 외 발견 (2/2 = 100%)

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 30 | OrgSwitcher render→asChild | ✅ | DropdownMenuTrigger asChild |
| 31 | sidebar render→asChild | ✅ | SheetTrigger asChild |

### 검증

| # | Item | Status |
|---|------|:------:|
| 32 | typecheck 5/5 | ✅ 0 에러 |
| 33 | Web test 48/48 | ✅ 전부 pass |

---

## Partial Match 상세 (2건)

**#15 @theme inline 브리징 블록**: Tailwind v4는 CSS 변수를 `@theme` 시스템에 명시적으로 등록해야 `bg-background`, `text-foreground` 등 유틸리티 클래스가 동작해요. AXIS 토큰이 CSS 변수를 제공하지만, Tailwind v4 `@theme inline` 등록은 별도로 필요하므로 **의도적 유지**예요.

**#24 button.tsx CVA 커스텀**: AXIS DS Button은 `default/destructive/outline/secondary/ghost/link` variant와 `default/sm/lg/icon` size만 제공해요. Foundry-X는 추가로 `xs`, `icon-xs`, `icon-sm`, `icon-lg` size가 필요하므로 CVA 커스텀을 유지하는 게 합리적이에요. @base-ui 의존성 제거 + 기존 export API 유지 목표는 달성.

---

## 결론

**Match Rate 97%** — 90% 기준 초과. Partial 2건은 모두 합리적 의도적 차이.
다음 단계: `/pdca report sprint-25`
