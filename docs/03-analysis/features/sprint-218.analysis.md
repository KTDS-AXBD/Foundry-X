---
code: FX-ANLS-S218
title: "Sprint 218 — 에러/로딩 UX + 반응형+접근성 Gap Analysis"
version: 1.0
status: Active
category: ANLS
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
references: "[[FX-PLAN-S218]], [[FX-DSGN-S218]]"
---

# Sprint 218 Gap Analysis

## 결과 요약

| 항목 | 값 |
|------|----|
| Match Rate | **100%** (D8 Escape 핸들러 수정 후) |
| 총 기준 | 10건 |
| PASS | 10건 |
| FAIL | 0건 |
| 반복 횟수 | 1회 (D8 수동 수정) |

## 기준별 판정

| # | ID | 기준 | 판정 | 근거 |
|---|----|----|:----:|----|
| 1 | D1 | ErrorBoundary throw 시 에러 UI | PASS | `ErrorBoundary.tsx` 에러 UI + 테스트 통과 |
| 2 | D2 | 재시도 버튼 클릭 시 에러 초기화 | PASS | `resetErrorBoundary` 메서드 + 테스트 통과 |
| 3 | D3 | LoadingSkeleton 3종 정상 렌더링 | PASS | item-list/analysis-result/business-plan + 테스트 통과 |
| 4 | D4 | EmptyState 정상 렌더링 | PASS | role="status" + 액션버튼 + 테스트 통과 |
| 5 | D5 | fetchWithRetry 3회 재시도 후 throw | PASS | 4xx 제외 + exponential backoff + 테스트 통과 |
| 6 | D6 | 768px 반응형 CSS 적용 | PASS | globals.css `@media(max-width:768px)` 블록 적용 |
| 7 | D7 | ARIA role/label 필수 속성 존재 | PASS | aria-label + role 적용 + 테스트 통과 |
| 8 | D8 | Escape 키 패널 닫기 | PASS | discovery-detail.tsx useEffect Escape 핸들러 추가 |
| 9 | D9 | 전체 테스트 14건 이상 통과 | PASS | 15건 (10+5) + 전체 366건 PASS |
| 10 | D10 | typecheck: F449/F450 관련 에러 없음 | PASS | 기존 2건은 pre-existing, 신규 에러 없음 |

## 수정 이력

| 라운드 | 수정 내용 | 결과 |
|--------|-----------|------|
| 초기 분석 | Match Rate 90% (D8 FAIL) | WARN |
| 수동 수정 | discovery-detail.tsx Escape 핸들러 + responsive-a11y.test.tsx Escape 테스트 추가 | PASS |
| 최종 | Match Rate 100% | PASS ✅ |

## 구현 파일 목록

### 신규 생성 (8개)
- `packages/web/src/components/feature/discovery/ErrorBoundary.tsx`
- `packages/web/src/components/feature/discovery/LoadingSkeleton.tsx`
- `packages/web/src/components/feature/discovery/EmptyState.tsx`
- `packages/web/src/lib/api-client-retry.ts`
- `packages/web/src/__tests__/error-loading-ux.test.tsx` (10건)
- `packages/web/src/__tests__/responsive-a11y.test.tsx` (6건)
- `docs/01-plan/features/sprint-218.plan.md`
- `docs/02-design/features/sprint-218.design.md`

### 수정 (4개)
- `packages/web/src/routes/ax-bd/discovery.tsx` (ErrorBoundary 래핑)
- `packages/web/src/routes/ax-bd/discovery-detail.tsx` (LoadingSkeleton + Escape 핸들러)
- `packages/web/src/routes/discovery-progress.tsx` (LoadingSkeleton + EmptyState)
- `packages/web/src/app/globals.css` (반응형 CSS 변수)
