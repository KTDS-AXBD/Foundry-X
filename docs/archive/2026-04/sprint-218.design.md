---
code: FX-DSGN-S218
title: "Sprint 218 — 운영 품질: 에러/로딩 UX + 반응형+접근성 설계"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-S218]], [[FX-SPEC-PRD-DISC-V2]]"
---

# Sprint 218: 에러/로딩 UX + 반응형+접근성 설계

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F449 에러/로딩 UX + F450 반응형+접근성 |
| Sprint | 218 |
| 핵심 전략 | 공통 컴포넌트 레이어 구축 — 3개 Discovery 라우트에 일괄 적용 |
| 참조 Plan | [[FX-PLAN-S218]] |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | API 실패/로딩 중 빈 화면 노출 + 모바일 레이아웃 깨짐 |
| Solution | ErrorBoundary+LoadingSkeleton+EmptyState + fetchWithRetry + 반응형 CSS + ARIA |
| Function UX Effect | 에러 시 재시도 가이드 제공 / 768px 모바일 정상 렌더링 / 키보드 탐색 가능 |
| Core Value | Discovery Pipeline v2 완결 — Phase 25-D 마지막 마일스톤 |

---

## 1. F449: 에러/로딩 UX 설계

### 1.1 컴포넌트 구조

```
packages/web/src/components/feature/discovery/
  ErrorBoundary.tsx      # React class component (ErrorBoundary는 class 필수)
  LoadingSkeleton.tsx    # 함수형: variant prop으로 3종 분기
  EmptyState.tsx         # 함수형: title/description/actionLabel/onAction prop
packages/web/src/lib/
  api-client-retry.ts    # fetchWithRetry (api-client.ts와 별도 레이어)
```

### 1.2 ErrorBoundary 설계

```typescript
// ErrorBoundary.tsx
interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;     // 커스텀 fallback (선택)
  onReset?: () => void;           // 재시도 시 외부 state 초기화
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetail: boolean;
}

// 렌더링 (hasError=true 시):
// ┌────────────────────────────────┐
// │ ⚠️  데이터를 불러오지 못했어요    │
// │ [재시도]  [상세 접기 ▼]          │
// │ (showDetail=true 시) error.msg  │
// └────────────────────────────────┘
```

**구현 포인트**:
- `componentDidCatch`: 에러 state 저장
- `resetErrorBoundary`: `setState({ hasError: false, error: null })` + `onReset?.()`
- `showDetail` 토글: 에러 메시지 노출 (개발 디버깅용)

### 1.3 LoadingSkeleton 설계

```typescript
type SkeletonVariant = "item-list" | "analysis-result" | "business-plan";

interface LoadingSkeletonProps {
  variant: SkeletonVariant;
  count?: number;   // item-list 반복 수 (기본 3)
}
```

| variant | 렌더링 |
|---------|--------|
| `item-list` | 카드 3개 (제목 줄 + 배지 + 날짜 줄) |
| `analysis-result` | 헤더 + 탭 3개 + 콘텐츠 블록 |
| `business-plan` | 목차 사이드바 + 섹션 콘텐츠 블록 |

기존 `@axis-ds/ui-react`의 `Skeleton` 컴포넌트를 **조합**하여 구현.

### 1.4 EmptyState 설계

```typescript
interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;      // 시작 가이드 링크 또는 라우팅
  icon?: React.ReactNode;     // 선택적 아이콘
}
// 기본 아이콘: lucide-react의 Inbox
```

### 1.5 fetchWithRetry 설계

```typescript
// lib/api-client-retry.ts
// 기존 api-client.ts의 requestWithRetry(JWT 리프레시)와 역할 분리:
// - requestWithRetry: 인증 토큰 만료 처리
// - fetchWithRetry: 네트워크/서버 에러 재시도

async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T>

// 재시도 대상: fetch 자체 실패 (네트워크 에러)
// 재시도 제외: 4xx 응답 (클라이언트 에러 — 재시도 무의미)
// backoff: delay = baseDelayMs * 2^(attempt-1)
//   1회: 1s, 2회: 2s, 3회: 4s
```

### 1.6 라우트 적용 패턴

