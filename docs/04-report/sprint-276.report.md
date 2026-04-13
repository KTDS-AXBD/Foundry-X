---
id: FX-REPORT-276
title: Sprint 276 완료 보고서 — F519 대시보드 현행화
sprint: 276
f_items: [F519]
status: completed
gap_match_rate: 100%
created: 2026-04-13
---

# Sprint 276 완료 보고서 — F519 대시보드 현행화

## §1 요약

| 항목 | 값 |
|------|---|
| F-item | F519 (FX-REQ-547, P1) |
| Sprint | 276 |
| Match Rate | 100% |
| 변경 파일 | 2개 |
| 테스트 | vitest 2 PASS / E2E +1 태깅 |

## §2 완료된 작업

### 핵심 버그 수정

**TodoSection.tsx — NEXT_ACTIONS stage 2 dead link 수정**

```typescript
// Before (dead link — discovery-unified.tsx가 ?tab= 미지원)
2: { label: "평가 실행", href: "/discovery?tab=process" }

// After (유효 라우트)
2: { label: "평가 실행", href: "/discovery/items" }
```

**근거**: `/discovery` 라우트(`discovery-unified.tsx`)는 `?tab=process` 쿼리 파라미터를 처리하지 않음. `/discovery/items`(`ax-bd/discovery.tsx`)가 올바른 발굴 아이템 목록 경로.

### 문서 현행화

- TodoSection.tsx JSDoc: "6단계" → "2단계(발굴/형상화)"
- E2E `dashboard.spec.ts`: `@sprint 276`, `@tagged-by F519` 태그 추가

## §3 F519 서브 요구사항 최종 상태

| # | 요구사항 | 상태 | 구현 Sprint |
|---|---------|------|------------|
| 1 | 파이프라인 6단계→2단계 축소 | ✅ | Sprint 267 (F516) |
| 2 | 퀵 액션 dead link 제거 | ✅ | Sprint 267 (F516) |
| 3 | 내부 위젯 4개 삭제 | ✅ | Sprint 267 (F516) |
| 4 | ToDo List UI/UX — stage 2 dead link 수정 | ✅ | Sprint 276 (F519) |
| 5 | 업무 가이드 Wiki 대체 | ✅ | Sprint 267 (F516) |

## §4 테스트 결과

```
vitest: 2 passed (F519 TodoSection NEXT_ACTIONS)
typecheck: PASS (tsc --noEmit)
E2E: 태깅 완료 (실행은 CI에서 검증)
Gap Match Rate: 100%
```

## §5 변경 파일 목록

| 파일 | 변경 | 설명 |
|------|------|------|
| `packages/web/src/components/feature/TodoSection.tsx` | 수정 | NEXT_ACTIONS stage 2 href 수정 + JSDoc |
| `packages/web/e2e/dashboard.spec.ts` | 수정 | F519 태깅 + todo list E2E case |
| `packages/web/src/__tests__/todo-section.test.tsx` | 신규 | TDD Red→Green 검증 |
| `docs/01-plan/features/sprint-276.plan.md` | 신규 | Sprint 276 Plan |
| `docs/02-design/features/sprint-276.design.md` | 신규 | Sprint 276 Design |
