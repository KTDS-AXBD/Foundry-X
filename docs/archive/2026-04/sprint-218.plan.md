---
code: FX-PLAN-S218
title: "Sprint 218 — 운영 품질: 에러/로딩 UX + 반응형+접근성"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-SPEC-PRD-DISC-V2]]"
---

# Sprint 218: 운영 품질 — 에러/로딩 UX + 반응형+접근성

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F449 에러/로딩 UX + F450 반응형+접근성 |
| Sprint | 218 |
| Phase | Phase 25-D (Discovery Pipeline v2 마무리) |
| 우선순위 | P1 |
| 의존성 | Sprint 213~217 (F441~F448) 구현 완료 |
| PRD | docs/specs/fx-discovery-pipeline-v2/prd-final.md §3 Phase 25-D |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Discovery 페이지에서 API 실패/로딩 중 빈 화면 노출 + 모바일 미대응으로 실무 사용 어려움 |
| Solution | 공통 ErrorBoundary+LoadingSkeleton+EmptyState 컴포넌트 + 재시도 로직 + 반응형 CSS + ARIA |
| Function UX Effect | API 오류 시 재시도 가이드 → 이탈 감소 / 모바일 지원 → 팀원 현장 접근성 향상 |
| Core Value | Discovery Pipeline v2 완결 — 실무 수준 안정성 확보 |

## 범위

### F449: 에러/로딩 UX (FX-REQ-441)

| # | 컴포넌트/파일 | 작업 |
|---|------------|------|
| 1 | `components/feature/discovery/ErrorBoundary.tsx` | React ErrorBoundary: 에러 메시지 + 재시도 버튼 + 상세 접기 |
| 2 | `components/feature/discovery/LoadingSkeleton.tsx` | 페이지별 스켈레톤 (ItemList / AnalysisResult / BusinessPlan) |
| 3 | `components/feature/discovery/EmptyState.tsx` | 빈 상태 안내 + 시작 가이드 링크 |
| 4 | `lib/api-client-retry.ts` | fetchWithRetry: exponential backoff 3회 재시도 |
| 5 | Discovery 라우트 3종 연결 | discovery.tsx / discovery-detail.tsx / discovery-progress.tsx |
| 6 | 단위 테스트 | `__tests__/error-loading-ux.test.tsx` |

### F450: 반응형+접근성 (FX-REQ-442)

| # | 파일 | 작업 |
|---|------|------|
| 1 | `app/globals.css` | CSS 변수 미디어쿼리 (768px, 1024px) |
| 2 | Discovery 라우트 3종 | 반응형 CSS 클래스 적용 |
| 3 | Discovery 컴포넌트 | ARIA 라벨: aria-label, aria-describedby, role |
| 4 | 키보드 내비게이션 | Tab 순서 + Enter/Space 활성화 + Escape 닫기 |
| 5 | 색상 대비 | WCAG 2.1 AA 준수 확인 + 조정 |
| 6 | 단위 테스트 | `__tests__/responsive-a11y.test.tsx` |

## 주요 파일 목록

### 신규 생성
```
packages/web/src/
  components/feature/discovery/
    ErrorBoundary.tsx          # F449
    LoadingSkeleton.tsx        # F449
    EmptyState.tsx             # F449
  lib/
    api-client-retry.ts        # F449 재시도 로직
  __tests__/
    error-loading-ux.test.tsx  # F449 테스트
    responsive-a11y.test.tsx   # F450 테스트
```

### 수정 대상
```
packages/web/src/
  app/globals.css                        # F450 반응형 변수
  routes/ax-bd/discovery.tsx             # F449 ErrorBoundary + F450 반응형
  routes/ax-bd/discovery-detail.tsx      # F449 LoadingSkeleton + F450 ARIA
  routes/discovery-progress.tsx          # F449 EmptyState + F450 반응형
```

## 구현 전략

### F449 재시도 로직 설계
```
fetchWithRetry(url, options, maxRetries=3):
  1회 실패 → 1초 후 재시도
  2회 실패 → 2초 후 재시도
  3회 실패 → 에러 throw → ErrorBoundary 포착
```

### F450 반응형 Breakpoint
```css
/* 모바일: < 768px — 단일 컬럼 */
/* 태블릿: 768px~1024px — 2컬럼 */
/* 데스크탑: > 1024px — 현재 레이아웃 유지 */
```

## 사전 조건

- [x] Sprint 217 (F447+F448 파이프라인 추적+자동전환) merge 완료
- [x] Discovery 라우트 3종 존재 확인 (`discovery.tsx`, `discovery-detail.tsx`, `discovery-progress.tsx`)
- [x] `@axis-ds/ui-react` Skeleton 컴포넌트 이미 re-export 중

## 성공 기준

- [ ] ErrorBoundary: API 500 응답 시 에러 메시지 + 재시도 버튼 표시
- [ ] LoadingSkeleton: 로딩 중 스켈레톤 UI 표시 (3종 페이지)
- [ ] EmptyState: 데이터 없음 시 시작 가이드 표시
- [ ] fetchWithRetry: 네트워크 에러 3회 재시도 후 ErrorBoundary 전달
- [ ] 768px 모바일: Discovery 목록/상세 레이아웃 깨지지 않음
- [ ] ARIA: 버튼/폼 필드 aria-label 필수 적용
- [ ] 키보드 Tab 탐색: 모든 인터랙티브 요소 도달 가능
- [ ] 단위 테스트 6건 이상 통과
- [ ] Gap Analysis ≥ 90%

## 예상 소요

| 단계 | 시간 |
|------|------|
| Plan | 10분 |
| Design | 15분 |
| Implement (병렬 2 Worker) | 20~30분 |
| Analyze | 5분 |
| Report | 5분 |
| **합계** | **~55분** |
