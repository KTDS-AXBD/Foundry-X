---
code: FX-DSGN-019
title: "F79 AXIS Design System 기반 전면 리디자인 — 설계"
version: 0.1
status: Draft
category: DSGN
system-version: 1.4.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
planning-doc: FX-PLAN-019
related-req: FX-REQ-079
---

# FX-DSGN-019: F79 AXIS Design System 기반 전면 리디자인 — 설계

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F79 AXIS DS 기반 전면 리디자인 |
| **기간** | Sprint 17 (2026-03-18 ~) |
| **시스템 버전** | v1.4.0 → v1.5.0 |

| 관점 | 내용 |
|------|------|
| **Problem** | Digital Forge 테마(forge-* 6개 변수)가 Foundry-X 전용이라 AX BD팀 제품 간 시각적 일관성 부재. forge-* 참조가 4개 파일 83곳에 분산돼 있어요. |
| **Solution** | AXIS DS 토큰으로 globals.css 전면 교체 + 랜딩/대시보드 리디자인. shadcn/ui는 CSS 변수 자동 전환. |
| **Function UX Effect** | 팀 제품(Foundry-X, Discovery-X, AI Foundry) 간 통일 시각 언어 → 제품 간 이동 시 학습 비용 제로 |
| **Core Value** | AX BD팀 브랜드 일관성 + 디자인 시스템 기반 유지보수성 향상 |

---

## 1. 설계 목표

AXIS Design System 토큰을 기반으로 Foundry-X 웹 전체(랜딩 + 대시보드)를 리디자인해요.

### 1.1 환경 변경 요약

| 영역 | Before | After |
|------|--------|-------|
| CSS 변수 | forge-* 6개 + axis-* 4개 | axis-* 12개 (forge-* 제거) |
| @theme 매핑 | `--color-forge-*` 6항목 | `--color-axis-*` 12항목 |
| 랜딩 page.tsx | forge-amber 중심, 56곳 참조 | AXIS primary 중심, 0 forge 잔존 |
| navbar.tsx | forge-amber 6곳 | axis-primary 6곳 |
| footer.tsx | forge-amber 3곳 | axis-primary 3곳 |
| 대시보드 sidebar | shadcn 시맨틱(bg-primary) | 변경 불필요 (CSS 변수 자동 전환) |
| shadcn/ui 11개 | CSS 변수 의존 | 자동 전환 (추가 코드 변경 없음) |
| 다크모드 | .dark forge-grid만 커스텀 | .dark axis-grid로 교체 |

---

## 2. AXIS DS 토큰 매핑 상세

### 2.1 전체 색상 팔레트

AXIS DS의 색상 체계를 Foundry-X에 매핑해요. oklch 색상 공간을 사용해서 인지적으로 균일한 색상 전환을 보장해요.

| 토큰 이름 | 용도 | oklch 값 (Light) | oklch 값 (Dark) |
|----------|------|-----------------|----------------|
| `--axis-primary` | 주 브랜드, CTA, 강조 | `oklch(0.623 0.214 259.815)` | `oklch(0.723 0.180 259.815)` |
| `--axis-primary-light` | 주 브랜드 밝은 변형 | `oklch(0.809 0.105 251.813)` | `oklch(0.809 0.105 251.813)` |
| `--axis-primary-hover` | 호버 상태 | `oklch(0.546 0.245 262.881)` | `oklch(0.650 0.200 262.881)` |
| `--axis-secondary` | 보조 색상, 배지 | `oklch(0.723 0.219 149.579)` | `oklch(0.780 0.180 149.579)` |
| `--axis-accent` | 포인트, 다이어그램 | `oklch(0.546 0.245 262.881)` | `oklch(0.620 0.220 262.881)` |
| `--axis-blue` | 에코시스템 블루 (유지) | `oklch(0.623 0.214 259.815)` | `oklch(0.623 0.214 259.815)` |
| `--axis-blue-light` | 블루 밝은 변형 (유지) | `oklch(0.809 0.105 251.813)` | `oklch(0.809 0.105 251.813)` |
| `--axis-green` | 성공, Discovery-X (유지) | `oklch(0.723 0.219 149.579)` | `oklch(0.723 0.219 149.579)` |
| `--axis-violet` | AI Foundry (유지) | `oklch(0.546 0.245 262.881)` | `oklch(0.546 0.245 262.881)` |
| `--axis-warm` | 따뜻한 강조 (Foundry-X 고유) | `oklch(0.769 0.140 60.0)` | `oklch(0.700 0.120 60.0)` |
| `--axis-neutral` | 중립 텍스트/배경 | `oklch(0.554 0.020 260.0)` | `oklch(0.600 0.015 260.0)` |
| `--axis-surface` | 카드/패널 배경 | `oklch(0.968 0.005 260.0)` | `oklch(0.210 0.006 260.0)` |

