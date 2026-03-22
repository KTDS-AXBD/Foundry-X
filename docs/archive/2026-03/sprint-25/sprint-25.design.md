---
code: FX-DSGN-026
title: "Sprint 25 Design — 기술 스택 점검 + AXIS DS UI 전환"
version: 0.1
status: Draft
category: DSGN
system-version: 2.0.0
created: 2026-03-20
updated: 2026-03-20
author: Sinclair Seo
---

# Sprint 25 Design — 기술 스택 점검 + AXIS DS UI 전환

> **Plan Reference**: [[FX-PLAN-026]]
> **Features**: F98 (기술 스택 점검), F104 (AXIS DS UI 전환)

---

## 1. F98 — 기술 스택 점검 산출물

### 1.1 호환성 매트릭스

| 항목 | Foundry-X | Discovery-X | AI Foundry | 호환성 |
|------|-----------|-------------|------------|:------:|
| **인프라** | CF Workers+Pages+D1 | CF Pages+Workers(4)+D1 | CF Pages+Workers(12)+D1+R2 | ✅ 동일 |
| **언어** | TypeScript 5.x | TypeScript 5.7.3 | TypeScript 5.7.3 | ✅ 동일 |
| **Frontend** | Next.js 14 + React 18 | Remix v2 + React 19 | React 18 + Vite SPA | ⚠️ 프레임워크 상이 |
| **UI 기반** | @base-ui/react + shadcn v4 | @radix-ui + AXIS DS v1.1.1 | @radix-ui + Tailwind | ⚠️ 프리미티브 상이 |
| **CSS** | Tailwind v4 (oklch) | Tailwind v4 (@theme inline) | Tailwind v4 | ✅ 동일 엔진 |
| **DB** | D1 (raw SQL) | D1 (Drizzle ORM) | D1 + Neo4j Aura | ⚠️ Neo4j 별도 |
| **Auth** | JWT+PBKDF2+RBAC | Arctic OAuth (Google) | HMAC+RBAC | ❌ 3방식 병존 |
| **빌드** | pnpm + Turborepo | pnpm | Bun + Turborepo | ⚠️ 패키지 매니저 |
| **테스트** | Vitest 3.x | Vitest 4.x + Playwright | Vitest 4.x | ✅ 동일 |

### 1.2 통합 전략 요약

| 단계 | 내용 | 스프린트 |
|------|------|----------|
| **Step 1: UI 통일** | Foundry-X → AXIS DS 전환 (F104, 이번 스프린트) | Sprint 25 |
| **Step 2: 프론트엔드 통합** | Discovery-X/AI Foundry UI를 서브 라우트로 통합 (F106) | Sprint 26+ |
| **Step 3: 인증 SSO** | 3가지 인증 → 통합 SSO (F108) | Sprint 27+ |
| **Step 4: API 통합** | BFF 패턴으로 12 Workers 라우팅 (F109) | Sprint 28+ |
| **Step 5: 데이터 통합** | 크로스 서비스 D1 쿼리 (F111) | Sprint 29+ |

### 1.3 Kill 조건 판정

**판정: Go** — 3개 서비스 모두 Cloudflare 생태계로 통합 가능.

| Kill 조건 (PRD v5) | 결과 |
|---------------------|------|
| AXIS DS 전환 불가 (기술 호환성) | ✅ 통과 — shadcn v4 → AXIS DS 상위 호환 |
| 기술 스택 통일 불가 판단 | ✅ 통과 — 인프라/언어/CSS 동일, 프레임워크만 상이 |
| Neo4j 의존성 해소 불가 | ✅ 통과 — 별도 서비스 유지 전략 |

**유일한 고위험 항목**: 인증 통합 (F108) — 3가지 방식 병존. 별도 설계 스프린트 필요.

### 1.4 산출물

`docs/specs/tech-stack-audit.md`에 위 매트릭스 + 상세 분석을 독립 문서로 작성.

---

## 2. F104 — AXIS DS UI 전환 상세 설계

### 2.1 현재 상태 분석

**Foundry-X Web 컴포넌트 구조:**

