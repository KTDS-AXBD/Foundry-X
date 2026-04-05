---
code: FX-PLAN-015
title: Blueprint 랜딩 페이지 비주얼 전환
version: 1.0
status: Active
category: PLAN
created: 2026-04-05
updated: 2026-04-05
author: Sinclair Seo
feature: landing-blueprint
---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 랜딩 페이지가 Sprint 71 이후 시각적 업데이트 없이 70+ Sprint 진행 — 제네릭 SaaS 템플릿 느낌으로 Foundry-X의 엔지니어링 플랫폼 정체성을 반영하지 못함 |
| **Solution** | Blueprint(설계도) 디자인 메타포로 전면 전환 — 플로우차트, 시스템 다이어그램, 그리드 배경, 측정 주석 스타일로 "Git이 진실, Foundry-X는 렌즈" 철학을 시각화 |
| **Function UX Effect** | 방문자가 첫 화면에서 엔지니어링 도구로서의 전문성을 즉시 인지 — BDP 7단계 프로세스를 플로우차트로, 아키텍처를 시스템 다이어그램으로 직관 이해 |
| **Core Value** | 프로젝트 규모(137 Sprint, Phase 12)에 걸맞은 시각적 신뢰감 + 차별화된 브랜드 경험 |

## 1. 배경 및 목표