### 2.2 forge-* → axis-* 교체 매핑 테이블

기존 Digital Forge 토큰을 AXIS DS 토큰으로 1:1 매핑해요.

| forge-* (제거) | oklch 값 | → axis-* (대체) | 근거 |
|---------------|---------|----------------|------|
| `--forge-amber` | `oklch(0.769 0.188 70.08)` | `--axis-primary` | 주 브랜드 색상 역할 동일 |
| `--forge-ember` | `oklch(0.828 0.189 84.429)` | `--axis-primary-hover` | 호버/밝은 변형 |
| `--forge-copper` | `oklch(0.646 0.222 41.116)` | `--axis-accent` | 그라데이션 엔드 포인트 |
| `--forge-slate` | `oklch(0.554 0.046 257.417)` | `--axis-neutral` | 중립/보조 텍스트 |
| `--forge-charcoal` | `oklch(0.21 0.006 285.885)` | `--foreground` (다크 기본) | 어두운 텍스트/배경 |
| `--forge-cream` | `oklch(0.968 0.007 90.0)` | `--axis-surface` | 밝은 배경 |

### 2.3 shadcn 시맨틱 변수 AXIS 매핑

shadcn/ui 컴포넌트가 참조하는 시맨틱 CSS 변수를 AXIS 팔레트로 매핑해요. 이 매핑으로 shadcn/ui 11개 컴포넌트가 **코드 변경 없이 자동 전환**돼요.

| 시맨틱 변수 | Light 값 | Dark 값 | 변경 여부 |
|-----------|---------|---------|----------|
| `--primary` | `oklch(0.623 0.214 259.815)` (axis-blue) | `oklch(0.723 0.180 259.815)` | ✅ 변경 (기존 무채색 → AXIS blue) |
| `--primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.145 0 0)` | 유지 |
| `--secondary` | `oklch(0.97 0.005 260.0)` | `oklch(0.269 0.005 260.0)` | 미세 조정 (hue 추가) |
| `--accent` | `oklch(0.97 0.005 260.0)` | `oklch(0.269 0.005 260.0)` | 미세 조정 |
| `--ring` | `oklch(0.623 0.214 259.815)` | `oklch(0.556 0.180 259.815)` | ✅ 변경 (AXIS primary로) |
| `--chart-1~5` | AXIS 팔레트 기반 5색 | 동일 | ✅ 변경 |
| `--sidebar-primary` | `oklch(0.623 0.214 259.815)` | `oklch(0.488 0.243 264.376)` | ✅ 변경 |
| 나머지 | 현재 값 유지 | 현재 값 유지 | 유지 |

---

## 3. globals.css 변경 상세

### 3.1 :root (라이트 테마)

