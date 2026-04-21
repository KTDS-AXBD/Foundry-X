---
id: FX-PLAN-312
sprint: 312
f_items: [F560]
status: done
---

# Sprint 312 Plan — F560 Discovery 완전 이관 (재착수)

## F560 개요
Phase 45 MVP M1. Sprint 311 scope drift 재발 방지를 위한 SCOPE LOCKED 재착수.

## SCOPE LOCKED (3항목만)

### (a) core/discovery/routes 정리
- **삭제 대상** (테스트 import 없음, fx-discovery 이미 보유):
  - `packages/api/src/core/discovery/routes/biz-items.ts`
  - `packages/api/src/core/discovery/routes/discovery-reports.ts`
  - `packages/api/src/core/discovery/routes/discovery-stages.ts`
- **export/register 제거만** (테스트가 직접 import — 파일 유지):
  - `discovery.ts` (7 test files), `discovery-pipeline.ts` (3), `discovery-report.ts` (1)
- **유지** (MAIN_API dep): `discovery-stage-runner.ts`, `discovery-shape-pipeline.ts`
- **OUT-OF-SCOPE**: `ax-bd-*.ts` 경로

### (b) packages/api/src/app.ts
- import 블록에서 제거: `bizItemsRoute`, `discoveryPipelineRoute`, `discoveryStagesRoute`
- route 등록 제거: 3개 `app.route("/api", ...)` 라인

### (c) packages/fx-gateway/src/app.ts
- 제거 대상: lines 122~151 (F560-태그 MAIN_API 7개 명시 라우트)
- stage-runner 3 + graph 2 + shape-pipeline 2 = 7개
- 이유: catch-all `/api/*` → MAIN_API (line 154)가 동일 동작 보장
- **OUT-OF-SCOPE**: MAIN_API routing 추가, 다른 도메인, ax-bd-* 경로

## TDD 적용 여부
삭제/등록 제거 위주 작업 → TDD 면제 (migration/cleanup 분류).
typecheck + 기존 tests PASS가 완료 기준.

## 완료 기준
- `turbo typecheck` PASS (api + fx-gateway 패키지)
- `turbo test` PASS (기존 테스트 회귀 없음)
- core/app.ts에 bizItemsRoute, discoveryStagesRoute, discoveryPipelineRoute 등록 없음
- fx-gateway/app.ts에 F560-태그 MAIN_API 7개 라우트 없음
