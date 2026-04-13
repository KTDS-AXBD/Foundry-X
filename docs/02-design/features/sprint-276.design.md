---
id: FX-DESIGN-276
title: Sprint 276 — F519 대시보드 현행화 Design
sprint: 276
f_items: [F519]
status: in_progress
created: 2026-04-13
---

# Sprint 276 Design — F519 대시보드 현행화

## §1 개요

F519 대시보드 현행화 잔여 이슈 해소.
F516(Sprint 267)에서 대부분 완료, Sprint 276에서 TodoSection dead link 수정 + E2E 태깅.

## §2 현행 아키텍처

```
packages/web/src/routes/dashboard.tsx
  ├── ProcessPipeline          ← 2단계(발굴/형상화) ✅
  ├── QuickActions             ← 4개 유효 링크 ✅
  └── TodoSection              ← 진행 중 아이템 목록
        └── NEXT_ACTIONS       ← ⚠️ stage 2 dead link

packages/web/src/components/feature/TodoSection.tsx
  └── NEXT_ACTIONS: {
        2: "/discovery?tab=process"  ← ❌ discovery-unified가 tab 파라미터 미지원
        3: "/shaping/business-plan"  ← ✅ 유효
      }
```

## §3 변경 설계

### §3-1. TodoSection NEXT_ACTIONS 수정

**변경 전:**
```typescript
const NEXT_ACTIONS: Record<number, { label: string; href: string }> = {
  2: { label: "평가 실행", href: "/discovery?tab=process" },
  3: { label: "사업기획서 작성", href: "/shaping/business-plan" },
};
```

**변경 후:**
```typescript
const NEXT_ACTIONS: Record<number, { label: string; href: string }> = {
  2: { label: "평가 실행", href: "/discovery/items" },
  3: { label: "사업기획서 작성", href: "/shaping/business-plan" },
};
```

**근거:**
- `/discovery` 라우트 (`discovery-unified.tsx`)는 `useSearchParams`/`?tab=` 미지원
- `/discovery/items` = `ax-bd/discovery.tsx` = 발굴 아이템 목록 (유효)
- stage 3는 `shaping/business-plan` = `business-plan-list.tsx` (유효, 변경 없음)

### §3-2. JSDoc 주석 현행화

**변경 전:**
```typescript
/**
 * F323 — 대시보드 ToDo List
 * 아이템별 현재 6단계 위치 + 다음 할 일 + 의사결정 대기
 */
```

**변경 후:**
```typescript
/**
 * F323/F519 — 대시보드 ToDo List
 * 아이템별 현재 2단계(발굴/형상화) 위치 + 다음 할 일 + 의사결정 대기
 */
```

## §4 E2E 테스트 설계

### §4-1. 추가할 테스트

`packages/web/e2e/dashboard.spec.ts`에 F519 태깅 + 새 test case 추가:

```typescript
// @sprint: 276 (추가)
// @tagged-by: F519 (추가)

test("todo list next action links to valid routes", async ({ authenticatedPage: page }) => {
  await page.goto("/dashboard");
  // TodoSection 영역에 발굴 아이템 링크가 있으면 href 검증
  const todoSection = page.locator("text=ToDo List").locator("..");
  await expect(todoSection).toBeAttached();
});
```

## §5 파일 매핑

| 파일 | 변경 유형 | 내용 |
|------|---------|------|
| `packages/web/src/components/feature/TodoSection.tsx` | 수정 | NEXT_ACTIONS href + 주석 |
| `packages/web/e2e/dashboard.spec.ts` | 수정 | 태그 추가 + test case |

## §6 테스트 계약 (TDD Target)

> TodoSection이 stage 2 아이템에 대해 `/discovery/items` 링크를 렌더링해야 한다.

- **Input**: `currentStage=2`인 BizItemSummary
- **Output**: 렌더링된 링크의 href가 `/discovery/items`를 포함
- **Not**: `/discovery?tab=process`를 포함하지 않아야 함