```css
:root {
    /* ── shadcn 시맨틱: AXIS primary 기반으로 변경 ── */
    --primary: oklch(0.623 0.214 259.815);         /* ✅ 무채색 → axis-blue */
    --primary-foreground: oklch(0.985 0 0);         /* 유지 */
    --ring: oklch(0.623 0.214 259.815);             /* ✅ axis-primary */
    --chart-1: oklch(0.623 0.214 259.815);          /* axis-blue */
    --chart-2: oklch(0.723 0.219 149.579);          /* axis-green */
    --chart-3: oklch(0.546 0.245 262.881);          /* axis-violet */
    --chart-4: oklch(0.769 0.140 60.0);             /* axis-warm */
    --chart-5: oklch(0.809 0.105 251.813);          /* axis-blue-light */
    --sidebar-primary: oklch(0.623 0.214 259.815);  /* ✅ axis-primary */

    /* ── AXIS Design System 토큰 ── */
    --axis-primary: oklch(0.623 0.214 259.815);
    --axis-primary-light: oklch(0.809 0.105 251.813);
    --axis-primary-hover: oklch(0.546 0.245 262.881);
    --axis-secondary: oklch(0.723 0.219 149.579);
    --axis-accent: oklch(0.546 0.245 262.881);
    --axis-blue: oklch(0.623 0.214 259.815);       /* 유지 */
    --axis-blue-light: oklch(0.809 0.105 251.813); /* 유지 */
    --axis-green: oklch(0.723 0.219 149.579);      /* 유지 */
    --axis-violet: oklch(0.546 0.245 262.881);     /* 유지 */
    --axis-warm: oklch(0.769 0.140 60.0);
    --axis-neutral: oklch(0.554 0.020 260.0);
    --axis-surface: oklch(0.968 0.005 260.0);

    /* ── forge-* 전체 제거 ── */
    /* --forge-amber: 삭제 */
    /* --forge-ember: 삭제 */
    /* --forge-copper: 삭제 */
    /* --forge-slate: 삭제 */
    /* --forge-charcoal: 삭제 */
    /* --forge-cream: 삭제 */
}
```

### 3.2 .dark (다크 테마)

```css
.dark {
    /* ── 변경되는 시맨틱 변수 ── */
    --primary: oklch(0.723 0.180 259.815);          /* ✅ 밝게 조정된 axis-primary */
    --primary-foreground: oklch(0.145 0 0);          /* ✅ 다크 위 텍스트 */
    --ring: oklch(0.556 0.180 259.815);             /* ✅ */
    --chart-1: oklch(0.723 0.180 259.815);
    --chart-2: oklch(0.780 0.180 149.579);
    --chart-3: oklch(0.620 0.220 262.881);
    --chart-4: oklch(0.700 0.120 60.0);
    --chart-5: oklch(0.809 0.105 251.813);
    --sidebar-primary: oklch(0.488 0.243 264.376); /* 유지 */

    /* ── AXIS DS 다크 팔레트 ── */
    --axis-primary: oklch(0.723 0.180 259.815);
    --axis-primary-light: oklch(0.809 0.105 251.813);
    --axis-primary-hover: oklch(0.650 0.200 262.881);
    --axis-secondary: oklch(0.780 0.180 149.579);
    --axis-accent: oklch(0.620 0.220 262.881);
    --axis-warm: oklch(0.700 0.120 60.0);
    --axis-neutral: oklch(0.600 0.015 260.0);
    --axis-surface: oklch(0.210 0.006 260.0);
    /* axis-blue, axis-blue-light, axis-green, axis-violet는 라이트와 동일 */
}
```

### 3.3 @theme inline 블록

```css
@theme inline {
    /* ── forge-* 제거, axis-* 추가 ── */
    /* --color-forge-amber: 삭제 */
    /* --color-forge-ember: 삭제 */
    /* --color-forge-copper: 삭제 */
    /* --color-forge-slate: 삭제 */
    /* --color-forge-charcoal: 삭제 */
    /* --color-forge-cream: 삭제 */

    --color-axis-primary: var(--axis-primary);
    --color-axis-primary-light: var(--axis-primary-light);
    --color-axis-primary-hover: var(--axis-primary-hover);
    --color-axis-secondary: var(--axis-secondary);
    --color-axis-accent: var(--axis-accent);
    --color-axis-blue: var(--axis-blue);              /* 유지 */
    --color-axis-blue-light: var(--axis-blue-light);  /* 유지 */
    --color-axis-green: var(--axis-green);            /* 유지 */
    --color-axis-violet: var(--axis-violet);          /* 유지 */
    --color-axis-warm: var(--axis-warm);
    --color-axis-neutral: var(--axis-neutral);
    --color-axis-surface: var(--axis-surface);

    /* 나머지 shadcn/sidebar/radius 항목은 유지 */
}
```

이렇게 하면 Tailwind 클래스에서 `text-axis-primary`, `bg-axis-primary/10`, `border-axis-accent/20` 등을 바로 사용할 수 있어요.

---

## 4. 커스텀 유틸리티 마이그레이션

### 4.1 forge-grid → axis-grid

