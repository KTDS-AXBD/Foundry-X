---
code: FX-ANLS-S138
title: "Sprint 138 — F321 TinaCMS 네비게이션 동적 관리 Gap Analysis"
version: "1.0"
status: Active
category: ANLS
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 138
f_items: [F321]
match_rate: 100
---

# FX-ANLS-S138 — TinaCMS 네비게이션 동적 관리 Gap Analysis

## Match Rate: 100% (10/10 PASS)

| # | Design 체크리스트 | 상태 | 검증 방법 |
|---|-------------------|------|-----------|
| 1 | tina/config.ts — navigation collection 추가 | PASS | navigation JSON collection, 3개 중첩 object 필드 |
| 2 | tina/config.ts — landing sort_order 추가 | PASS | `{ type: "number", name: "sort_order" }` |
| 3 | content/navigation/sidebar.json 초기 데이터 | PASS | 4 topItems + 6 processGroups + 3 bottomItems |
| 4 | sidebar.tsx — CMS 동적 렌더링 | PASS | loadSidebarConfig() → filter/sort/map |
| 5 | sidebar.tsx — fallback | PASS | DEFAULT_TOP_ITEMS, DEFAULT_PROCESS_GROUPS, DEFAULT_MEMBER_BOTTOM_ITEMS |
| 6 | landing.tsx — sort_order 정렬 | PASS | getSectionOrder() + landingSections.sort() |
| 7 | /admin Navigation UI | PASS | tina/config.ts collection 등록 → 자동 |
| 8 | typecheck 0건 | PASS | pnpm typecheck 통과 |
| 9 | build 성공 | PASS | 557ms 정상 빌드 |
| 10 | 기존 테스트 회귀 0건 | PASS | 48 파일 330 tests 통과 |

## 변경 파일 요약

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `tina/config.ts` | 수정 | navigation collection + landing sort_order |
| `content/navigation/sidebar.json` | 신규 | 사이드바 메뉴 CMS 데이터 |
| `content/landing/features.md` | 신규 | Features 섹션 sort_order |
| `content/landing/stats.md` | 신규 | Stats 섹션 sort_order |
| `content/landing/cta.md` | 신규 | CTA 섹션 sort_order |
| `content/landing/hero.md` | 수정 | sort_order 추가 |
| `src/lib/navigation-loader.ts` | 신규 | CMS JSON 로더 + 아이콘 매핑 |
| `src/components/sidebar.tsx` | 수정 | CMS 동적 로딩 + 하드코딩 fallback |
| `src/routes/landing.tsx` | 수정 | 섹션 컴포넌트 추출 + sort_order 정렬 |
