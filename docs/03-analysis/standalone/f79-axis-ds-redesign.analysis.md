---
code: FX-ANLS-018
title: "F79 AXIS Design System 기반 전면 리디자인 — 갭 분석"
version: 0.1
status: Active
category: ANLS
system-version: 1.4.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
design-doc: FX-DSGN-019
related-req: FX-REQ-079
---

# FX-ANLS-018: F79 AXIS Design System 기반 전면 리디자인 — 갭 분석

## Executive Summary

| 항목 | 결과 |
|------|------|
| **Match Rate** | **96%** |
| **분석 항목** | 25개 |
| **완전 일치** | 23개 |
| **부분 일치** | 2개 |
| **미구현** | 0개 |
| **대상 파일** | 4개 (globals.css, page.tsx, navbar.tsx, footer.tsx) |
| **forge-* 잔존** | **0건** (소스 코드 기준) |

| 관점 | 내용 |
|------|------|
| **Problem** | Digital Forge 테마(forge-* 6개 변수)를 AXIS DS 토큰으로 전면 교체해야 했어요 |
| **Solution** | globals.css 토큰 교체 + 랜딩 페이지/navbar/footer forge→axis 클래스 교체 |
| **Function UX Effect** | 팀 제품 간 통일 시각 언어 달성, forge-* 참조 0건 |
| **Core Value** | AX BD팀 브랜드 일관성 + AXIS DS 기반 유지보수성 확보 |

---

## 1. 항목별 갭 분석

### 1.1 globals.css — CSS 변수 및 유틸리티

| # | Design 항목 | 구현 상태 | Match % | Gap 설명 |
|---|------------|:---------:|:-------:|---------|
| 1 | :root forge-* 6개 변수 제거 | ✅ 완료 | 100% | forge-amber, forge-ember, forge-copper, forge-slate, forge-charcoal, forge-cream 모두 제거됨 |
| 2 | :root axis-* 12개 변수 추가 | ✅ 완료 | 100% | axis-primary, axis-primary-light, axis-primary-hover, axis-secondary, axis-accent, axis-blue, axis-blue-light, axis-green, axis-violet, axis-warm, axis-neutral, axis-surface 모두 존재 |
| 3 | :root --primary 시맨틱 변수 AXIS 매핑 | ✅ 완료 | 100% | `oklch(0.623 0.214 259.815)` — Design §3.1과 정확히 일치 |
| 4 | :root --ring AXIS 매핑 | ✅ 완료 | 100% | `oklch(0.623 0.214 259.815)` — Design과 일치 |
| 5 | :root --chart-1~5 AXIS 팔레트 | ✅ 완료 | 100% | 5개 모두 Design §3.1 값과 정확히 일치 |
| 6 | :root --sidebar-primary AXIS 매핑 | ✅ 완료 | 100% | `oklch(0.623 0.214 259.815)` — Design과 일치 |
| 7 | .dark forge-* 제거 + axis-* 다크 팔레트 | ✅ 완료 | 100% | 8개 axis-* 다크 값 모두 Design §3.2와 일치. 시맨틱 변수(--primary, --ring, --chart-*, --sidebar-primary)도 다크 값 정확 |
| 8 | @theme inline forge-* 제거 + axis-* 12개 추가 | ✅ 완료 | 100% | `--color-axis-*` 12개 항목 모두 존재, `--color-forge-*` 0건 |
| 9 | forge-grid → axis-grid 클래스 교체 | ✅ 완료 | 100% | `.axis-grid` + `.dark .axis-grid` 구현, forge-grid 0건 |
| 10 | forge-glass → axis-glass 클래스 교체 | ✅ 완료 | 100% | `.axis-glass` + `.dark .axis-glass` 구현, forge-glass 0건 |
| 11 | forge-glow → axis-glow + axis-glow-strong | ✅ 완료 | 100% | 두 클래스 모두 axis-primary(blue) 색상값으로 구현 |
| 12 | pulse-ring 애니메이션 axis-primary 색상 | ✅ 완료 | 100% | `oklch(0.623 0.214 259.815)` 기반으로 교체됨 |
| 13 | 유지 항목 미변경 확인 (blueprint-grid, grain-overlay 등) | ✅ 완료 | 100% | blueprint-grid, grain-overlay, animate-fade-in-up, animate-draw-line, animate-float, stagger-1~6 모두 변경 없이 유지 |