```css
/* Before */
.forge-grid {
  background-image:
    linear-gradient(to right, oklch(1 0 0 / 3%) 1px, transparent 1px),
    linear-gradient(to bottom, oklch(1 0 0 / 3%) 1px, transparent 1px);
  background-size: 60px 60px;
}

/* After — 클래스명만 변경, 패턴은 유지 (색상 무관한 흰색 반투명) */
.axis-grid {
  background-image:
    linear-gradient(to right, oklch(1 0 0 / 3%) 1px, transparent 1px),
    linear-gradient(to bottom, oklch(1 0 0 / 3%) 1px, transparent 1px);
  background-size: 60px 60px;
}

.dark .axis-grid {
  background-image:
    linear-gradient(to right, oklch(1 0 0 / 4%) 1px, transparent 1px),
    linear-gradient(to bottom, oklch(1 0 0 / 4%) 1px, transparent 1px);
}
```

### 4.2 forge-glass → axis-glass

```css
/* Before */
.forge-glass {
  background: oklch(1 0 0 / 5%);
  backdrop-filter: blur(12px);
  border: 1px solid oklch(1 0 0 / 8%);
}

/* After — 동일 (색상 무관, 명칭만 교체) */
.axis-glass {
  background: oklch(1 0 0 / 5%);
  backdrop-filter: blur(12px);
  border: 1px solid oklch(1 0 0 / 8%);
}

.dark .axis-glass {
  background: oklch(1 0 0 / 5%);
  border: 1px solid oklch(1 0 0 / 8%);
}
```

### 4.3 forge-glow → axis-glow

```css
/* Before — forge-amber oklch 하드코딩 */
.forge-glow {
  box-shadow:
    0 0 20px oklch(0.769 0.188 70.08 / 15%),
    0 0 60px oklch(0.769 0.188 70.08 / 5%);
}

/* After — axis-primary(blue) 기반 */
.axis-glow {
  box-shadow:
    0 0 20px oklch(0.623 0.214 259.815 / 15%),
    0 0 60px oklch(0.623 0.214 259.815 / 5%);
}

.axis-glow-strong {
  box-shadow:
    0 0 30px oklch(0.623 0.214 259.815 / 30%),
    0 0 80px oklch(0.623 0.214 259.815 / 10%);
}
```

### 4.4 pulse-ring 애니메이션

```css
/* Before — forge-amber */
@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 oklch(0.769 0.188 70.08 / 40%); }
  70% { box-shadow: 0 0 0 12px oklch(0.769 0.188 70.08 / 0%); }
  100% { box-shadow: 0 0 0 0 oklch(0.769 0.188 70.08 / 0%); }
}

/* After — axis-primary(blue) */
@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 oklch(0.623 0.214 259.815 / 40%); }
  70% { box-shadow: 0 0 0 12px oklch(0.623 0.214 259.815 / 0%); }
  100% { box-shadow: 0 0 0 0 oklch(0.623 0.214 259.815 / 0%); }
}
```

### 4.5 유지 항목 (변경 불필요)

| 클래스 | 이유 |
|-------|------|
| `blueprint-grid` | 이미 axis-blue oklch 값 사용 |
| `grain-overlay` | SVG 노이즈, 색상 무관 |
| `animate-fade-in-up` | 색상 참조 없음 |
| `animate-draw-line` | 색상 참조 없음 |
| `animate-float` | 색상 참조 없음 |
| `stagger-1~6` | 딜레이만, 색상 무관 |

---

## 5. 랜딩 페이지 리디자인

### 5.1 개요

`page.tsx` (706줄)에서 forge-* 참조 56곳을 AXIS 토큰으로 교체해요.

**색상 전환 원칙:**
- `forge-amber` → `axis-primary` (주 브랜드 역할)
- `forge-ember` → `axis-primary-hover` (호버/밝은 변형)
- `forge-copper` → `axis-accent` (보조 강조)
- `forge-charcoal` → `foreground` (텍스트)
- `forge-cream` → `axis-surface` (밝은 배경)
- `forge-glow` → `axis-glow` (글로우 효과)
- `forge-glow-strong` → `axis-glow-strong`
- `forge-glass` → `axis-glass`
- `forge-grid` → `axis-grid`

### 5.2 섹션별 변경점

#### Hero 섹션 (L352~L429)

