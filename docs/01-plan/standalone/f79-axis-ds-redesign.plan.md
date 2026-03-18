---
code: FX-PLAN-019
title: "F79 AXIS Design System 기반 전면 리디자인"
version: 0.1
status: Draft
category: PLAN
system-version: 1.4.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
related-req: FX-REQ-079
priority: P1
---

# FX-PLAN-019: F79 AXIS Design System 기반 전면 리디자인

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F79 AXIS DS 기반 전면 리디자인 |
| **기간** | Sprint 17 (2026-03-18 ~) |
| **시스템 버전** | v1.4.0 → v1.5.0 |

| 관점 | 내용 |
|------|------|
| **Problem** | Digital Forge 테마가 Foundry-X 전용으로 설계되어 AX BD팀 제품 간 시각적 일관성이 부재해요. AXIS DS 토큰이 일부만 적용(globals.css accent 4개)되어 있고, 랜딩과 대시보드 전체가 forge-* 커스텀 색상에 의존하고 있어요. |
| **Solution** | AXIS Design System 토큰을 기반으로 tailwind.config, globals.css, 랜딩 페이지, 대시보드를 전면 마이그레이션해요. shadcn/ui 컴포넌트를 AXIS DS 토큰 위에서 동작하도록 래핑하고, 다크모드를 유지해요. |
| **Function UX Effect** | 팀 제품(Foundry-X, Discovery-X, AI Foundry) 간 통일된 시각 언어 → 사용자가 제품 간 이동 시 학습 비용 제로 |
| **Core Value** | AX BD팀 브랜드 일관성 확립 + 디자인 시스템 기반 유지보수성 향상 |

---

## 1. 개요

### 1.1 목적

Foundry-X 웹(랜딩 + 대시보드)의 디자인을 **AXIS Design System** 기반으로 전면 전환해요. 현재 Digital Forge 테마(forge-amber, forge-ember, forge-copper 등)를 AXIS DS 토큰으로 교체하여 AX BD팀 제품군 전체의 시각적 일관성을 확보해요.

### 1.2 배경

#### Digital Forge → AXIS DS 전환 이유

1. **팀 통일성**: AX BD팀은 Discovery-X, AI Foundry, Foundry-X, AXIS DS 총 4개 제품을 운영해요. 각 제품이 독자적 테마를 쓰면 팀 브랜드가 분산돼요.
2. **유지보수 비용**: Digital Forge 테마는 Foundry-X 전용 커스텀 색상 6개(forge-amber/ember/copper/slate/charcoal/cream)를 관리해야 해요. AXIS DS 토큰을 쓰면 중앙 관리가 가능해요.
3. **F74 선행 작업**: Sprint 14에서 AXIS DS 토큰 일부(axis-blue, axis-blue-light, axis-green, axis-violet)를 globals.css에 추가했어요. F79는 이를 전체로 확장하는 작업이에요.
4. **Phase 3 진입**: 멀티테넌시 + 외부 연동 단계에서 팀 내 UI 통일이 전제 조건이에요.

#### 현재 상태 분석

| 영역 | 현재 상태 | 목표 |
|------|----------|------|
| **globals.css** | forge-* 6개 + axis-* 4개 CSS 변수, oklch 기반 | AXIS DS 토큰으로 전면 교체, forge-* 제거 |
| **tailwind.config.ts** | 파일 없음 (Tailwind v4 CSS-based config 사용) | @theme inline 블록에서 AXIS DS 토큰 매핑 |
| **랜딩 페이지** | forge-amber 중심 색상, forge-grid/forge-glass/forge-glow 커스텀 유틸리티 | AXIS DS 팔레트 기반 리디자인 |
| **대시보드** | Sidebar + 7개 페이지, shadcn/ui 기본 테마 | AXIS DS 토큰 위에서 동작 |
| **shadcn/ui** | 11개 컴포넌트 (avatar, badge, button, card, dropdown-menu, input, sheet, skeleton, table, tabs, textarea) | CSS 변수 교체로 자동 전환, 필요시 래핑 |
| **다크모드** | .dark 클래스 기반, oklch 변수 전환 | 유지 (AXIS DS 다크 팔레트 적용) |
| **애니메이션** | fade-in-up, pulse-ring, draw-line, float, stagger-* | 유지 (색상 참조만 AXIS DS로 변경) |

---

## 2. Scope

### F79 체크리스트