```
packages/web/src/components/
├── ui/              # 11개 shadcn/ui 컴포넌트 (교체 대상)
│   ├── button.tsx      @base-ui/react 기반
│   ├── badge.tsx       @base-ui/react 기반
│   ├── avatar.tsx      @base-ui/react 기반
│   ├── tabs.tsx        @base-ui/react 기반
│   ├── dropdown-menu.tsx  @base-ui/react 기반
│   ├── sheet.tsx       @base-ui/react 기반
│   ├── card.tsx        순수 CSS
│   ├── table.tsx       순수 CSS
│   ├── skeleton.tsx    순수 CSS
│   ├── input.tsx       순수 CSS
│   └── textarea.tsx    순수 CSS
├── feature/         # 35개 도메인 컴포넌트 (토큰만 교체)
├── landing/         # 2개 (navbar, footer)
├── sidebar.tsx      # 대시보드 사이드바
├── theme-provider.tsx  # next-themes (교체 대상)
└── theme-toggle.tsx    # 다크모드 토글 (교체 대상)
```

**Import 영향 범위:** 34개 파일이 `@/components/ui/`에서 import

### 2.2 마이그레이션 전략: Wrapper Re-export 패턴

Discovery-X의 검증된 패턴을 따라, **기존 import 경로를 유지**하면서 내부 구현만 교체:

```
변경 전: components/ui/button.tsx → @base-ui/react 직접 사용
변경 후: components/ui/button.tsx → @axis-ds/ui-react re-export (+커스텀 확장)
```

이 패턴의 장점:
- **34개 consumer 파일 import 경로 변경 불필요** (`@/components/ui/button` 유지)
- 커스텀 variant/size 추가 가능
- 점진적 전환 가능 (한 컴포넌트씩)

### 2.3 컴포넌트별 전환 명세

#### Tier 1: AXIS DS 직접 re-export (API 호환)

| 파일 | 현재 | 변경 후 | 비고 |
|------|------|---------|------|
| `card.tsx` | 순수 CSS div | `export { Card, CardHeader, ... } from "@axis-ds/ui-react"` | API 동일 |
| `table.tsx` | 순수 CSS table | `export { Table, TableBody, ... } from "@axis-ds/ui-react"` | API 동일 |
| `skeleton.tsx` | 순수 CSS div | `export { Skeleton } from "@axis-ds/ui-react"` | API 동일 |
| `input.tsx` | 순수 CSS input | `export { Input } from "@axis-ds/ui-react"` | API 동일 |
| `textarea.tsx` | 순수 CSS textarea | `export { Textarea } from "@axis-ds/ui-react"` | API 동일 |

#### Tier 2: AXIS DS + 커스텀 래퍼 (@base-ui → @radix-ui 전환)

| 파일 | 현재 기반 | 변경 | 주의점 |
|------|-----------|------|--------|
| `button.tsx` | @base-ui Button | AXIS Button re-export + Foundry-X variant 유지 | `buttonVariants` 확장 |
| `badge.tsx` | @base-ui | AXIS Badge re-export | variant 매핑 확인 |
| `avatar.tsx` | @base-ui | AXIS Avatar re-export | Fallback 동작 동일 |
| `tabs.tsx` | @base-ui Tabs | AXIS Tabs re-export | value/onValueChange 확인 |
| `dropdown-menu.tsx` | @base-ui Menu | AXIS DropdownMenu re-export | 서브메뉴 API 차이 주의 |
| `sheet.tsx` | @base-ui Dialog | AXIS Sheet re-export | side prop 확인 |

#### Tier 3: 테마 인프라 교체

| 파일 | 현재 | 변경 후 |
|------|------|---------|
| `theme-provider.tsx` | `next-themes` ThemeProvider | `@axis-ds/theme` ThemeProvider |
| `theme-toggle.tsx` | `useTheme()` from next-themes | `useTheme()` from @axis-ds/theme |
| `layout.tsx` | next-themes 래핑 | @axis-ds/theme 래핑 + suppressHydrationWarning |

### 2.4 CSS 토큰 전환

#### globals.css 변경 계획

**현재:** oklch 색공간 + 수동 AXIS 변수 정의