| 요소 | Before | After |
|------|--------|-------|
| 배경 blur | `bg-forge-amber/5`, `bg-forge-copper/4` | `bg-axis-primary/5`, `bg-axis-accent/4` |
| 버전 배지 | `border-forge-amber/20 bg-forge-amber/5 text-forge-amber` | `border-axis-primary/20 bg-axis-primary/5 text-axis-primary` |
| 헤드라인 그라데이션 | `from-forge-amber via-forge-ember to-forge-copper` | `from-axis-primary via-axis-primary-light to-axis-accent` |
| 3-step 아이콘 | `text-forge-amber` | `text-axis-primary` |
| 3-step 레이블 | `text-forge-amber` | `text-axis-primary` |
| CTA 기본 | `bg-forge-amber text-forge-charcoal hover:bg-forge-ember` | `bg-axis-primary text-white hover:bg-axis-primary-hover` |
| CTA 보조 | `hover:border-forge-amber/30 hover:bg-forge-amber/5` | `hover:border-axis-primary/30 hover:bg-axis-primary/5` |
| GitHub 아이콘 | `text-forge-amber` | `text-axis-primary` |
| 섹션 클래스 | `forge-grid` | `axis-grid` |
| CTA glow | `forge-glow-strong` | `axis-glow-strong` |

#### Stats Bar (L431~L445)

| 요소 | Before | After |
|------|--------|-------|
| 숫자 색상 | `text-forge-amber` | `text-axis-primary` |

#### Features / 3 Pillars (L447~L494)

| 요소 | Before | After |
|------|--------|-------|
| 섹션 라벨 | `text-forge-amber` | `text-axis-primary` |
| 헤드라인 강조 | `text-forge-amber` | `text-axis-primary` |
| 카드 컨테이너 | `forge-glass hover:border-forge-amber/20 hover:bg-forge-amber/5` | `axis-glass hover:border-axis-primary/20 hover:bg-axis-primary/5` |
| 아이콘 배경 | `bg-forge-amber/10 group-hover:bg-forge-amber/20` | `bg-axis-primary/10 group-hover:bg-axis-primary/20` |
| 아이콘 색상 | `text-forge-amber` | `text-axis-primary` |
| pillars data `color` | `"forge-amber"` | `"axis-primary"` (첫 번째 항목만) |

> **참고:** pillars data의 `color` 필드는 현재 CSS 클래스로 직접 사용되지 않아요 (아이콘은 모두 `forge-amber` 하드코딩). 구현 시 `color` 필드를 활용한 동적 색상 적용도 고려할 수 있어요.

#### Ecosystem Blueprint (L496~L522)

| 요소 | Before | After |
|------|--------|-------|
| 라벨 | `text-axis-blue` | 유지 (이미 AXIS) |
| 그라데이션 | `from-axis-blue to-axis-violet` | 유지 (이미 AXIS) |
| EcosystemDiagram 중앙 노드 | `border-forge-amber/40 bg-forge-amber/10`, `text-forge-amber` | `border-axis-primary/40 bg-axis-primary/10`, `text-axis-primary` |
| 화살표 선 | `via-forge-amber/30 to-forge-amber/60`, `bg-forge-amber/40` | `via-axis-primary/30 to-axis-primary/60`, `bg-axis-primary/40` |

> 위성 노드(Discovery-X, AI Foundry, AXIS DS)는 이미 axis-green, axis-violet, axis-blue를 사용하므로 변경 불필요.

#### Architecture (L524~L566)

| 요소 | Before | After |
|------|--------|-------|
| 섹션 배경 | `forge-grid` | `axis-grid` |
| 라벨 | `text-forge-amber` | `text-axis-primary` |
| 헤드라인 강조 | `text-forge-amber` | `text-axis-primary` |
| 레이어 인디케이터 | `from-forge-amber/80 to-forge-copper/40` | `from-axis-primary/80 to-axis-accent/40` |
| 레이어 타이틀 | `text-forge-amber` | `text-axis-primary` |
| 호버 보더 | `hover:border-forge-amber/20` | `hover:border-axis-primary/20` |
| 배지 호버 | `hover:border-forge-amber/20` | `hover:border-axis-primary/20` |

#### Roadmap (L568~L586)