```tsx
// 공통 적용 패턴 (3개 라우트 동일)
export function Component() {
  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <Suspense fallback={<LoadingSkeleton variant="item-list" />}>
        <ActualContent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

단, `discovery-detail.tsx`는 기존 `useState(loading/error)` 패턴을 유지하되:
- `loading=true` → `<LoadingSkeleton variant="analysis-result" />`
- `error` → ErrorBoundary 대신 인라인 에러 UI (throw 방식 적용 시 복잡도 증가)

---

## 2. F450: 반응형+접근성 설계

### 2.1 반응형 CSS 전략

**대상 파일**: `packages/web/src/app/globals.css`에 CSS 커스텀 속성 추가

```css
/* globals.css 추가 */
:root {
  --discovery-max-width: 1200px;
  --discovery-sidebar-width: 280px;
  --discovery-content-padding: 1.5rem;
}

@media (max-width: 1024px) {
  :root {
    --discovery-sidebar-width: 240px;
    --discovery-content-padding: 1rem;
  }
}

@media (max-width: 768px) {
  :root {
    --discovery-sidebar-width: 0px;    /* 사이드바 숨김 */
    --discovery-content-padding: 0.75rem;
  }
}
```

**Discovery 라우트 CSS 클래스 추가** (인라인 스타일 최소화):

| 페이지 | 모바일(< 768px) 변경사항 |
|--------|----------------------|
| `discovery.tsx` | 탭 목록 풀너비, Tabs 컨텐츠 패딩 줄임 |
| `discovery-detail.tsx` | 3탭 → 스크롤 가능 탭 + 사이드 패널 숨김 |
| `discovery-progress.tsx` | 크리테리아 그리드 1열 |

### 2.2 ARIA 설계

**적용 대상 컴포넌트 목록**:

| 컴포넌트 | ARIA 추가 |
|----------|-----------|
| `DiscoveryWizard` 스텝퍼 | `role="tablist"`, 각 탭 `role="tab" aria-selected` |
| `AnalysisStepper` | `role="progressbar" aria-valuenow aria-valuemax` |
| `BusinessPlanEditor` 버튼들 | `aria-label="섹션 편집"`, `aria-label="AI 재생성"` |
| `TemplateSelector` 카드 | `role="radio" aria-checked` |
| `PipelineTransitionCTA` | `aria-live="polite"` (상태 변경 알림) |
| `ErrorBoundary` 재시도 버튼 | `aria-label="다시 시도"` |
| `EmptyState` | `role="status"` |

### 2.3 키보드 내비게이션

| 인터랙션 | 키 | 동작 |
|----------|-----|------|
| 탭 이동 | `Tab` / `Shift+Tab` | 포커스 순환 |
| 버튼/링크 활성화 | `Enter` / `Space` | click 이벤트 |
| 모달/패널 닫기 | `Escape` | onClose 호출 |
| 탭 선택 | `ArrowLeft` / `ArrowRight` | 탭 간 이동 |

**구현**: `onKeyDown` 핸들러 + `tabIndex={0}` 명시적 설정

### 2.4 색상 대비 (WCAG 2.1 AA)

대비율 ≥ 4.5:1 (일반 텍스트) / ≥ 3:1 (대형 텍스트/UI 컴포넌트)

확인 대상: 배지 텍스트 색상, 버튼 레이블, 에러 메시지 텍스트

---

## 3. 테스트 설계

### 3.1 error-loading-ux.test.tsx

| # | 테스트 | 검증 내용 |
|---|--------|-----------|
| 1 | ErrorBoundary 렌더링 | 자식 throw 시 에러 메시지 표시 |
| 2 | 재시도 버튼 | 클릭 시 `onReset` 호출 + 에러 state 초기화 |
| 3 | 상세 접기 토글 | 클릭 시 error.message 노출/숨김 |
| 4 | LoadingSkeleton `item-list` | 스켈레톤 카드 3개 렌더링 |
| 5 | LoadingSkeleton `analysis-result` | 헤더+탭 구조 렌더링 |
| 6 | EmptyState | title/description/액션버튼 렌더링 |
| 7 | fetchWithRetry 성공 | 첫 시도 성공 시 결과 반환 |
| 8 | fetchWithRetry 재시도 | 2회 실패 후 3회차 성공 시 결과 반환 |
| 9 | fetchWithRetry 포기 | 3회 모두 실패 시 에러 throw |

### 3.2 responsive-a11y.test.tsx

| # | 테스트 | 검증 내용 |
|---|--------|-----------|
| 1 | ARIA role 탭리스트 | `role="tablist"` + `role="tab"` 존재 |
| 2 | aria-selected 탭 | 선택된 탭 `aria-selected="true"` |
| 3 | 재시도 버튼 aria-label | `aria-label="다시 시도"` 존재 |
| 4 | Escape 닫기 | keyDown Escape → 패널 닫힘 |
| 5 | EmptyState role | `role="status"` 존재 |

---

## 4. 파일 매핑 (Worker용)

### Worker A — F449 구현

| 파일 | 작업 |
|------|------|
| `components/feature/discovery/ErrorBoundary.tsx` | 신규 생성 |
| `components/feature/discovery/LoadingSkeleton.tsx` | 신규 생성 |
| `components/feature/discovery/EmptyState.tsx` | 신규 생성 |
| `lib/api-client-retry.ts` | 신규 생성 |
| `routes/ax-bd/discovery.tsx` | ErrorBoundary + Suspense 래핑 |
| `routes/ax-bd/discovery-detail.tsx` | loading → LoadingSkeleton, error → 인라인 에러 UI |
| `routes/discovery-progress.tsx` | ErrorBoundary + LoadingSkeleton + EmptyState |
| `__tests__/error-loading-ux.test.tsx` | 신규 생성 (9 tests) |

### Worker B — F450 구현

| 파일 | 작업 |
|------|------|
| `app/globals.css` | 반응형 CSS 변수 추가 |
| `routes/ax-bd/discovery.tsx` | 반응형 클래스 적용 |
| `routes/ax-bd/discovery-detail.tsx` | 반응형 + ARIA 추가 |
| `routes/discovery-progress.tsx` | 반응형 클래스 적용 |
| `components/feature/discovery/ErrorBoundary.tsx` | ARIA 추가 (Worker A 파일 — Worker B가 보완) |
| `components/feature/discovery/EmptyState.tsx` | role="status" (Worker A 파일 — Worker B가 보완) |
| `__tests__/responsive-a11y.test.tsx` | 신규 생성 (5 tests) |

> **주의**: ErrorBoundary.tsx / EmptyState.tsx는 Worker A가 먼저 생성, Worker B가 ARIA 속성 추가. 병렬 실행 시 Worker B는 Worker A 완료 후 해당 파일만 수정.

---

## 5. 구현 순서

```
[병렬 실행]
Worker A: ErrorBoundary → LoadingSkeleton → EmptyState → api-client-retry → 라우트 연결 → 테스트
Worker B: globals.css → 라우트 반응형 → ARIA 추가 → 키보드 핸들러 → 테스트

[순차]
→ typecheck → test 전체 실행
→ Gap Analysis
```

---

## 6. 성공 기준 (Design 기준)

| # | 기준 | 검증 방법 |
|---|------|-----------|
| D1 | ErrorBoundary: throw 시 에러 UI 렌더링 | 단위 테스트 #1 |
| D2 | 재시도 버튼 클릭 시 에러 초기화 | 단위 테스트 #2 |
| D3 | LoadingSkeleton 3종 정상 렌더링 | 단위 테스트 #4~5 |
| D4 | EmptyState 정상 렌더링 | 단위 테스트 #6 |
| D5 | fetchWithRetry: 3회 재시도 후 throw | 단위 테스트 #9 |
| D6 | 768px 뷰포트: Discovery 라우트 레이아웃 유지 | 반응형 테스트 (수동 확인) |
| D7 | ARIA role/label 필수 속성 존재 | 단위 테스트 #1~5 (responsive-a11y) |
| D8 | Escape 키 패널 닫기 | 단위 테스트 #4 |
| D9 | 전체 테스트 14건 통과 | `pnpm test` |
| D10 | typecheck 에러 없음 | `turbo typecheck` |