```css
/* 현재 — 제거 대상 */
:root {
  --background: oklch(1 0 0);          /* shadcn 기본 */
  --axis-primary: oklch(0.623 0.214 259.815);  /* 수동 AXIS 변수 */
  ...
}
```

**변경 후:** @axis-ds/tokens/css/shadcn import + 커스텀 확장만 유지

```css
/* AXIS DS 토큰 import (HSL 기반 shadcn 호환 변수 자동 제공) */
@import "@axis-ds/tokens/css/shadcn";

/* Foundry-X 전용 확장 (AXIS에 없는 것만) */
:root {
  /* 사이드바 (Foundry-X 전용) */
  --sidebar: hsl(var(--background));
  --sidebar-foreground: hsl(var(--foreground));
  --sidebar-primary: hsl(var(--primary));
  --sidebar-primary-foreground: hsl(var(--primary-foreground));
  --sidebar-accent: hsl(var(--accent));
  --sidebar-accent-foreground: hsl(var(--accent-foreground));
  --sidebar-border: hsl(var(--border));
  --sidebar-ring: hsl(var(--ring));
}

/* 커스텀 유틸리티 (기존 유지) */
.axis-grid { ... }
.axis-glow { ... }
.axis-glass { ... }
```

**제거 항목:**
- `:root` / `.dark` 블록의 shadcn 기본 변수 (AXIS 토큰이 대체)
- 수동 정의한 `--axis-*` 변수 (AXIS 토큰 패키지가 자동 제공)

**유지 항목:**
- 사이드바 변수 (`--sidebar-*`) — AXIS DS에 없는 Foundry-X 전용
- 커스텀 유틸리티 클래스 (`.axis-grid`, `.axis-glow` 등)
- 애니메이션 정의

### 2.5 의존성 변경

#### 추가
```
@axis-ds/tokens@1.1.1
@axis-ds/ui-react@1.1.1
@axis-ds/theme@1.1.1
```

#### 제거 (AXIS DS에 포함)
```
@base-ui/react        → @axis-ds/ui-react 내부 @radix-ui로 대체
next-themes           → @axis-ds/theme으로 대체
```

#### 유지
```
class-variance-authority  → AXIS DS도 사용, 커스텀 variant에 필요
clsx                      → 유틸리티
tailwind-merge            → 유틸리티
lucide-react              → 아이콘 (AXIS DS 무관)
@xyflow/react             → WorkflowCanvas (AXIS DS 무관)
tailwindcss@4.2.1         → CSS 프레임워크 (유지)
```

### 2.6 Next.js 빌드 설정

`next.config.js` 수정:

```javascript
const nextConfig = {
  transpilePackages: [
    "@foundry-x/shared",
    "@axis-ds/ui-react",   // 추가
    "@axis-ds/theme",      // 추가
    "@axis-ds/tokens",     // 추가
  ],
};
```

---

## 3. 구현 순서

### Phase 1: F98 기술 스택 점검 문서화 (~20min)

| # | 작업 | 파일 | 검증 |
|---|------|------|------|
| 1-1 | 호환성 매트릭스 + 마이그레이션 전략 문서 작성 | `docs/specs/tech-stack-audit.md` | 문서 존재 |

### Phase 2: F104 인프라 준비 (~15min)

