---
id: FX-PLAN-276
title: Sprint 276 — F519 대시보드 현행화 (Dashboard Overhaul)
sprint: 276
f_items: [F519]
req: [FX-REQ-547]
status: in_progress
created: 2026-04-13
---

# Sprint 276 Plan — F519 대시보드 현행화

## §1 목표

Phase 38: Dashboard Overhaul — 서비스 범위(발굴~형상화, 2-3단계)에 맞춰 대시보드 전면 정리.

## §2 F-item 범위

| F-item | 제목 | REQ | 우선순위 |
|--------|------|-----|---------|
| F519 | 대시보드 현행화 | FX-REQ-547 | P1 |

### F519 서브 요구사항

| # | 요구사항 | 현황 |
|---|---------|------|
| 1 | 파이프라인 6단계→2단계 축소 | ✅ F516(Sprint 267)에서 완료 |
| 2 | 퀵 액션 dead link 제거 | ✅ F516(Sprint 267)에서 완료 |
| 3 | 내부 위젯 4개 삭제 | ✅ F516(Sprint 267)에서 완료 |
| 4 | ToDo List UI/UX 개선 | ⚠️ NEXT_ACTIONS stage 2 dead link 잔존 |
| 5 | 업무 가이드 Wiki 대체 | ✅ F516(Sprint 267)에서 완료 |

## §3 현황 분석

F516(Sprint 267, PR #533)에서 대부분의 요구사항이 구현됨.
F519는 잔여 이슈 해소 + 문서화 + E2E 테스트 F519 태깅이 주 작업.

### 잔여 이슈 (FX-REQ-547 §4)

**TodoSection.tsx NEXT_ACTIONS dead link:**
```typescript
// 현재 (dead link)
2: { label: "평가 실행", href: "/discovery?tab=process" }

// 수정 대상
2: { label: "평가 실행", href: "/discovery/items" }
```
- `/discovery` 라우트 (`discovery-unified.tsx`)는 `?tab=process` 쿼리 파라미터 미지원
- `/discovery/items`가 올바른 발굴 아이템 목록 경로

## §4 구현 계획

### 4-1. 코드 수정 (Tier 3 직접 구현)

| 파일 | 변경 내용 |
|------|---------|
| `packages/web/src/components/feature/TodoSection.tsx` | NEXT_ACTIONS stage 2 href 수정 + 주석 현행화 |

### 4-2. 테스트 추가

| 파일 | 내용 |
|------|------|
| `packages/web/e2e/dashboard.spec.ts` | F519 태깅 + todo list 링크 검증 추가 |

### 4-3. 문서

- `docs/02-design/features/sprint-276.design.md` — 설계 문서
- `docs/04-report/sprint-276.report.md` — 완료 보고서

## §5 완료 기준

- [ ] TodoSection NEXT_ACTIONS stage 2 href가 유효한 `/discovery/items`를 가리킴
- [ ] `pnpm typecheck` PASS
- [ ] E2E `dashboard.spec.ts`에 `@sprint: 276` `@tagged-by: F519` 태그 존재
- [ ] Gap Analysis Match Rate ≥ 90%
