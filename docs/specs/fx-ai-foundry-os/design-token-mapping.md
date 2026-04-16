---
code: FX-DESIGN-001
title: AI Foundry OS v0.3 → AXIS Design System Token Mapping
version: 1.0
status: Draft
created: 2026-04-16
author: Sinclair Seo
source: AI_Foundry_OS_v0.3_260414.html
axis-version: "@axis-ds/tokens@1.1.1"
---

# AI Foundry OS v0.3 → AXIS Design System Token Mapping

> v0.3 HTML 전략 문서의 로컬 CSS 변수를 AXIS Design System 토큰에 매핑한 기준표.
> 향후 v0.4 전환 및 AXIS 연동 시 이 문서가 기준점.

## 1. 컬러 토큰 매핑

### 1.1 그레이스케일

| v0.3 변수 | v0.3 값 | AXIS 토큰 | AXIS 값 | Delta | 판정 |
|-----------|---------|-----------|---------|-------|------|
| `--white` | `#fff` | `--axis-color-white` | `#FFFFFF` | 0 | **일치** |
| `--gray-50` | `#f8f9fa` | `--axis-color-gray-50` | `#F9FAFB` | 미세 | **근사** — AXIS 채택 |
| `--gray-100` | `#f0f0f0` | `--axis-color-gray-100` | `#F3F4F6` | 중간 | **전환 필요** |
| `--gray-150` | `#ebebeb` | *(해당 없음)* | — | — | **삭제** — gray-200 또는 gray-100 사용 |
| `--gray-200` | `#e5e5e5` | `--axis-color-gray-200` | `#E5E7EB` | 미세 | **근사** — AXIS 채택 |
| `--gray-300` | `#ccc` | `--axis-color-gray-300` | `#D1D5DB` | 중간 | **전환 필요** |
| `--gray-400` | `#999` | `--axis-color-gray-400` | `#9CA3AF` | 미세 | **근사** — AXIS 채택 |
| `--gray-500` | `#7a7a7a` | `--axis-color-gray-500` | `#6B7280` | 중간 | **전환 필요** |
| `--gray-600` | `#666` | `--axis-color-gray-600` | `#4B5563` | **큰 차이** | **주의** — 밝기 반전 |
| `--gray-700` | `#444` | `--axis-color-gray-700` | `#374151` | 미세 | **근사** — AXIS 채택 |
| `--gray-800` | `#2d2d2d` | `--axis-color-gray-800` | `#1F2937` | 중간 | **전환 필요** |
| `--gray-900` | `#1a1a1a` | `--axis-color-gray-900` | `#111827` | 미세 | **근사** — AXIS 채택 |
| `--black` | `#111` | `--axis-color-gray-900` | `#111827` | 미세 | **매핑** — `--axis-color-black`(#000)보다 gray-900이 적합 |

> **핵심 결정**: v0.3의 `--black`(#111)은 순수 검정이 아니라 짙은 회색.
> AXIS `--axis-color-black`(#000) 대신 **`--axis-color-gray-900`(#111827)**에 매핑하는 것이 시각적으로 동일함.

### 1.2 시맨틱 컬러

| v0.3 변수 | v0.3 값 | AXIS 토큰 | AXIS 값 | 판정 |
|-----------|---------|-----------|---------|------|
| `--yellow` | `#facc15` | `--axis-color-yellow-400` | `#FACC15` | **완전 일치** |
| `--accent` | `#dc2626` | `--axis-color-red-600` | `#DC2626` | **완전 일치** |
| `--accent-light` | `#fef2f2` | `--axis-color-red-50` / `--axis-surface-error` | `#FEF2F2` | **완전 일치** |

### 1.3 시맨틱 서피스/텍스트 매핑

| v0.3 용도 | v0.3 CSS | AXIS 시맨틱 토큰 | 비고 |
|-----------|----------|-----------------|------|
| 기본 배경 | `var(--white)` | `--axis-surface-default` | `#FFFFFF` |
| 섹션 배경 | `var(--gray-50)` | `--axis-surface-secondary` | AXIS는 `#F3F4F6`로 약간 다름 |
| 다크 블록 배경 | `var(--black)` | `--axis-surface-inverse` | `#111827` |
| 기본 텍스트 | `var(--black)` | `--axis-text-primary` | `#111827` |
| 보조 텍스트 | `var(--gray-600)` | `--axis-text-secondary` | AXIS `#4B5563` (더 짙음) |
| 약한 텍스트 | `var(--gray-400)` | `--axis-text-tertiary` | AXIS `#6B7280` (더 짙음) |
| 반전 텍스트 | `var(--white)` | `--axis-text-inverse` | `#FFFFFF` |
| 기본 보더 | `var(--gray-200)` | `--axis-border-default` | 근사 일치 |
| 보조 보더 | `var(--gray-300)` | `--axis-border-secondary` | 전환 필요 |

---

## 2. 타이포그래피 토큰 매핑

### 2.1 폰트 패밀리

| v0.3 | AXIS | 결정 |
|------|------|------|
| `'Pretendard', -apple-system, ...` | `--axis-font-family-sans` (`ui-sans-serif, system-ui, ...`) | **Pretendard 유지** — 한국어 최적화 폰트. AXIS fallback 스택 뒤에 배치 |
| `'Georgia', serif` (인용) | `--axis-font-family-serif` | 동일 |
| `'Menlo', 'Courier New', monospace` | `--axis-font-family-mono` | AXIS 채택 |

**권장 폰트 스택**:
```css
--fx-font-family: 'Pretendard', var(--axis-font-family-sans);
```

### 2.2 폰트 사이즈

| v0.3 용도 | v0.3 값 | AXIS 토큰 | AXIS 값 | 판정 |
|-----------|---------|-----------|---------|------|
| Hero H1 | `48px` | `--axis-font-size-5xl` | `3rem` (48px) | **일치** |
| Section Title | `36px` | `--axis-font-size-4xl` | `2.25rem` (36px) | **일치** |
| Subsection Title | `22px` | — | — | 비표준 — `xl`(20px)과 `2xl`(24px) 사이 |
| Card Title | `15~20px` | `sm`~`xl` | — | 매핑 가능 |
| Body | `13~15px` | `xs`(12px)~`base`(16px) | — | `sm`(14px) 중심 |
| Small/Label | `10~12px` | `--axis-font-size-xs` | `0.75rem` (12px) | 10px는 비표준 |
| Section Label | `12px` | `--axis-font-size-xs` | `0.75rem` | **일치** |

> **결정 필요**: v0.3의 `22px` 서브섹션 타이틀은 AXIS에 대응 토큰이 없음.
> 옵션 A: `--axis-font-size-xl`(20px)로 약간 축소
> 옵션 B: 커스텀 토큰 `--fx-font-size-subsection: 1.375rem` 추가

### 2.3 폰트 웨이트

| v0.3 용도 | v0.3 값 | AXIS 토큰 |
|-----------|---------|-----------|
| Hero H1 | `900` | `--axis-font-weight-black` |
| Section Title | `800` | `--axis-font-weight-extrabold` |
| Card Title | `700~800` | `bold` ~ `extrabold` |
| Body | `400` | `--axis-font-weight-normal` |
| Strong Body | `600~700` | `semibold` ~ `bold` |
| Label | `600~700` | `semibold` ~ `bold` |

### 2.4 Line Height

| v0.3 값 | 용도 | AXIS 토큰 | AXIS 값 |
|---------|------|-----------|---------|
| `1` | 큰 숫자/아이콘 | `--axis-font-lineHeight-none` | `1` |
| `1.3~1.35` | 헤딩 | `--axis-font-lineHeight-tight` | `1.25` |
| `1.5~1.6` | 카드 본문 | `--axis-font-lineHeight-normal` | `1.5` |
| `1.7` | 본문 (주요) | `--axis-font-lineHeight-relaxed` | `1.625` |
| `1.8~1.9` | 넓은 본문 | `--axis-font-lineHeight-loose` | `2` |

> **v0.3 특이점**: `1.7`이 가장 빈번. AXIS `relaxed`(1.625)와 `loose`(2) 사이.
> **결정**: `relaxed`(1.625)로 통일 또는 커스텀 토큰 `--fx-lineHeight-body: 1.7` 유지

### 2.5 Letter Spacing

| v0.3 값 | 용도 | 권장 토큰명 |
|---------|------|------------|
| `-0.04em` | Hero H1 | `--fx-tracking-tightest` |
| `-0.02em ~ -0.03em` | 제목류 | `--fx-tracking-tight` |
| `-0.01em` | 카드 제목 | `--fx-tracking-slight` |
| `0` (기본) | 본문 | (기본값) |
| `0.04em ~ 0.08em` | 레이블 | `--fx-tracking-wide` |
| `0.1em ~ 0.12em` | 태그/뱃지 uppercase | `--fx-tracking-widest` |

> AXIS에 letter-spacing 토큰이 없으므로 `--fx-tracking-*` 커스텀 토큰 5종 정의 권장.

---

## 3. 스페이싱 토큰 매핑

### 3.1 주요 스페이싱 값

| v0.3 값 | 용도 | AXIS 토큰 | AXIS 값 |
|---------|------|-----------|---------|
| `40px` | 섹션 좌우 패딩 | `--axis-space-10` | `2.5rem` (40px) | **일치** |
| `120px` | 섹션 상단 패딩 | `--axis-space-48` × custom | — | AXIS 최대 24rem(384px) |
| `80px` | 섹션 하단 패딩 | `--axis-space-20` | `5rem` (80px) | **일치** |
| `56px` | 네비게이션 높이 | `--axis-space-14` | `3.5rem` (56px) | **일치** |
| `28px` | 카드 패딩 | `--axis-space-7` | `1.75rem` (28px) | **일치** |
| `20px` | 그리드 갭 | `--axis-space-5` | `1.25rem` (20px) | **일치** |
| `16px` | 그리드 갭 (작음) | `--axis-space-4` | `1rem` (16px) | **일치** |
| `12px` | 아이템 갭 | `--axis-space-3` | `0.75rem` (12px) | **일치** |

### 3.2 비표준 스페이싱

| v0.3 값 | 용도 | 권장 |
|---------|------|------|
| `18px` | 일부 그리드 갭 | `--axis-space-4`(16px) 또는 `--axis-space-5`(20px)로 표준화 |
| `14px` | 일부 아이템 갭 | `--axis-space-3.5`(0.875rem = 14px) 사용 가능 |
| `52px` | 서브섹션 상단 마진 | `--axis-space-12`(3rem = 48px) 또는 `--axis-space-14`(3.5rem = 56px) |

---

## 4. Border Radius 매핑

| v0.3 값 | 용도 | AXIS 토큰 | AXIS 값 |
|---------|------|-----------|---------|
| `4px` | 작은 뱃지 | `--axis-radius-default` | `0.25rem` (4px) |
| `6px` | 작은 요소 | `--axis-radius-md` | `0.375rem` (6px) |
| `8px` | 버튼 | `--axis-radius-lg` | `0.5rem` (8px) |
| `10px` | 중간 컨테이너 | `--axis-radius-xl` | `0.75rem` (12px) — 약간 다름 |
| `12px` | 카드 내부 | `--axis-radius-xl` | `0.75rem` (12px) |
| `14px` | 큰 컨테이너 | `--axis-radius-2xl` | `1rem` (16px) — 근사 |
| `16px` | 메인 카드 | `--axis-radius-2xl` | `1rem` (16px) | **일치** |
| `20px` | 큰 블록 | `--axis-radius-3xl` | `1.5rem` (24px) — 약간 다름 |
| `100px` | 필/뱃지 | `--axis-radius-full` | `9999px` | 동일 효과 |

---

## 5. 컴포넌트 매핑 가이드

### 5.1 AXIS 컴포넌트 대응

| v0.3 컴포넌트 | CSS 클래스 | AXIS 대응 | 전환 난이도 |
|--------------|-----------|-----------|:----------:|
| Card | `.card` | `@axis-ds/ui-react` Card | 낮음 |
| Badge/Tag | `.mc-tag`, `.vc-tag` | Badge 컴포넌트 | 낮음 |
| Table | `.compare-table` | Table 컴포넌트 | 중간 |
| Button | `.demo-btn` | Button 컴포넌트 | 낮음 |
| Separator | 없음 (border 사용) | Separator 컴포넌트 | 신규 |
| Dialog/Details | `details/summary` | 네이티브 유지 | — |

### 5.2 커스텀 컴포넌트 (AXIS에 없음)

이 컴포넌트들은 AXIS 토큰을 사용하되, 레이아웃은 커스텀 유지:

| 컴포넌트 | CSS 클래스 | 설명 |
|---------|-----------|------|
| Studio Block | `.studio-block` | 다크 배경 하이라이트 블록 |
| Value Chain | `.vc-container` | E2E 밸류체인 시각화 |
| Architecture Stack | `.arch-stack` | 5-Layer 아키텍처 |
| Roadmap Timeline | `.rm-main` | 마일스톤 타임라인 |
| Maturity Bar | `.mat-row` | 진행률 블록 바 |
| Core Insight | `.core-insight` | 2칼럼 스탯+메시지 |
| Impact Box | `.impact-box` | KPI 하이라이트 |
| Whynow Grid | `.whynow-grid` | Before/After 비교 |
| WWH Card | `.wwh-card` | Why/What/How 3분할 |

---

## 6. 전환 로드맵

### Phase 1: 토큰 레이어 삽입 (변경 최소)
- v0.3 `:root` 변수를 AXIS 변수로 **리매핑** (CSS alias)
- 시각적 변화 최소화하면서 토큰 기반 전환

```css
/* Phase 1: Alias Layer */
:root {
  --black: var(--axis-color-gray-900);      /* #111 → #111827 */
  --gray-50: var(--axis-color-gray-50);     /* #f8f9fa → #F9FAFB */
  --gray-200: var(--axis-color-gray-200);   /* #e5e5e5 → #E5E7EB */
  --yellow: var(--axis-color-yellow-400);   /* 동일 */
  --accent: var(--axis-color-red-600);      /* 동일 */
  /* ... */
}
```

### Phase 2: 시맨틱 토큰 전환
- `var(--black)` → `var(--axis-text-primary)` / `var(--axis-surface-inverse)`
- 용도별 시맨틱 토큰으로 분리

### Phase 3: 컴포넌트 AXIS 전환
- Card, Badge, Button 등 AXIS 컴포넌트로 교체
- 커스텀 컴포넌트는 AXIS 토큰만 사용하도록 리팩토링

### Phase 4: 다크 모드
- AXIS `.dark` 클래스 토큰 활용
- v0.3의 다크 블록(`.studio-block`, `.impact-box`)은 이미 다크 패턴 사용 중

---

## 7. 커스텀 토큰 정의 (AXIS에 없는 것)

AXIS에 대응 토큰이 없어 AI Foundry OS 전용으로 정의해야 할 토큰:

```css
:root {
  /* 폰트 */
  --fx-font-family: 'Pretendard', var(--axis-font-family-sans);
  --fx-font-size-subsection: 1.375rem;   /* 22px, AXIS xl~2xl 사이 */
  --fx-lineHeight-body: 1.7;              /* AXIS relaxed(1.625)보다 넓음 */

  /* Letter Spacing (5단계) */
  --fx-tracking-tightest: -0.04em;
  --fx-tracking-tight: -0.02em;
  --fx-tracking-slight: -0.01em;
  --fx-tracking-wide: 0.08em;
  --fx-tracking-widest: 0.12em;

  /* Shadows (AXIS card-shadow만 있음, 추가 필요) */
  --fx-shadow-hover: 0 8px 20px rgba(0,0,0,0.06);
  --fx-shadow-deep: 0 25px 50px -12px rgb(0 0 0 / 0.25);

  /* Transitions */
  --fx-transition-fast: 0.2s ease;
  --fx-transition-normal: 0.3s ease;
  --fx-transition-slow: 0.7s ease;
}
```

---

## 8. 접근성 점검 결과

| 항목 | 상태 | 조치 |
|------|:----:|------|
| 최소 명암비 (WCAG AA 4.5:1) | **주의** | `--gray-400`(#999) on white = 2.85:1 ← **미달** |
| Focus 상태 | **미비** | `contenteditable`만 있음, 링크/버튼 focus 없음 |
| 스크린 리더 | **미비** | `::before` 의사 요소(▶, ✕, ✓) 접근 불가 |
| 키보드 내비게이션 | **부분** | `details/summary`만 작동, 커스텀 버튼 미지원 |

### 명암비 미달 항목

| 배경 | 전경 | 비율 | WCAG AA |
|------|------|:----:|:-------:|
| `#fff` | `#999` (gray-400) | 2.85:1 | FAIL |
| `#fff` | `#7a7a7a` (gray-500) | 4.16:1 | FAIL (일반 텍스트) |
| `#fff` | `#666` (gray-600) | 5.74:1 | PASS |

> AXIS 전환 시 gray-400(`#9CA3AF`, 3.0:1)도 동일 이슈.
> 약한 텍스트에는 최소 `--axis-color-gray-500`(`#6B7280`, 4.6:1) 사용 필요.

---

## 관련 파일

| 파일 | 경로 |
|------|------|
| v0.3 원본 HTML | `docs/specs/fx-ai-foundry-os/AI_Foundry_OS_v0.3_260414.html` |
| AXIS 토큰 CSS | `node_modules/@axis-ds/tokens/dist/css/variables.css` |
| AXIS 테마 프로바이더 | `packages/web/src/components/theme-provider.tsx` |
| 기존 디자인 토큰 라우트 | `packages/web/src/routes/tokens.tsx` |
