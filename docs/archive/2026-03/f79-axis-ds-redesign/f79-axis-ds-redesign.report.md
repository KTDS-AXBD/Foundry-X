---
code: FX-RPRT-020
title: "F79 AXIS Design System 기반 전면 리디자인 — 완료 보고서"
version: 0.1
status: Active
category: RPRT
system-version: 1.4.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
planning-doc: FX-PLAN-019
design-doc: FX-DSGN-019
analysis-doc: FX-ANLS-018
related-req: FX-REQ-079
---

# FX-RPRT-020: F79 AXIS Design System 기반 전면 리디자인 — 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F79 AXIS DS 기반 전면 리디자인 |
| **기간** | Sprint 17 (2026-03-18) |
| **시스템 버전** | v1.4.0 |
| **Match Rate** | **96%** (25개 항목 중 완전 일치 23, 부분 일치 2, 미구현 0) |
| **수정 파일** | 4개 (globals.css, page.tsx, navbar.tsx, footer.tsx) |
| **변경 라인** | 242줄 (삽입 127 + 삭제 115) |

| 관점 | 내용 |
|------|------|
| **Problem** | Digital Forge 테마(forge-* 6개 변수)가 Foundry-X 전용으로 설계되어 AX BD팀 제품 간 시각적 일관성이 부재했어요. forge-* 참조가 4개 파일 83곳에 분산돼 있었어요. |
| **Solution** | AXIS DS 토큰으로 globals.css 전면 교체 + 랜딩 페이지·navbar·footer의 forge→axis 클래스 일괄 교체. shadcn/ui 11개 컴포넌트는 CSS 변수 자동 전환. |
| **Function UX Effect** | 팀 제품(Foundry-X, Discovery-X, AI Foundry) 간 통일된 시각 언어 달성 → 제품 간 이동 시 학습 비용 제로 |
| **Core Value** | AX BD팀 브랜드 일관성 확립 + AXIS Design System 기반 유지보수성 향상 |

---

## 1. PDCA 전주기 요약

### 1.1 Plan (FX-PLAN-019)

- **목적:** Digital Forge 테마(forge-amber/ember/copper/slate/charcoal/cream)를 AXIS Design System 토큰으로 전면 전환
- **배경:** F74 선행 작업으로 globals.css에 axis-* 4개가 부분 적용된 상태였고, Phase 3 진입을 위해 팀 내 UI 통일이 전제 조건이었어요
- **마이그레이션 순서:** Phase A(토큰 기반) → Phase B(글로벌 스타일) → Phase C(페이지 리디자인) 3단계로 계획
- **스코프:** F79-1~F79-8 총 8개 서브태스크, 4개 파일 ~152줄 예상 변경
- **리스크:** UI 회귀(R1), 다크모드 호환성(R2), forge-* 하드코딩 잔존(R5) — 모두 완화됨

### 1.2 Design (FX-DSGN-019)

- **토큰 매핑:** forge-* 6개 → axis-* 12개로 확장 (axis-primary, axis-primary-light, axis-primary-hover, axis-secondary, axis-accent, axis-warm, axis-neutral, axis-surface + 기존 4개 유지)
- **시맨틱 변수:** --primary, --ring, --chart-1~5, --sidebar-primary를 AXIS 팔레트로 재매핑
- **유틸리티 전환:** forge-grid→axis-grid, forge-glass→axis-glass, forge-glow→axis-glow, pulse-ring 색상 교체
- **대시보드 전략:** forge-* 참조 0건 확인 → CSS 변수 자동 전환으로 코드 변경 불필요
- **shadcn/ui 전략:** 11개 컴포넌트 모두 CSS 변수 의존 → 래핑 불필요, 자동 전환

### 1.3 Do (구현 결과)

- **forge-* 잔존:** **0건** (소스 코드 전수 검색 확인)
- **axis-primary 사용처:** **68곳** (globals.css 9 + page.tsx 50 + navbar.tsx 6 + footer.tsx 3)
- **globals.css:** forge-* 6개 변수 완전 제거, axis-* 12개 변수 적용, @theme inline 12개 매핑, 유틸리티 4종 교체
- **page.tsx:** 706줄 중 forge-* 참조 전체 → axis-* 교체 완료
- **navbar.tsx:** forge-* 6곳 → axis-* 교체 완료
- **footer.tsx:** forge-* 3곳 → axis-* 교체 완료
- **다크모드:** .dark 섹션 axis-* 다크 팔레트 8개 적용 완료

### 1.4 Check (FX-ANLS-018)

- **Match Rate:** **96%** (25개 분석 항목)
- **완전 일치:** 23개 (92%)
- **부분 일치:** 2개 — pillars data `color` 필드 (85%, 실질 영향 없음)
- **미구현:** 0개
- **forge-* 잔존:** 0건 (소스 코드 기준)

