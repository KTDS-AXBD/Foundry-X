---
code: FX-RPRT-S139
title: "Sprint 139 — F322 사이드바 구조 재설계 완료 보고서"
version: "1.0"
status: Active
category: RPRT
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 139
f_items: [F322]
plan_ref: "[[FX-PLAN-S139]]"
design_ref: "[[FX-DSGN-S139]]"
analysis_ref: "[[FX-ANLS-S139]]"
---

# FX-RPRT-S139 — 사이드바 구조 재설계 완료 보고서

## Executive Summary

| 항목 | 값 |
|------|-----|
| Feature | F322 사이드바 구조 재설계 |
| Sprint | 139 |
| 기간 | 2026-04-05 (단일 세션) |
| Match Rate | **98%** (39/40 PASS, 1 YELLOW) |
| 수정 파일 | 6개 |
| 신규 라우트 | 11개 |
| 리다이렉트 | 13건 추가 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | Member 메뉴 25개로 탐색 비용 높음. 프로세스 안내/액션 메뉴 혼재. Admin 메뉴 부족 |
| **Solution** | 액션 중심 메뉴 재설계 — 25→12개(52% 축소) + TBD 섹션 접기 + Admin 7메뉴 전용 그룹 |
| **Function UX Effect** | 사이드바 스크롤 감소, 핵심 액션까지 클릭 수 감소, Admin 전용 관리 영역 확보. CMS로 메뉴 편집 가능 |
| **Core Value** | BD 팀원이 "지금 해야 할 일"에 즉시 접근 가능한 액션 중심 IA. Phase 13 전체(F323~F328)의 기반 구조 |

## §1 구현 결과

### 변경 파일 요약

| 파일 | 변경 내용 | Lines |
|------|----------|:-----:|
| `navigation-loader.ts` | collapsed/badge/adminGroups 타입 확장 | +4 |
| `sidebar.json` | v1.3 메뉴 구조 전면 재작성 | 전체 |
| `sidebar.tsx` | DEFAULT 상수, NavGroup, CollapsibleGroup, NavLinks 구조 전면 변경 | ~150 |
| `router.tsx` | 신규 라우트 11개 + 리다이렉트 13건 | +30 |
| `tina/config.ts` | collapsed/badge/adminGroups CMS 스키마 | +35 |
| `redirect-routes.spec.ts` | /discovery redirect 제거 + 신규 테스트 | ~15 |

### 메뉴 구조 변경

| 영역 | Before | After | 변화 |
|------|:------:|:-----:|:----:|
| 상단 (topItems) | 4개 | 2개 | -50% |
| 프로세스 (visible) | 21개 | 10개 | -52% |
| 하단 (bottomItems) | 3개 | 2개 | -33% |
| Admin 관리 | 7개 (혼재) | 7개 (전용 그룹) | 분리 |
| 지식 그룹 | 4개 | 0개 (흡수) | 제거 |
| 외부 서비스 | 2개 | 0개 (흡수) | 제거 |

### 신규 기능

1. **collapsed 그룹**: 수집(1단계)/GTM(6단계) 기본 접힘 + "준비 중이에요" 메시지
2. **TBD 뱃지**: collapsed 그룹에 뱃지 표시
3. **Admin CMS 전���**: adminGroups를 sidebar.json으로 관리 가능 (DEFAULT_ADMIN_GROUP fallback)
4. **Phase 13 라우트**: /discovery, /validation, /product 등 11개 신규 경로
5. **리다이렉트 안전망**: 기존 URL → 새 URL 13건 (기존 라우트 보존과 병행)

## §2 품질 지표

| 지표 | 결과 |
|------|------|
| typecheck | ✅ 0 errors |
| build | ✅ 성공 (615ms) |
| Match Rate | 98% (39/40 PASS) |
| YELLOW | 1건 (router dead code — 전환기 의도적 설계) |
| FAIL | 0건 |

## ��3 후속 작업

| Sprint | F-item | 내용 | 의존성 |
|--------|--------|------|--------|
| TBD | F323 | 대시보드 ToDo + 업무 가이드 | F322 기반 |
| TBD | F324 | 발굴 탭 통합 (3탭+멀티 페르소나) | F322 기반 |
| TBD | F325 | 형상화 버전관리 패턴 | F322 기반 |
| TBD | F326 | 검증 탭 통합 (4탭) | F322 기반 |
| TBD | F327 | 제품화 탭 통합 | F322 기반 |
| TBD | F328 | 시작하기+공통 정리 | F322 기반 |

F323~F328이 완료되면 router.tsx의 기존 lazy 라우트를 삭제하여 Phase 13 redirect가 활성화돼요.

## §4 PDCA 사이클 요약

```
[Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check] ✅ 98% → [Report] ✅
```

Sprint 139 완료.
