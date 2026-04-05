---
code: FX-PLAN-S143
title: "Sprint 143 — F327 제품화 탭 통합 + F328 시작하기 통합"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 143
f_items: [F327, F328]
---

# FX-PLAN-S143 — 제품화 탭 통합 + 시작하기 통합

## Executive Summary

| 항목 | 값 |
|------|-----|
| Feature | F327 제품화 탭 + F328 시작하기 통합 |
| Sprint | 143 |
| 우선순위 | P3 (둘 다) |
| 예상 소요 | ~6h |
| 변경 패키지 | web (routes + components) |
| 선행 | F322 ✅ |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | 제품화 MVP/PoC가 별도 메뉴로 분산. 시작하기에 온보딩만 있고 도구/데모 가이드 접근 어려움 |
| **Solution** | 제품화 2탭(MVP/PoC) 통합 + Offering Pack 독립. 시작하기 5영역 허브 페이지 |
| **Function UX Effect** | 제품화 메뉴 2→2 유지 but 탭 전환으로 맥락 유지. 시작하기가 원스톱 온보딩 허브 |
| **Core Value** | Phase 13 IA v1.3 완결 — 7/7 F-items |

## §1 F327: 제품화 탭 통합 + Offering Pack

### 탭 구성 (F324/F326 패턴)
1. **MVP** (기본 랜딩) — 기존 mvp-tracking.tsx
2. **PoC** — 기존 product-poc.tsx

### Offering Pack
- /product/offering-pack — 기존 offering-packs.tsx 재활용 (F322에서 라우트 완료)
- VersionBadge 추가 (F325 패턴)

## §2 F328: 시작하기 통합

### 5영역 통합
기존 getting-started.tsx(668L)를 확장하여 5영역 허브로:
1. **온보딩** — 기존 온보딩 콘텐츠 (이미 구현)
2. **BD 스킬 가이드** — 스킬 카탈로그 요약 + /wiki 링크
3. **Cowork/CC 사용법** — Claude Code + Foundry-X 협업 가이드
4. **데모 시나리오** — 기존 /ax-bd/demo 콘텐츠 인라인 임포트
5. **도구 가이드** — 기존 /tools-guide 콘텐츠 인라인 임포트

### 구현 방식
- getting-started.tsx에 탭 또는 섹션 카드 추가
- 기존 온보딩 콘텐츠 유지 + 하단에 4개 추가 섹션
- /ax-bd/demo → /getting-started 리다이렉트 이미 완료 (F322)
- /tools-guide → /getting-started 리다이렉트 이미 완료 (F322)

## §3 구현 순서

| 단계 | F# | 파일 | 작업 |
|:----:|:--:|------|------|
| 1 | F327 | `src/routes/product-unified.tsx` | 신규 — 2탭 래퍼 |
| 2 | F327 | `src/router.tsx` | /product → product-unified |
| 3 | F327 | `offering-packs.tsx` | VersionBadge 추가 |
| 4 | F328 | `src/routes/getting-started.tsx` | 5영역 허브 확장 |
| 5 | 공통 | typecheck + build | 검증 |