---

## 2. 산출물 목록

### 2.1 수정 파일

| # | 파일 | 변경 유형 | 변경 라인 |
|---|------|---------|:--------:|
| 1 | `packages/web/src/app/globals.css` | CSS 변수 전면 교체 (forge-* 제거, axis-* 12개 추가, @theme 매핑, 유틸리티 4종 교체) | 112줄 |
| 2 | `packages/web/src/app/(landing)/page.tsx` | forge-* 클래스 56곳+ → axis-* 일괄 교체 (Hero, Stats, Pillars, Ecosystem, Architecture, Roadmap, Quick Start, Final CTA) | 112줄 |
| 3 | `packages/web/src/components/landing/navbar.tsx` | 스크롤 보더, 로고, 링크 호버, CTA 버튼 forge→axis 교체 (6곳) | 12줄 |
| 4 | `packages/web/src/components/landing/footer.tsx` | 로고, 아이콘, 링크 호버 forge→axis 교체 (3곳) | 6줄 |
| **합계** | **4개 파일** | | **242줄** |

### 2.2 변경 불필요 파일 (자동 전환)

| 파일 그룹 | 이유 |
|----------|------|
| `components/sidebar.tsx` | shadcn 시맨틱만 사용, forge-* 0건 |
| `components/ui/*.tsx` (11개) | CSS 변수 의존, globals.css 교체로 자동 전환 |
| `app/(app)/*.tsx` (7페이지) | forge-* 0건, shadcn 시맨틱만 사용 |
| `components/feature/*.tsx` | forge-* 0건 |

### 2.3 PDCA 문서

| 문서 | 코드 | 상태 |
|------|------|:----:|
| Plan | FX-PLAN-019 | ✅ Draft |
| Design | FX-DSGN-019 | ✅ Draft |
| Gap Analysis | FX-ANLS-018 | ✅ Active |
| Report (본 문서) | FX-RPRT-020 | ✅ Active |

---

## 3. forge→axis 전환 통계

### 3.1 제거된 forge 참조

| 항목 | 수량 |
|------|:----:|
| CSS 변수 (forge-amber/ember/copper/slate/charcoal/cream) | 6개 제거 |
| @theme 매핑 (--color-forge-*) | 6개 제거 |
| 유틸리티 클래스 (forge-grid, forge-glass, forge-glow, forge-glow-strong) | 4개 제거 |
| .dark forge-grid | 1개 제거 |
| page.tsx forge-* 클래스 참조 | ~56곳 제거 |
| navbar.tsx forge-* 클래스 참조 | 6곳 제거 |
| footer.tsx forge-* 클래스 참조 | 3곳 제거 |
| pulse-ring 애니메이션 forge-amber oklch 값 | 3곳 제거 |
| **forge-* 잔존 (소스 코드)** | **0건** |

### 3.2 추가된 axis 토큰

| 항목 | 수량 |
|------|:----:|
| :root axis-* CSS 변수 | 12개 (기존 4개 유지 + 신규 8개) |
| .dark axis-* 다크 팔레트 | 8개 (나머지 4개는 라이트와 동일) |
| @theme inline axis-* 매핑 | 12개 |
| 유틸리티 클래스 (axis-grid, axis-glass, axis-glow, axis-glow-strong) | 4개 |
| .dark axis-grid | 1개 |
| .dark axis-glass | 1개 |
| 시맨틱 변수 AXIS 매핑 (--primary, --ring, --chart-1~5, --sidebar-primary) | 8개 |
| **axis-primary 참조 (소스 코드 전체)** | **68곳** |

### 3.3 색상 전환 매핑 요약

| forge-* (제거) | → axis-* (대체) | 사용처 |
|---------------|----------------|--------|
| `forge-amber` | `axis-primary` | 주 브랜드, CTA, 강조, 아이콘 |
| `forge-ember` | `axis-primary-hover` | 호버 상태, 밝은 변형 |
| `forge-copper` | `axis-accent` | 그라데이션 엔드, 보조 강조 |
| `forge-slate` | `axis-neutral` | 중립 텍스트/보조 |
| `forge-charcoal` | `foreground` (시맨틱) | 어두운 텍스트/배경 |
| `forge-cream` | `axis-surface` | 밝은 배경 |
| `forge-grid` | `axis-grid` | 그리드 패턴 배경 |
| `forge-glass` | `axis-glass` | 글래스모피즘 카드 |
| `forge-glow` | `axis-glow` | 글로우 효과 |
| `forge-glow-strong` | `axis-glow-strong` | 강한 글로우 효과 |

---

## 4. Agent Teams 협업 기록

