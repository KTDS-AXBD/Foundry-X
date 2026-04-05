---
code: FX-ANLS-S145
title: Sprint 145 Blueprint 랜딩 페이지 Gap Analysis
version: 1.0
status: Active
category: ANLS
created: 2026-04-05
updated: 2026-04-05
author: Claude (gap-detector)
feature: sprint-145
design: "[[FX-DSGN-015]]"
---

## Executive Summary

| 항목 | 값 |
|------|-----|
| Feature | F329 Blueprint 랜딩 페이지 전면 전환 |
| Sprint | 145 |
| Match Rate | **97% (35/36 PASS)** |
| 변경 파일 | 3개 (landing.tsx, navbar.tsx, footer.tsx) |
| typecheck | ✅ 통과 |
| Unit Tests | ✅ 330 pass (48 files) |

## Match Rate

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 97% | PASS |
| Architecture Compliance | 100% | PASS |
| Convention Compliance | 100% | PASS |
| **Overall** | **97%** | **PASS** |

## FAIL 항목 (1건)

| # | Design 명세 | 실제 구현 | 영향도 | 사유 |
|---|------------|----------|:------:|------|
| H4 | Hero subheading `bp-line/70` (opacity modifier) | `text-muted-foreground` | Low | 테마 일관성 면에서 구현이 더 나은 선택 — muted-foreground는 다크/라이트 모드 자동 대응 |

> 구현이 Design보다 나은 경우로, Design 역동기화 권장.

## PASS 항목 상세 (35건)

### Hero 섹션 (7 PASS)

| # | 검증 항목 | 결과 |
|---|----------|:----:|
| H1 | 2-column `lg:grid-cols-12` (7:5) 레이아웃 | ✅ |
| H2 | Phase badge `bp-annotation` + border | ✅ |
| H3 | h1 `bp-line font-display text-5xl~7xl` 대형 타이포 | ✅ |
| H5 | CTA 버튼 `bp-box` 스타일 | ✅ |
| H6 | Stats 우측 통합 (별도 섹션 삭제) | ✅ |
| H7 | 반응형 (lg: 그리드, <lg: 1컬럼) | ✅ |

### Process Flow (6 PASS)

| # | 검증 항목 | 결과 |
|---|----------|:----:|
| P1 | `bp-diamond` 다이아몬드 노드 | ✅ |
| P2 | `bp-box` 프로세스 박스 | ✅ |
| P3 | `→` 화살표 (bp-line) | ✅ |
| P4 | 호버 시 설명 tooltip | ✅ |
| P5 | 모바일 세로 구분선 | ✅ |
| P6 | 모바일 설명 항상 표시 | ✅ |

### Pillars (4 PASS)

| # | 검증 항목 | 결과 |
|---|----------|:----:|
| F1 | 3-col grid `md:grid-cols-3` | ✅ |
| F2 | `bp-box p-6` 카드 | ✅ |
| F3 | `bp-annotation uppercase` 라벨 | ✅ |
| F4 | `border-current/10` divider | ✅ |

### Agent Grid (3 PASS)

| # | 검증 항목 | 결과 |
|---|----------|:----:|
| A1 | 좌측 핀 마커 (absolute circle) | ✅ |
| A2 | `bp-box group` 회로도 카드 | ✅ |
| A3 | `bp-line` + `bp-annotation` 텍스트 | ✅ |

### Architecture (4 PASS)

| # | 검증 항목 | 결과 |
|---|----------|:----:|
| AR1 | `bp-bg` wrapper | ✅ |
| AR2 | 4-layer `bp-box` 계층 | ✅ |
| AR3 | `font-mono text-[11px]` 아이템 뱃지 | ✅ |
| AR4 | `↓` 세로 화살표 | ✅ |

### Ecosystem (4 PASS)

| # | 검증 항목 | 결과 |
|---|----------|:----:|
| E1 | `rounded-full` 중앙 노드 | ✅ |
| E2 | `bp-annotation` 라벨 | ✅ |
| E3 | `w-px bg-current/20` 연결선 | ✅ |
| E4 | 3-col 위성 그리드 | ✅ |

### Roadmap (4 PASS)

| # | 검증 항목 | 결과 |
|---|----------|:----:|
| R1 | Phase 라벨 `w-28` 좌측 | ✅ |
| R2 | Gantt `bp-box` 수평 바 | ✅ |
| R3 | `✓ DONE` bp-annotation | ✅ |
| R4 | 모바일 세로 스택 | ✅ |

### CTA + Navbar + Footer (5 PASS)

| # | 검증 항목 | 결과 |
|---|----------|:----:|
| C1 | CTA `bp-box` 버튼 | ✅ |
| N1 | Navbar 스크롤 `bp-bg backdrop-blur-sm` | ✅ |
| N2 | 로고 `bp-box rounded-lg` | ✅ |
| FT1 | Footer `border-current/20` | ✅ |
| FT2 | Footer `hover:bp-line` 링크 | ✅ |

### Structural (2 PASS)

| # | 검증 항목 | 결과 |
|---|----------|:----:|
| S1 | Component() `bp-bg` (grain-overlay 제거) | ✅ |
| S2 | SectionHeader 공통 패턴 추출 | ✅ |

## V1~V10 검증 결과

| V# | 항목 | 결과 |
|:--:|------|:----:|
| V1 | Hero 2컬럼 레이아웃 | ✅ PASS |
| V2 | Process 플로우차트 | ✅ PASS |
| V3 | Architecture 다이어그램 | ✅ PASS |
| V4 | Roadmap Gantt 바 | ✅ PASS |
| V5 | 다크 모드 bp-* | ✅ PASS |
| V6 | 모바일 반응형 | ✅ PASS |
| V7 | typecheck 통과 | ✅ PASS |
| V8 | 기존 테스트 통과 | ✅ PASS (330 tests) |
| V9 | TinaCMS 연동 | ✅ PASS |
| V10 | 설계도 그리드 배경 | ✅ PASS |

## UX 개선 추가 (Design에 없는 긍정적 구현)

| 항목 | 위치 | 설명 |
|------|------|------|
| `● NOW` marker | RoadmapTimeline | current 상태 표시 |
| CTA arrow icons | HeroSection, CtaSection | ArrowRight + ArrowUpRight |
| GitBranch icon | HeroSection | GitHub 링크 아이콘 |
| 모바일 process desc | ProcessFlow | 모바일에서 설명 항상 표시 |
| flex-wrap Gantt | RoadmapTimeline | 좁은 뷰포트 줄바꿈 |