### 1.1 배경
- 현재 랜딩 페이지: Sprint 66(F205)에서 제작, 이후 데이터만 갱신 (세션 #198에서 최신화 완료)
- 디자인: axis-primary(파란색) 기반 글래스모피즘 + 그레인 텍스처 — 제네릭 SaaS 템플릿 스타일
- 세션 #198에서 /design-shotgun으로 3개 디자인 방향 탐색: Forge / Signal / **Blueprint(C) 승인**
- Blueprint CSS 기반 클래스(bp-bg, bp-box, bp-line, bp-diamond 등) 이미 globals.css에 추가됨

### 1.2 목표
- landing.tsx 컴포넌트를 Blueprint 설계도 디자인으로 전면 전환
- 기존 데이터 구조(stats, pillars, agents, architecture, roadmap)와 TinaCMS 콘텐츠 연동 유지
- 다크 모드 지원 (기존 axis-* 토큰 + bp-* 토큰 결합)
- 모바일 반응형 유지

### 1.3 범위
- **In Scope**: landing.tsx 리디자인 (7개 섹션 전체), navbar.tsx/footer.tsx 미세 조정
- **Out of Scope**: 대시보드 UI, API 변경, 새 라우트/페이지, 컴포넌트 라이브러리 재설계

## 2. 디자인 스펙

### 2.1 승인된 디자인 방향: Blueprint (Variant C)
- **레퍼런스**: `~/.gstack/projects/KTDS-AXBD-Foundry-X/designs/landing-redesign-20260405/variant-C.png`
- **승인 기록**: `approved.json` (2026-04-05T02:50:08Z, screen: landing-full)

### 2.2 핵심 비주얼 요소

| 요소 | 현재 | Blueprint 전환 |
|------|------|---------------|
| 배경 | grain-overlay (노이즈 텍스처) | `bp-bg` (설계도 그리드 라인) |
| 카드 | axis-glass (글래스모피즘) | `bp-box` (설계도 박스, 실선 테두리) |
| 색상 | axis-primary 단색 | 딥 블루 라인 + 레드 주석 + 라이트 블루 배경 |
| Hero | 그래디언트 텍스트 + 작은 아이콘 | 대형 볼드 타이포 + 우측 수치 측정 주석 |
| Process | 7개 둥근 카드 그리드 | 플로우차트 (다이아몬드 + 프로세스 박스 + 화살표) |
| Architecture | 스택 레이어 + 뱃지 | 시스템 다이어그램 (박스 + 화살표 연결) |
| Roadmap | 6열 카드 그리드 | Gantt 차트 스타일 바 차트 |
| Agents | 3×2 둥근 카드 | 회로도 스타일 컴포넌트 블록 |
| Ecosystem | 위성 노드 + pulse | 연결 다이어그램 (원 + 실선) |

### 2.3 타이포그래피

| 용도 | 현재 | Blueprint |
|------|------|-----------|
| 헤드라인 | font-display (Syne) + 그래디언트 | font-display 볼드 + bp-line 단색 |
| 라벨 | font-mono 10px | `bp-annotation` (모노, 0.65rem, 레드 계열) |
| 본문 | font-sans 13px | font-sans 14px |

### 2.4 CSS 클래스 (이미 구현됨)
- `bp-bg`: 설계도 그리드 배경 (라이트/다크)
- `bp-box`: 설계도 박스 (실선 테두리 + 반투명 배경)
- `bp-line`: 딥 블루 텍스트 색상
- `bp-annotation`: 레드 주석 (모노스페이스, 작은 폰트)
- `bp-diamond`: 45도 회전 다이아몬드 (플로우차트 의사결정 노드)
- `bp-arrow-right`: 우측 화살표 마커 (→)
- `bp-connector`: 연결선 기본 클래스

## 3. 구현 계획

### 3.1 섹션별 구현 항목

| # | 섹션 | 작업 | 예상 난이도 |
|---|------|------|:----------:|
| 1 | Hero | 레이아웃 변경: 좌측 대형 타이포 + 우측 수치 측정 주석 | 중 |
| 2 | Stats Bar | 수치를 측정 주석 스타일로 (단위 라벨 + 구분선) | 하 |
| 3 | Process Flow | 7단계 플로우차트 (bp-diamond + bp-box + bp-arrow-right) | 상 |
| 4 | Pillars | bp-box 3열 카드 + bp-annotation 라벨 | 하 |
| 5 | Agent Grid | 회로도 스타일 블록 (핀 연결 + 상태 LED) | 중 |
| 6 | Architecture | 시스템 다이어그램 (박스 + 화살표, CSS Grid) | 중 |
| 7 | Ecosystem | 연결 다이어그램 (원형 노드 + 실선) | 중 |
| 8 | Roadmap | Gantt 바 차트 (수평 바 + Phase 라벨) | 중 |
| 9 | CTA | bp-box 스타일 CTA 버튼 + 설계도 테두리 | 하 |
| 10 | Navbar/Footer | 미세 조정 (bp-line 색상 적용) | 하 |

### 3.2 구현 순서
1. **Hero + Stats** (핵심 첫인상) → 2. **Process Flow** (가장 복잡) → 3. **나머지 섹션** (병렬 가능)

### 3.3 유지 사항
- TinaCMS 콘텐츠 연동 (hero.md, features.md 등)
- SITE_META_FALLBACK / STATS_FALLBACK 데이터 구조
- React Router Link, lucide-react 아이콘
- 기존 애니메이션 (fade-in-up, stagger) 유지 가능 — Blueprint 톤에 맞게 조절

## 4. 검증 기준

| # | 기준 | 방법 |
|---|------|------|
| 1 | 모든 7개 섹션이 Blueprint 스타일로 전환 | 시각적 확인 |
| 2 | 다크 모드에서 bp-* 클래스 정상 동작 | 테마 토글 |
| 3 | 모바일 375px ~ 데스크톱 1440px 반응형 | 브라우저 리사이즈 |
| 4 | TinaCMS 콘텐츠(hero.md) 정상 렌더링 | hero.md 수정 후 확인 |
| 5 | typecheck 통과 | `turbo typecheck --filter=@foundry-x/web` |
| 6 | E2E 테스트 통과 (기존) | `pnpm e2e` |
| 7 | Lighthouse 성능 85+ 유지 | 로컬 감사 |

## 5. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 600줄+ 전면 리라이트 → 기존 기능 회귀 | 높음 | E2E 테스트 + typecheck로 회귀 방지 |
| 다크 모드 Blueprint 가독성 | 중간 | bp-* CSS에 다크 변형 이미 구현, 실제 테스트 필요 |
| 플로우차트 모바일 레이아웃 | 중간 | 모바일에서 세로 스택으로 전환 |
| TinaCMS sort_order 의존성 | 낮음 | 섹션 순서 CMS 연동은 유지 |

## 6. Sprint 배정

- **Sprint 139**: F-item 1건 (landing-blueprint 전면 전환)
- **예상 소요**: autopilot 기준 20~30분
- **의존성**: 없음 (독립 트랙)