### 1.2 page.tsx — 랜딩 페이지 (706줄)

| # | Design 항목 | 구현 상태 | Match % | Gap 설명 |
|---|------------|:---------:|:-------:|---------|
| 14 | Hero 섹션: forge→axis 교체 (배경 blur, 배지, 그라데이션, CTA 등) | ✅ 완료 | 100% | `axis-grid`, `bg-axis-primary/5`, `border-axis-primary/20`, `from-axis-primary via-axis-primary-light to-axis-accent`, `bg-axis-primary text-white hover:bg-axis-primary-hover`, `axis-glow-strong` 모두 확인 |
| 15 | Stats Bar: 숫자 색상 forge-amber → axis-primary | ✅ 완료 | 100% | `text-axis-primary` 확인 (L436) |
| 16 | 3 Pillars: 카드/아이콘/라벨 forge→axis 교체 | ✅ 완료 | 100% | `axis-glass`, `hover:border-axis-primary/20`, `bg-axis-primary/10`, `text-axis-primary` 모두 확인 |
| 17 | Ecosystem Blueprint: 중앙 노드 + 화살표 forge→axis | ✅ 완료 | 100% | `border-axis-primary/40 bg-axis-primary/10`, `text-axis-primary`, `via-axis-primary/30 to-axis-primary/60`, `bg-axis-primary/40` 확인 |
| 18 | Architecture: 라벨/인디케이터/호버 forge→axis | ✅ 완료 | 100% | `axis-grid`, `text-axis-primary`, `from-axis-primary/80 to-axis-accent/40`, `hover:border-axis-primary/20` 확인 |
| 19 | Roadmap: current 카드/배지/불릿 forge→axis | ✅ 완료 | 100% | `border-axis-primary/30 bg-axis-primary/5`, `bg-axis-primary/20 text-axis-primary`, `bg-axis-primary/60`, `bg-axis-primary` 확인 |
| 20 | Quick Start: 터미널 카드/닷/프롬프트 forge→axis | ✅ 완료 | 100% | `axis-glass`, `bg-axis-accent/40`, `bg-axis-primary/40`, `text-axis-primary` 확인 |
| 21 | Final CTA: 아이콘/그라데이션/버튼 forge→axis | ✅ 완료 | 100% | `text-axis-primary`, `from-axis-primary to-axis-accent`, `bg-axis-primary text-white hover:bg-axis-primary-hover`, `axis-glow-strong` 확인 |
| 22 | pillars data `color` 필드 axis 전환 | ⚠️ 부분 | 85% | 첫 번째 항목만 `"axis-primary"`로 교체 (Design §5.2와 일치). 나머지 2개는 이미 `"axis-blue"`, `"axis-green"`으로 AXIS 토큰이므로 교체 불필요. 단, `color` 필드가 현재 CSS 클래스로 직접 사용되지 않으므로 실질 영향 없음 |

### 1.3 navbar.tsx (113줄)

| # | Design 항목 | 구현 상태 | Match % | Gap 설명 |
|---|------------|:---------:|:-------:|---------|
| 23 | 스크롤 보더/로고/링크 호버/CTA forge→axis 교체 | ✅ 완료 | 100% | `border-axis-primary/10`, `bg-axis-primary/10`, `text-axis-primary`, `hover:text-axis-primary`, `bg-axis-primary text-white hover:bg-axis-primary-hover`, `axis-glow` 모두 확인 |

### 1.4 footer.tsx (79줄)

| # | Design 항목 | 구현 상태 | Match % | Gap 설명 |
|---|------------|:---------:|:-------:|---------|
| 24 | 로고/아이콘/링크 호버 forge→axis 교체 | ✅ 완료 | 100% | `bg-axis-primary/10`, `text-axis-primary`, `hover:text-axis-primary` 모두 확인 |

### 1.5 대시보드 + shadcn 자동 전환

| # | Design 항목 | 구현 상태 | Match % | Gap 설명 |
|---|------------|:---------:|:-------:|---------|
| 25 | 대시보드 7페이지 + sidebar + shadcn 11개 컴포넌트 — forge-* 0건, CSS 변수 자동 전환 | ✅ 완료 | 100% | Design §7~§8 기술대로 코드 변경 불필요 확인. globals.css 시맨틱 변수 교체만으로 자동 전환 |

---

