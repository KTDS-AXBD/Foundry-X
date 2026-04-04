---
code: FX-ANLS-S131
title: "Sprint 131 — F311 TinaCMS 인라인 에디팅 본구현 Gap Analysis"
version: "1.0"
status: Active
category: ANLS
created: 2026-04-04
updated: 2026-04-04
author: Claude Opus 4.6
sprint: 131
f_items: [F311]
---

# FX-ANLS-S131 — Sprint 131 Gap Analysis

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F311 TinaCMS 인라인 에디팅 본구현 |
| Sprint | 131 |
| Match Rate | **100%** (10/10 PASS) |
| 검증 일시 | 2026-04-04 |

## 검증 결과

| # | 항목 | Design 기준 | 구현 상태 | 결과 |
|---|------|------------|----------|:----:|
| G1 | tina/config.ts | landing+wiki 2 collections | ✅ 2 collections 정의 | PASS |
| G2 | content/landing/hero.md | TinaCMS UI 편집 가능 콘텐츠 | ✅ frontmatter + body 존재 | PASS |
| G3 | content/wiki/intro.md | TinaCMS UI 편집 가능 콘텐츠 | ✅ frontmatter + body 존재 | PASS |
| G4 | content/sample/ | PoC 파일 삭제 | ✅ 삭제됨 | PASS |
| G5 | landing.tsx fallback | TinaCMS 미기동 시 기존 렌더링 유지 | ✅ SITE_META_FALLBACK + null-coalescing | PASS |
| G6 | _redirects | /admin 규칙 /* 보다 앞에 | ✅ /admin 2규칙이 최상단 | PASS |
| G7 | deploy.yml | VITE_TINA_CLIENT_ID env | ✅ secrets 참조 추가 | PASS |
| G8 | typecheck | 에러 0건 | ✅ tsc --noEmit 통과 | PASS |
| G9 | build | 성공 | ✅ Vite 빌드 704ms, landing 26.58kB | PASS |
| G10 | E2E | 전체 통과 (회귀 0건) | ✅ 170 passed / 4 failed(기존) / 5 skipped | PASS |

## 추가 검증

- **번들 영향**: landing chunk 26.58kB — TinaCMS 런타임이 메인 번들에 포함되지 않음 (admin은 별도 static)
- **Vite ?raw import**: hero.md가 빌드타임에 문자열로 인라인됨 — 런타임 fetch 없음
- **E2E 비교**: baseline 169 passed → 170 passed (회귀 0, 개선 +1)

## 수동 작업 (Sprint 후)

| # | 작업 | 설명 |
|---|------|------|
| 1 | TinaCloud 가입 | tina.io — ktds.axbd@gmail.com (Free Plan) |
| 2 | GitHub App 설치 | KTDS-AXBD/Foundry-X 권한 부여 |
| 3 | GitHub Secrets 등록 | VITE_TINA_CLIENT_ID, TINA_TOKEN |
| 4 | Editor 초대 | 비개발자 이메일 → Editor 권한 |