| 요소 | Before | After |
|------|--------|-------|
| 라벨 | `text-forge-amber` | `text-axis-primary` |
| 헤드라인 강조 | `text-forge-amber` | `text-axis-primary` |
| current 카드 | `border-forge-amber/30 bg-forge-amber/5` | `border-axis-primary/30 bg-axis-primary/5` |
| current 배지 | `bg-forge-amber/20 text-forge-amber` | `bg-axis-primary/20 text-axis-primary` |
| done 체크 | `text-forge-amber` | `text-axis-primary` |
| current 펄스 | `bg-forge-amber` | `bg-axis-primary` |
| done 불릿 | `bg-forge-amber/60` | `bg-axis-primary/60` |
| current 불릿 | `bg-forge-amber` | `bg-axis-primary` |

#### Quick Start (L588~L663)

| 요소 | Before | After |
|------|--------|-------|
| 섹션 배경 | `forge-grid` | `axis-grid` |
| 라벨 | `text-forge-amber` | `text-axis-primary` |
| 헤드라인 강조 | `text-forge-amber` | `text-axis-primary` |
| 터미널 카드 | `forge-glass` | `axis-glass` |
| 터미널 닷 | `bg-forge-copper/40`, `bg-forge-amber/40` | `bg-axis-accent/40`, `bg-axis-primary/40` |
| 프롬프트 `$` | `text-forge-amber` | `text-axis-primary` |
| 다이아몬드 `◆` | `text-forge-amber` | `text-axis-primary` |

#### Final CTA (L666~L702)

| 요소 | Before | After |
|------|--------|-------|
| Anvil 아이콘 | `text-forge-amber` | `text-axis-primary` |
| Shield 아이콘 | `text-forge-amber/50` | `text-axis-primary/50` |
| 그라데이션 | `from-forge-amber to-forge-copper` | `from-axis-primary to-axis-accent` |
| CTA 기본 | `bg-forge-amber text-forge-charcoal hover:bg-forge-ember` | `bg-axis-primary text-white hover:bg-axis-primary-hover` |
| CTA glow | `forge-glow-strong` | `axis-glow-strong` |
| CTA 보조 | `hover:border-forge-amber/30 hover:bg-forge-amber/5` | `hover:border-axis-primary/30 hover:bg-axis-primary/5` |
| Terminal 아이콘 | `text-forge-amber` | `text-axis-primary` |

---

## 6. Navbar / Footer 리디자인

### 6.1 Navbar (navbar.tsx, 113줄)

| 요소 | Before | After |
|------|--------|-------|
| 스크롤 보더 | `border-forge-amber/10` | `border-axis-primary/10` |
| 로고 배경 | `bg-forge-amber/10` | `bg-axis-primary/10` |
| 로고 아이콘 | `text-forge-amber` | `text-axis-primary` |
| 링크 호버 | `hover:text-forge-amber` | `hover:text-axis-primary` |
| Desktop CTA | `bg-forge-amber text-forge-charcoal hover:bg-forge-ember` | `bg-axis-primary text-white hover:bg-axis-primary-hover` |
| Mobile CTA | `bg-forge-amber text-forge-charcoal` | `bg-axis-primary text-white` |
| CTA glow | `forge-glow` | `axis-glow` |

### 6.2 Footer (footer.tsx, 79줄)

| 요소 | Before | After |
|------|--------|-------|
| 로고 배경 | `bg-forge-amber/10` | `bg-axis-primary/10` |
| 로고 아이콘 | `text-forge-amber` | `text-axis-primary` |
| 링크 호버 | `hover:text-forge-amber` | `hover:text-axis-primary` |

---

## 7. 대시보드 리디자인

### 7.1 Sidebar (sidebar.tsx, 107줄)

현재 sidebar.tsx는 forge-* 참조가 **0건**이에요. shadcn 시맨틱 변수(`bg-primary`, `text-primary-foreground`, `bg-muted` 등)만 사용하고 있어요.

**결론:** CSS 변수 교체(§3)로 **자동 전환**돼요. 코드 변경 불필요.

- 활성 상태: `bg-primary` → §3에서 `--primary`를 axis-blue로 변경하면 자동으로 AXIS 색상 적용
- 호버: `hover:bg-muted` → 기존 유지

### 7.2 대시보드 페이지별

대시보드 7개 페이지(`dashboard`, `agents`, `architecture`, `spec-generator`, `tokens`, `wiki`, `workspace`)를 `grep -r "forge-"` 검색한 결과, forge-* 참조가 **0건**이에요.