## 2. forge-* 잔존 검색 결과

### 소스 코드 (`packages/web/src/`)

```
$ grep -r "forge" packages/web/src/
→ 0건
```

**소스 코드에서 forge-* 참조는 완전히 제거되었어요.**

### 빌드 산출물 (`packages/web/.next/`, `packages/web/out/`)

빌드 캐시(`.next/`, `out/`)에는 이전 빌드의 forge 참조가 남아 있어요. 이건 소스 코드가 아니라 **캐시 파일**이므로, `pnpm build` 재실행 시 자동으로 갱신돼요. 문제 없음.

---

## 3. 부분 일치 항목 상세

### #22 pillars data `color` 필드 (85%)

**상황:** Design §5.2에서 pillars data의 `color` 필드를 `"forge-amber"` → `"axis-primary"`로 교체하도록 명시했어요. 구현에서는:
- 첫 번째(PlannerAgent): `"axis-primary"` ✅
- 두 번째(조직 지식 연결): `"axis-blue"` — 이미 AXIS 토큰
- 세 번째(실험-코드 연결): `"axis-green"` — 이미 AXIS 토큰

Design 문서에서도 "첫 번째 항목만" 교체로 명시했고, `color` 필드가 현재 CSS 클래스로 직접 사용되지 않는다고 주석까지 달았어요. **실질적 영향 없음.**

---

## 4. 미구현 항목

**없음.** Design §2~§12의 모든 명세 항목이 구현되었어요.

---

## 5. 검증 기준 달성 여부

| 기준 | 목표 | 실측 | 결과 |
|------|------|------|:----:|
| forge-* 잔존 (소스) | 0건 | 0건 | ✅ |
| axis-* 토큰 정의 (:root) | 12개 | 12개 | ✅ |
| axis-* 토큰 정의 (.dark) | 8개 (나머지 4개는 라이트와 동일) | 8개 | ✅ |
| @theme inline axis-* 매핑 | 12개 | 12개 | ✅ |
| 시맨틱 변수 AXIS 매핑 | --primary, --ring, --chart-1~5, --sidebar-primary | 모두 매핑 | ✅ |
| 유틸리티 클래스 교체 | axis-grid, axis-glass, axis-glow, axis-glow-strong | 모두 존재 | ✅ |
| page.tsx forge→axis | 56곳+ | 전체 교체 | ✅ |
| navbar.tsx forge→axis | 6곳+ | 전체 교체 | ✅ |
| footer.tsx forge→axis | 3곳+ | 전체 교체 | ✅ |
| 대시보드 자동 전환 | 코드 변경 불필요 | 변경 없음 확인 | ✅ |
| 다크모드 .dark 갱신 | axis-* 다크 팔레트 | 모두 적용 | ✅ |

---

## 6. 종합 Match Rate 계산

| 카테고리 | 항목 수 | 완전 일치 | 부분 일치 | 미구현 | 가중 점수 |
|---------|:------:|:--------:|:--------:|:-----:|:---------:|
| globals.css 변수/유틸리티 | 13 | 13 | 0 | 0 | 13.00 |
| page.tsx 섹션별 교체 | 9 | 8 | 1 (85%) | 0 | 8.85 |
| navbar.tsx | 1 | 1 | 0 | 0 | 1.00 |
| footer.tsx | 1 | 1 | 0 | 0 | 1.00 |
| 대시보드/shadcn 자동 전환 | 1 | 1 | 0 | 0 | 1.00 |
| **합계** | **25** | **23** | **2** | **0** | **24.85** |

**Match Rate = 24.85 / 25 × 100 = 96%**

---

## 7. 결론

F79 AXIS Design System 리디자인은 **96% Match Rate**로 Design 문서를 충실히 구현했어요.

**핵심 성과:**
- forge-* CSS 변수 6개 완전 제거, axis-* 토큰 12개 전면 적용
- 랜딩 페이지(706줄) 전체 forge→axis 색상 전환 완료
- navbar/footer forge 참조 0건 달성
- 시맨틱 변수 AXIS 매핑으로 대시보드 + shadcn 11개 컴포넌트 자동 전환
- 다크모드 .dark 섹션 완전 갱신
- 소스 코드 forge-* 잔존 0건

**부분 일치 사유:** pillars data의 `color` 필드가 CSS 클래스로 사용되지 않는 데이터 속성이라 실질 영향 없음.