### 4.1 Sprint 17 Agent Teams 구성

| 역할 | 범위 | 성과 |
|------|------|:----:|
| **W1 (F78 Production E2E)** | Playwright 프로덕션 E2E 설정 + 테스트 | 병렬 진행 |
| **W2 (F79 AXIS DS, 본 보고서)** | globals.css 토큰 교체 + 랜딩/navbar/footer 리디자인 + PDCA 문서 4종 | ✅ |
| **Leader** | 스코프 정의, W1/W2 통합 검증, 프로덕션 배포 | 조율 |

### 4.2 W2 작업 요약

- **Phase A:** globals.css forge-* 제거 + axis-* 12개 추가 + @theme 매핑 + 유틸리티 4종 교체
- **Phase B:** page.tsx 56곳+ forge→axis 교체, navbar.tsx 6곳, footer.tsx 3곳 교체
- **Phase C:** 다크모드 팔레트 적용, forge-* 잔존 0건 검증
- **PDCA 문서:** Plan(FX-PLAN-019), Design(FX-DSGN-019), Analysis(FX-ANLS-018), Report(FX-RPRT-020) 4종 작성
- **파일 충돌:** 0건 (W1과 수정 파일 완전 분리)

---

## 5. 성공 기준 달성 여부

| 기준 | 목표 | 실측 | 결과 |
|------|------|------|:----:|
| forge-* 잔존 (소스) | 0건 | 0건 | ✅ |
| axis-* 토큰 정의 (:root) | 12개 | 12개 | ✅ |
| axis-* 다크 팔레트 (.dark) | 8개 | 8개 | ✅ |
| @theme inline axis-* 매핑 | 12개 | 12개 | ✅ |
| 시맨틱 변수 AXIS 매핑 | 8개 | 8개 | ✅ |
| 유틸리티 클래스 전환 | 4종 | 4종 | ✅ |
| 대시보드 자동 전환 | 코드 변경 불필요 | 변경 없음 확인 | ✅ |
| PDCA Match Rate | ≥ 90% | **96%** | ✅ |

---

## 6. 다음 단계 제안

### 6.1 대시보드 리디자인 확장 (Sprint 18+)

현재 대시보드 7개 페이지는 shadcn/ui 시맨틱 변수 자동 전환으로 AXIS 색상이 적용됐어요. 하지만 **AXIS DS 고유 디자인 패턴**(카드 스타일, 타이포그래피, 레이아웃 가이드)을 적극 활용하면 더 높은 수준의 시각적 일관성을 달성할 수 있어요.

- Dashboard: AXIS 차트 팔레트 적용 (chart-1~5 이미 매핑됨)
- Agents 페이지: 상태 배지에 AXIS semantic 색상(success/warning/error) 적용
- Sidebar: AXIS 네비게이션 패턴 도입

### 6.2 AXIS DS 컴포넌트 래핑

현재는 shadcn/ui 기본 컴포넌트를 CSS 변수 교체로 사용하고 있어요. AXIS DS에서 전용 variant나 사이즈 체계가 정의되면:

- `components/axis/` 디렉토리에 래핑 컴포넌트 생성 (예: `axis-button.tsx`, `axis-card.tsx`)
- AXIS DS 토큰 기반 variant 추가 (brand, accent, warm 등)
- shadcn/ui 원본은 유지하면서 AXIS 레이어를 얹는 구조

### 6.3 타이포그래피 고도화

F79에서 색상 토큰 전환은 완료했지만, 타이포그래피(font-size 스케일, line-height, letter-spacing)는 AXIS DS 기준으로 추가 정밀 조정이 필요해요.

### 6.4 시각 QA 자동화

- Playwright + 스크린샷 비교 도구(예: pixelmatch)로 라이트/다크 모드 시각 회귀 자동 감지
- WCAG AA 콘트라스트 비율 자동 체크 통합

---

## 7. 결론

F79 AXIS Design System 리디자인은 **Match Rate 96%**로 성공적으로 완료됐어요.

**핵심 성과:**
- forge-* CSS 변수 6개 **완전 제거**, axis-* 토큰 12개 **전면 적용**
- 랜딩 페이지(706줄) 전체 forge→axis 색상 전환 완료
- navbar/footer forge 참조 **0건** 달성
- 시맨틱 변수 AXIS 매핑으로 대시보드 + shadcn 11개 컴포넌트 **자동 전환**
- 다크모드 .dark 섹션 **완전 갱신**
- 소스 코드 forge-* 잔존 **0건**

Digital Forge → AXIS Design System 전환으로 AX BD팀 4개 제품(Foundry-X, Discovery-X, AI Foundry, AXIS DS) 간 통일된 시각 언어의 기반이 마련됐어요.