모든 대시보드 페이지는 shadcn/ui 컴포넌트와 시맨틱 CSS 변수만 사용하므로, globals.css 변경(§3)만으로 자동 전환돼요.

| 페이지 | forge-* 참조 | 추가 작업 |
|--------|:-----------:|----------|
| dashboard/page.tsx | 0 | 없음 |
| agents/page.tsx | 0 | 없음 |
| architecture/page.tsx | 0 | 없음 |
| spec-generator/page.tsx | 0 | 없음 |
| tokens/page.tsx | 0 | 없음 |
| wiki/page.tsx | 0 | 없음 |
| workspace/page.tsx | 0 | 없음 |

### 7.3 Feature 컴포넌트

대시보드에서 사용하는 feature 컴포넌트(AgentExecuteModal, ConflictCard 등)도 forge-* 참조가 없으므로 추가 작업 불필요.

---

## 8. shadcn/ui 컴포넌트 전략

### 8.1 CSS 변수 자동 전환 (11개 전체)

shadcn/ui 컴포넌트는 CSS 변수(`--primary`, `--secondary`, `--accent`, `--destructive` 등)를 참조해요. globals.css에서 이 변수를 AXIS 값으로 교체하면 **추가 코드 변경 없이** 전환이 완료돼요.

| 컴포넌트 | 참조하는 시맨틱 변수 | 전환 방식 |
|---------|-------------------|---------|
| `button.tsx` | `--primary`, `--secondary`, `--destructive`, `--muted` | ✅ 자동 |
| `card.tsx` | `--card`, `--card-foreground`, `--foreground` | ✅ 자동 |
| `badge` | `--primary`, `--secondary`, `--destructive` | ✅ 자동 |
| `input` | `--input`, `--border`, `--ring` | ✅ 자동 |
| `textarea` | `--input`, `--border`, `--ring` | ✅ 자동 |
| `table` | `--muted`, `--border` | ✅ 자동 |
| `tabs` | `--primary`, `--muted` | ✅ 자동 |
| `avatar` | `--muted` | ✅ 자동 |
| `skeleton` | `--muted` | ✅ 자동 |
| `dropdown-menu` | `--popover`, `--accent` | ✅ 자동 |
| `sheet` | `--background`, `--border` | ✅ 자동 |

### 8.2 래핑 컴포넌트 필요 여부

현재 분석 결과, 래핑 컴포넌트가 필요한 케이스는 **없어요**.

- Button의 `default` variant는 `bg-primary`를 사용 → `--primary`가 AXIS blue로 바뀌면 자동 적용
- 랜딩 페이지의 CTA 버튼은 shadcn Button이 아니라 `<Link>` + Tailwind 직접 스타일링이므로, 클래스만 교체하면 돼요
- AXIS DS 전용 variant(예: `axis-brand`)가 필요하다면 **구현 시점에서 판단**하되, 현재 스코프에서는 불필요

---

## 9. 다크모드 검증

### 9.1 WCAG AA 콘트라스트 체크 대상

| 조합 | Light 비율 | Dark 비율 | AA 기준 |
|------|----------|---------|---------|
| axis-primary 위 흰 텍스트 | ~4.6:1 | — | ✅ (4.5:1+) |
| axis-primary 위 검정 텍스트 | — | ~5.2:1 | ✅ (4.5:1+) |
| axis-green 위 검정 텍스트 | ~5.8:1 | — | ✅ |
| axis-violet 위 흰 텍스트 | ~5.4:1 | — | ✅ |
| axis-warm 위 검정 텍스트 | ~4.8:1 | — | ✅ |

> oklch 기반이므로 lightness 축(L)으로 콘트라스트를 쉽게 조절할 수 있어요. 구현 시 실측 검증이 필요해요.

### 9.2 다크모드 전환 체크리스트

- [ ] :root → .dark 전환 시 모든 axis-* 변수가 다크 팔레트로 전환되는지 확인
- [ ] forge-grid → axis-grid 다크 변형 동작 확인
- [ ] forge-glass → axis-glass 다크 변형 동작 확인
- [ ] 글로우(axis-glow) 다크 배경에서 가시성 확인
- [ ] 그라데이션 텍스트 다크 배경에서 가독성 확인

---

## 10. 마이그레이션 순서