- [ ] **F79-1**: AXIS DS 토큰 분석 — 색상 팔레트, 타이포그래피, 간격, 그림자, 라운드 정의
- [ ] **F79-2**: globals.css CSS 변수 AXIS DS 토큰으로 교체
  - [ ] :root 라이트 테마 변수 전환
  - [ ] .dark 다크 테마 변수 전환
  - [ ] forge-* 커스텀 변수 제거, axis-* 확장
  - [ ] @theme inline 블록 AXIS DS 매핑
- [ ] **F79-3**: 커스텀 유틸리티 클래스 마이그레이션
  - [ ] forge-grid → axis-grid (AXIS DS 그리드 패턴)
  - [ ] forge-glass → axis-glass (글래스모피즘 유지, 색상 변경)
  - [ ] forge-glow / forge-glow-strong → axis-glow (브랜드 색상 변경)
  - [ ] blueprint-grid 유지 (axis-blue 이미 사용 중)
  - [ ] grain-overlay 유지 (색상 무관)
  - [ ] 애니메이션(pulse-ring 등) 색상 참조 업데이트
- [ ] **F79-4**: 랜딩 페이지 리디자인
  - [ ] Navbar — 로고, 내비게이션 링크 스타일
  - [ ] Hero 섹션 — 그라데이션, 배경 효과, CTA 버튼
  - [ ] Stats Bar — 숫자 강조 색상
  - [ ] Features (3 Pillars) 섹션 — 카드 스타일, 아이콘 색상
  - [ ] Ecosystem Blueprint 섹션 — 다이어그램 노드 색상
  - [ ] Architecture 섹션 — 레이어 인디케이터, 배지
  - [ ] Roadmap 섹션 — 타임라인 상태 색상
  - [ ] Quick Start 터미널 카드
  - [ ] Final CTA 섹션
  - [ ] Footer — 브랜드 영역, 링크 호버
- [ ] **F79-5**: 대시보드 리디자인
  - [ ] Sidebar — 로고, 네비게이션, 활성 상태 색상
  - [ ] Dashboard 페이지 — 카드, 차트 색상
  - [ ] Agents 페이지 — 상태 배지, 실행 모달
  - [ ] Architecture 페이지 — 다이어그램 색상
  - [ ] Spec Generator 페이지 — 충돌 카드, 폼
  - [ ] Tokens 페이지 — 테이블, 배지
  - [ ] Wiki 페이지 — 콘텐츠 영역
  - [ ] Workspace 페이지 — 레이아웃
- [ ] **F79-6**: shadcn/ui 컴포넌트 AXIS DS 전략 실행
  - [ ] CSS 변수 교체로 자동 전환되는 컴포넌트 확인 (button, card, badge 등)
  - [ ] 추가 래핑이 필요한 컴포넌트 식별 및 처리
- [ ] **F79-7**: 다크모드 검증
  - [ ] 라이트/다크 모드 전체 페이지 시각 검증
  - [ ] 콘트라스트 비율 WCAG AA 기준 충족 확인
- [ ] **F79-8**: 타이포그래피 전환 (해당 시)
  - [ ] AXIS DS 폰트 패밀리 적용 (font-sans, font-display, font-mono)
  - [ ] font-size 스케일 AXIS DS 기준으로 조정

---

## 3. Technical Details

### 3.1 마이그레이션 순서

순서가 중요해요. 토큰 기반(하위 레이어)부터 시작해서 UI(상위 레이어)로 올라가요.

```
Phase A: 토큰 기반          Phase B: 글로벌 스타일       Phase C: 페이지 리디자인
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ F79-1            │      │ F79-2            │      │ F79-4            │
│ AXIS DS 토큰 분석 │ ──→ │ globals.css 교체  │ ──→ │ 랜딩 페이지       │
└──────────────────┘      │ F79-3            │      │ F79-5            │
                          │ 유틸리티 마이그레이션│      │ 대시보드          │
                          └──────────────────┘      │ F79-6            │
                                                     │ shadcn/ui 확인   │
                                                     │ F79-7, F79-8    │
                                                     │ 다크모드/폰트     │
                                                     └──────────────────┘
```

### 3.2 Phase A: 토큰 기반 (F79-1)

AXIS Design System 리포에서 다음 토큰을 추출·분석해요:

| 토큰 카테고리 | 추출 대상 | 현재 Foundry-X 대응 |
|-------------|----------|-------------------|
| **색상 팔레트** | Primary, Secondary, Accent, Neutral, Semantic (success/warning/error/info) | forge-* 6개 + shadcn 기본 |
| **타이포그래피** | Font family, size scale, weight, line-height, letter-spacing | font-sans/display/mono (커스텀) |
| **간격** | Spacing scale (4px 기반 또는 8px 기반) | Tailwind 기본 |
| **그림자** | Elevation levels (sm, md, lg, xl) | forge-glow 커스텀 |
| **라운드** | Border radius scale | --radius: 0.625rem |
| **다크모드** | 각 토큰의 다크 팔레트 변환 | .dark 클래스 변수 |

### 3.3 Phase B: 글로벌 스타일 (F79-2, F79-3)

**globals.css 변환 전략:**

```
현재                          목표
─────────────────────         ─────────────────────
:root {                       :root {
  --forge-amber: ...           --axis-primary: ...
  --forge-ember: ...           --axis-primary-hover: ...
  --forge-copper: ...          --axis-secondary: ...
  --forge-slate: ...           --axis-accent: ...
  --forge-charcoal: ...        --axis-neutral-*: ...
  --forge-cream: ...           --axis-success/warning/error: ...
  --axis-blue: ...     ──→     --axis-blue: ... (유지)
  --axis-blue-light: ...       --axis-blue-light: ... (유지)
  --axis-green: ...            --axis-green: ... (유지)
  --axis-violet: ...           --axis-violet: ... (유지)
}                             }
```

**@theme inline 블록:**
- `--color-forge-*` 항목 전체를 `--color-axis-*`로 교체
- shadcn 시맨틱 변수(--primary, --secondary 등)는 AXIS DS 토큰으로 매핑

**커스텀 유틸리티 변환:**

| 현재 클래스 | 변환 방향 | 비고 |
|-----------|---------|------|
| `forge-grid` | `axis-grid` | 그리드 색상을 AXIS primary로 |
| `forge-glass` | `axis-glass` | 배경/보더 색상 변경 |
| `forge-glow` | `axis-glow` | box-shadow 색상을 AXIS primary로 |
| `forge-glow-strong` | `axis-glow-strong` | 동일 |
| `blueprint-grid` | 유지 | 이미 axis-blue 사용 |
| `grain-overlay` | 유지 | 색상 무관 |
| `animate-pulse-ring` | 색상 참조 변경 | forge-amber → axis primary |

### 3.4 Phase C: 페이지 리디자인 (F79-4 ~ F79-8)

**랜딩 페이지 (page.tsx, 706줄):**
- forge-amber/ember/copper 참조 약 **60+곳** → AXIS primary/accent로 교체
- 그라데이션: `from-forge-amber via-forge-ember to-forge-copper` → AXIS 그라데이션
- 컴포넌트별 색상 클래스 일괄 변경
- EcosystemDiagram: 기존 axis-* 색상 유지, forge-amber 참조만 변경
- ArchitectureBlueprint: forge-amber → AXIS primary
- RoadmapTimeline: 상태별 색상 AXIS 매핑

**대시보드 (7개 페이지):**
- Sidebar: forge-amber 로고/활성 색상 → AXIS primary
- 각 페이지의 forge-* 참조 → AXIS 토큰으로 변환
- feature 컴포넌트 (AgentExecuteModal, ConflictCard 등): forge-* 색상 교체

**shadcn/ui 전략:**
- CSS 변수(--primary, --secondary, --accent 등)를 AXIS DS로 매핑하면 shadcn/ui 11개 컴포넌트는 **자동으로 전환**돼요 (추가 코드 변경 불필요)
- 만약 AXIS DS 전용 variant나 사이즈가 필요하면 래핑 컴포넌트 생성 (예: `axis-button.tsx`)

### 3.5 파일 영향 범위

