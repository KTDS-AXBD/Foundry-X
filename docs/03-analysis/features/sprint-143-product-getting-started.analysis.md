---
code: FX-ANLS-S143
title: "Sprint 143 — F327 제품화 탭 + F328 시작하기 통합 Gap Analysis"
version: "1.0"
status: Active
category: ANLS
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 143
f_items: [F327, F328]
design_ref: "[[FX-DSGN-S143]]"
---

# FX-ANLS-S143 — Gap Analysis

## Executive Summary

| 항목 | 값 |
|------|-----|
| Feature | F327 제품화 탭 + F328 시작하기 통합 |
| Sprint | 143 |
| Match Rate | **100%** (9/9 PASS) |
| 변경 파일 | 3개 (1 신규 + 2 수정) |
| 변경 라인 | ~70L |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | 제품화 MVP/PoC 분산, 시작하기에 온보딩만 존재 |
| **Solution** | 제품화 2탭 통합 + 시작하기 5영역 허브 |
| **Function UX Effect** | 탭 전환으로 맥락 유지, 원스톱 온보딩 허브 |
| **Core Value** | Phase 13 IA v1.3 완결 — 7/7 F-items |

## 검증 매트릭스

| # | 검증 항목 | 기준 | 결과 | 비고 |
|:-:|----------|------|:----:|------|
| V1 | 제품화 2탭 | MVP/PoC 탭 전환 | PASS | TabsTrigger 2개 |
| V2 | URL 탭 연동 | /product?tab=poc | PASS | searchParams |
| V3 | MVP 기본 랜딩 | /product → MVP | PASS | ?? "mvp" fallback |
| V4 | VersionBadge | 뱃지 표시 | PASS | F325에서 이미 적용 |
| V5 | 시작하기 5영역 | 온보딩 + 4 HubCard | PASS | featureCards 4개 |
| V6 | HubCard 네비게이션 | 올바른 경로 | PASS | wiki, tab=setup, demo, tab=skills |
| V7 | 기존 리다이렉트 | /product/mvp → /product | PASS | router.tsx L141~142 |
| V8 | typecheck | 0 errors | PASS | tsc --noEmit |
| V9 | build | 성공 | PASS | vite build 483ms |

## 변경 파일 목록

| 파일 | 동작 | F# |
|------|------|----|
| `src/routes/product-unified.tsx` | 신규 (50L) | F327 |
| `src/router.tsx` | 수정 (1L) | F327 |
| `src/routes/getting-started.tsx` | 수정 (~15L) | F328 |

## 설계 일치성

- **F327**: Design §3 파일1~2 완전 일치. 파일3(offering-packs VersionBadge)은 이미 F325에서 적용되어 추가 변경 불필요
- **F328**: Design §3 파일4 — HubCard 4개 추가. 리다이렉트 루프 방지를 위해 데모→/ax-bd/demo(실제 라우트 우선), 도구→?tab=skills(내부 탭)로 처리