순서가 중요해요. 하위 레이어(토큰)부터 상위 레이어(UI)로 올라가야 중간 빌드 깨짐을 방지해요.

```
Phase A                   Phase B                    Phase C
토큰 기반                  글로벌 스타일                페이지 리디자인
┌──────────────┐         ┌──────────────────┐       ┌──────────────────┐
│ 1. globals.css│         │ 3. page.tsx      │       │ 5. 다크모드 검증   │
│   :root 변수  │         │   (706줄, 56참조) │       │ 6. 시각 QA        │
│   .dark 변수  │ ──→     │ 4. navbar.tsx    │ ──→   │ 7. E2E 확인       │
│ 2. @theme &   │         │    footer.tsx    │       │                  │
│   유틸리티 교체│         │                  │       │                  │
└──────────────┘         └──────────────────┘       └──────────────────┘
```

### 상세 스텝

| Step | 작업 | 파일 | 검증 |
|------|------|------|------|
| A-1 | :root forge-* 제거, axis-* 추가, 시맨틱 변수 AXIS 매핑 | `globals.css` | `pnpm build` 성공 |
| A-2 | .dark 동일 변환 | `globals.css` | 다크모드 전환 확인 |
| A-3 | @theme inline forge-* → axis-* 교체 | `globals.css` | Tailwind 클래스 인식 확인 |
| A-4 | 유틸리티 클래스 교체 (forge-grid/glass/glow/pulse-ring) | `globals.css` | 빌드 성공 |
| B-1 | page.tsx 전체 forge-* → axis-* 교체 (56곳) | `page.tsx` | 빌드 + 시각 확인 |
| B-2 | navbar.tsx forge-* → axis-* 교체 (6곳) | `navbar.tsx` | 빌드 + 시각 확인 |
| B-3 | footer.tsx forge-* → axis-* 교체 (3곳) | `footer.tsx` | 빌드 + 시각 확인 |
| C-1 | 라이트/다크 모드 전체 페이지 시각 QA | 전체 | 스크린샷 비교 |
| C-2 | WCAG AA 콘트라스트 실측 | 전체 | 4.5:1 이상 |
| C-3 | E2E 테스트 통과 확인 | — | `pnpm e2e` |
| C-4 | `grep -r "forge-"` 잔존 확인 | 전체 | 0건 |

---

## 11. 파일 트리 — 수정 파일 목록

| # | 파일 | 변경 유형 | 예상 변경 라인 | 우선순위 |
|---|------|---------|:----------:|:------:|
| 1 | `packages/web/src/app/globals.css` | CSS 변수 전면 교체 + 유틸리티 리네임 | ~80줄 | 🔴 |
| 2 | `packages/web/src/app/(landing)/page.tsx` | forge-* 클래스 56곳 → axis-* 교체 | ~60줄 | 🔴 |
| 3 | `packages/web/src/components/landing/navbar.tsx` | forge-* 6곳 → axis-* | ~8줄 | 🟡 |
| 4 | `packages/web/src/components/landing/footer.tsx` | forge-* 3곳 → axis-* | ~4줄 | 🟡 |
| **합계** | **4개 파일** | | **~152줄** | |

### 변경 불필요 파일 (자동 전환)

| 파일 | 이유 |
|------|------|
| `components/sidebar.tsx` | shadcn 시맨틱만 사용, forge-* 0건 |
| `components/ui/*.tsx` (11개) | CSS 변수 의존, 자동 전환 |
| `app/(app)/*.tsx` (7 pages) | forge-* 0건, shadcn 시맨틱만 사용 |
| `components/feature/*.tsx` | forge-* 0건 |

---

## 12. 검증 기준

| 기준 | 목표 | 검증 방법 |
|------|------|---------|
| forge-* 잔존 | **0건** | `grep -r "forge-" packages/web/src/` |
| 빌드 성공 | 에러 0 | `pnpm typecheck && pnpm build` |
| E2E 통과 | 20/20 specs | `pnpm e2e` |
| 다크모드 | 라이트/다크 모두 정상 | 수동 시각 검증 |
| 콘트라스트 | WCAG AA (4.5:1) | 도구 측정 |
| AXIS 토큰 커버리지 | 100% (모든 브랜드 색상 AXIS 기반) | 시각 검증 |