| # | 작업 | 파일 | 검증 |
|---|------|------|------|
| 2-1 | @axis-ds/* 3패키지 설치 | `packages/web/package.json` | `pnpm install` 성공 |
| 2-2 | @base-ui/react, next-themes 제거 | `packages/web/package.json` | 빌드 성공 후 제거 |
| 2-3 | next.config.js transpilePackages 추가 | `packages/web/next.config.js` | 빌드 에러 없음 |
| 2-4 | globals.css 토큰 교체 | `packages/web/src/app/globals.css` | CSS 변수 정상 |

### Phase 3: F104 테마 교체 (~10min)

| # | 작업 | 파일 | 검증 |
|---|------|------|------|
| 3-1 | ThemeProvider 교체 | `components/theme-provider.tsx` | 다크모드 동작 |
| 3-2 | theme-toggle useTheme 교체 | `components/theme-toggle.tsx` | 토글 동작 |
| 3-3 | layout.tsx 프로바이더 교체 | `src/app/layout.tsx` | SSR hydration OK |

### Phase 4: F104 컴포넌트 교체 — Tier 1 순수 CSS (~15min)

| # | 작업 | 파일 | 검증 |
|---|------|------|------|
| 4-1 | card.tsx → AXIS re-export | `components/ui/card.tsx` | Card 렌더링 |
| 4-2 | table.tsx → AXIS re-export | `components/ui/table.tsx` | Table 렌더링 |
| 4-3 | skeleton.tsx → AXIS re-export | `components/ui/skeleton.tsx` | Skeleton 렌더링 |
| 4-4 | input.tsx → AXIS re-export | `components/ui/input.tsx` | Input 동작 |
| 4-5 | textarea.tsx → AXIS re-export | `components/ui/textarea.tsx` | Textarea 동작 |

### Phase 5: F104 컴포넌트 교체 — Tier 2 래퍼 (~20min)

| # | 작업 | 파일 | 검증 |
|---|------|------|------|
| 5-1 | button.tsx → AXIS Button + 커스텀 variant | `components/ui/button.tsx` | 모든 variant 렌더링 |
| 5-2 | badge.tsx → AXIS Badge | `components/ui/badge.tsx` | Badge 렌더링 |
| 5-3 | avatar.tsx → AXIS Avatar | `components/ui/avatar.tsx` | Avatar + fallback |
| 5-4 | tabs.tsx → AXIS Tabs | `components/ui/tabs.tsx` | 탭 전환 동작 |
| 5-5 | dropdown-menu.tsx → AXIS DropdownMenu | `components/ui/dropdown-menu.tsx` | 메뉴 열기/닫기 |
| 5-6 | sheet.tsx → AXIS Sheet | `components/ui/sheet.tsx` | Sheet 슬라이드 |

### Phase 6: 검증 + 배포 (~10min)

| # | 작업 | 검증 |
|---|------|------|
| 6-1 | typecheck | `tsc --noEmit` 0 에러 |
| 6-2 | Web 테스트 | `pnpm test` 48/48 pass |
| 6-3 | E2E 테스트 | `pnpm e2e` ~51 pass |
| 6-4 | Pages 빌드 | `next-on-pages` 성공 |
| 6-5 | 배포 | Workers v2.1 + Pages 배포 |

---

## 4. 파일 변경 요약

| 구분 | 파일 | 변경 유형 |
|------|------|-----------|
| **신규** | `docs/specs/tech-stack-audit.md` | 문서 생성 |
| **수정** | `packages/web/package.json` | 의존성 교체 |
| **수정** | `packages/web/next.config.js` | transpilePackages |
| **수정** | `packages/web/src/app/globals.css` | 토큰 교체 |
| **수정** | `packages/web/src/app/layout.tsx` | ThemeProvider |
| **수정** | `packages/web/src/components/theme-provider.tsx` | AXIS theme |
| **수정** | `packages/web/src/components/theme-toggle.tsx` | useTheme |
| **수정** | `packages/web/src/components/ui/button.tsx` | AXIS re-export |
| **수정** | `packages/web/src/components/ui/badge.tsx` | AXIS re-export |
| **수정** | `packages/web/src/components/ui/avatar.tsx` | AXIS re-export |
| **수정** | `packages/web/src/components/ui/tabs.tsx` | AXIS re-export |
| **수정** | `packages/web/src/components/ui/dropdown-menu.tsx` | AXIS re-export |
| **수정** | `packages/web/src/components/ui/sheet.tsx` | AXIS re-export |
| **수정** | `packages/web/src/components/ui/card.tsx` | AXIS re-export |
| **수정** | `packages/web/src/components/ui/table.tsx` | AXIS re-export |
| **수정** | `packages/web/src/components/ui/skeleton.tsx` | AXIS re-export |
| **수정** | `packages/web/src/components/ui/input.tsx` | AXIS re-export |
| **수정** | `packages/web/src/components/ui/textarea.tsx` | AXIS re-export |

**총 18파일** (신규 1 + 수정 17), feature/landing 컴포넌트는 import 경로 변경 없음