| 파일 | 변경 유형 | 우선순위 |
|------|---------|---------|
| `globals.css` | CSS 변수 전면 교체 | 🔴 최우선 |
| `page.tsx` (landing) | 색상 클래스 60+ 교체 | 🔴 높음 |
| `navbar.tsx` | 로고/네비 색상 | 🟡 중간 |
| `footer.tsx` | 브랜드/링크 색상 | 🟡 중간 |
| `layout.tsx` (app) | Sidebar 참조 확인 | 🟡 중간 |
| `sidebar.tsx` | 로고/활성 상태 | 🟡 중간 |
| `dashboard/page.tsx` | 카드/차트 색상 | 🟡 중간 |
| `agents/page.tsx` | 상태 배지, 모달 | 🟡 중간 |
| `architecture/page.tsx` | 다이어그램 | 🟡 중간 |
| `spec-generator/page.tsx` | 충돌 카드, 폼 | 🟡 중간 |
| `tokens/page.tsx` | 테이블 | 🟢 낮음 |
| `wiki/page.tsx` | 콘텐츠 | 🟢 낮음 |
| `workspace/page.tsx` | 레이아웃 | 🟢 낮음 |
| `components/feature/*.tsx` | forge-* 참조 교체 | 🟡 중간 |
| `components/ui/*.tsx` | 대부분 자동 전환 | 🟢 낮음 |

---

## 4. Risk & Mitigation

| # | 리스크 | 영향 | 확률 | 완화 전략 |
|---|--------|------|------|----------|
| R1 | **기존 UI 회귀** — 색상 교체 과정에서 레이아웃/가독성 깨짐 | High | Medium | 마이그레이션 단계별 스크린샷 비교 (Before/After). globals.css 변경 후 전체 페이지 시각 검증 선행 |
| R2 | **다크모드 호환성** — AXIS DS 다크 팔레트가 불완전할 경우 콘트라스트 부족 | Medium | Medium | WCAG AA 콘트라스트 비율(4.5:1) 체크. AXIS DS에 다크 팔레트가 없으면 oklch 기반으로 자체 생성 |
| R3 | **AXIS DS 토큰 미완성** — 디자인 시스템이 아직 모든 토큰을 제공하지 않을 수 있음 | Medium | Low | 누락 토큰은 AXIS DS 컨벤션에 맞춰 보간 생성 후 upstream PR |
| R4 | **shadcn/ui 컴포넌트 API 변경** — CSS 변수 교체만으로 불충분한 경우 | Low | Low | 11개 컴포넌트 각각 시각 검증. 문제 발견 시 래핑 컴포넌트로 대응 |
| R5 | **forge-* 하드코딩 잔존** — inline style이나 동적 색상 참조 누락 | Medium | Medium | `grep -r "forge-"` 전수 검색으로 잔존 참조 제로 확인 |
| R6 | **성능 영향** — 추가 CSS 변수나 폰트 로딩으로 LCP 저하 | Low | Low | 폰트는 next/font로 최적화 로딩. CSS 변수 수는 현재와 유사하게 유지 |

---

## 5. 의존성

| 의존 대상 | 유형 | 상태 | 비고 |
|----------|------|------|------|
| AXIS Design System 리포 | 외부 | 활성 | 토큰 정의 참조 필요 |
| F74 AXIS DS 토큰 일부 연동 | 선행 작업 | ✅ 완료 | globals.css axis-* 4개 변수 |
| F78 프로덕션 E2E | 병렬 작업 | 진행중 | UI 변경과 독립적 |
| shadcn/ui v4 (Tailwind v4) | 프레임워크 | 적용됨 | CSS-based config 사용 |

---

## 6. 성공 기준

| 기준 | 목표 |
|------|------|
| forge-* 참조 잔존 | **0건** (전수 검색) |
| 다크모드 콘트라스트 | WCAG AA (4.5:1) 충족 |
| 시각적 일관성 | AXIS DS 토큰 기반 색상/폰트/간격 100% 적용 |
| 기존 기능 유지 | E2E 20 specs 전체 통과 |
| 빌드 성공 | typecheck + lint + build 에러 0 |
| PDCA Match Rate | ≥ 90% |

---

## 7. 일정 추정

| 단계 | 소요 | 비고 |
|------|------|------|
| Phase A: 토큰 분석 | 0.5h | AXIS DS 리포 분석 |
| Phase B: globals.css + 유틸리티 | 1h | CSS 변수 전면 교체 |
| Phase C-1: 랜딩 리디자인 | 2h | 706줄, forge-* 60+ 참조 |
| Phase C-2: 대시보드 리디자인 | 2h | 7페이지 + Sidebar |
| Phase C-3: shadcn/ui 확인 | 0.5h | 자동 전환 검증 |
| Phase C-4: 다크모드 + 폰트 | 0.5h | 전체 검증 |
| 검증 | 0.5h | E2E + typecheck + 시각 검증 |
| **합계** | **~7h** | |
