---
id: FX-PLAN-sprint-296
feature: F539c — 7 라우트 Service Binding 이전 + CLI URL 전환 흡수
sprint: 296
date: 2026-04-15
status: active
req: FX-REQ-578
prd: docs/specs/fx-gateway-cutover/prd-final.md
---

# Sprint 296 Plan — F539c

## 목표

F538 이월 7 라우트를 fx-discovery Service Binding 호출로 이전하고,
F539b 이월 2건(CLI URL 전환 + KOAMI Smoke Reality)을 흡수한다.

## 전제 조건

- F539a ✅ (k6 GO 판정, Sprint 294)
- F539b ✅ 부분 (fx-gateway 프로덕션 배포 + VITE_API_URL 전환, Sprint 295 PR #596)
- VITE_API_URL = `https://fx-gateway.ktds-axbd.workers.dev/api` (이미 완료)
- fx-gateway 라우팅: discovery/ax-bd/discovery-report → fx-discovery, 나머지 → MAIN_API

## 현재 상태 (as-is)

| 항목 | 상태 |
|------|------|
| fx-gateway 프로덕션 배포 | ✅ |
| VITE_API_URL (web) | ✅ fx-gateway |
| CLI URL 전환 | ❌ packages/cli에 API URL 없음 (조사 완료 — CLI는 REST API 미호출) |
| scripts/*.sh 기본 URL | ❌ foundry-x-api.ktds-axbd.workers.dev 하드코딩 |
| smoke.spec.ts PROD_API_URL | ❌ 구 URL 하드코딩 |
| biz-items 3 라우트 → fx-discovery | ❌ fx-gateway 미등록 |
| discovery-stages 2 라우트 → fx-discovery | ❌ fx-gateway 미등록 |
| discovery-pipeline GET 2 라우트 → fx-discovery | ❌ fx-gateway 미등록 |
| F539b KOAMI Smoke Reality | ❌ 미실행 |

## 작업 목록

### CLI URL 전환 (F539b 이월 — T0)

| # | 작업 | 파일 |
|---|------|------|
| T0a | scripts/*.sh 기본 URL 전환 (foundry-x-api → fx-gateway) | scripts/seed-discovery-reports.sh, session-collector.sh, skill-demo-seed.sh, sf-scan-register.sh, usage-tracker-hook.sh, task-daemon.sh, feedback-consumer.sh |
| T0b | e2e/prod/smoke.spec.ts API_URL 기본값 전환 | packages/web/e2e/prod/smoke.spec.ts |
| T0c | packages/cli URL 전환 → N/A 결론 (CLI는 REST API 미호출) | docs/04-report에 기록 |

### Group A (PR1: bizItems 3 라우트)

| # | 작업 | 파일 | TDD |
|---|------|------|-----|
| T1 | fx-discovery에 BizItemService CRUD 서브셋 추가 | fx-discovery/src/services/biz-item-full.service.ts | N/A |
| T2 | fx-discovery에 CreateBizItemSchema 추가 | fx-discovery/src/schemas/biz-item.ts | N/A |
| T3 | fx-discovery에 biz-items 3 라우트 추가 (GET list, POST create, GET :id) | fx-discovery/src/routes/biz-items.ts | Red→Green |
| T4 | fx-discovery app.ts에 biz-items 라우트 마운트 | fx-discovery/src/app.ts | N/A |
| T5 | fx-gateway: 3개 특정 패턴 → DISCOVERY 라우팅 추가 | fx-gateway/src/app.ts | 기존 게이트웨이 테스트 보완 |
| T6 | packages/api biz-items.ts에서 3 라우트 정의 제거 | packages/api/src/core/discovery/routes/biz-items.ts | N/A |
| T7 | KOAMI Smoke Reality PR1 검증 | — | 수동 |

### Group B (PR2: discoveryPipeline/stages 4 라우트)

| # | 작업 | 파일 | TDD |
|---|------|------|-----|
| T8 | fx-discovery에 DiscoveryStageService 이전 | fx-discovery/src/services/discovery-stage.service.ts | N/A |
| T9 | fx-discovery에 discovery-stage 스키마 추가 | fx-discovery/src/schemas/discovery-stage.ts | N/A |
| T10 | fx-discovery에 discovery-stages 2 라우트 추가 | fx-discovery/src/routes/discovery-stages.ts | Red→Green |
| T11 | fx-discovery에 DiscoveryPipelineReadService 추가 (listRuns, getRun - read-only) | fx-discovery/src/services/discovery-pipeline-read.service.ts | N/A |
| T12 | fx-discovery에 discovery-pipeline 2 GET 라우트 추가 | fx-discovery/src/routes/discovery-pipeline.ts | Red→Green |
| T13 | fx-discovery app.ts에 2 라우트 파일 마운트 | fx-discovery/src/app.ts | N/A |
| T14 | fx-gateway: 4개 패턴 → DISCOVERY 라우팅 추가 | fx-gateway/src/app.ts | 기존 테스트 보완 |
| T15 | packages/api에서 4 라우트 정의 제거 (stages.ts 2개, pipeline.ts 2개) | packages/api/src/core/discovery/routes/discovery-stages.ts, discovery-pipeline.ts | N/A |
| T16 | KOAMI Smoke Reality PR2 + 통합 검증 (F539b 이월 흡수) | — | 수동 |

### 마무리

| # | 작업 | 파일 |
|---|------|------|
| T17 | ESLint no-cross-domain-import 룰 확장 (bizItems → discovery 도메인 고정) | packages/api/src/eslint-rules/index.ts |
| T18 | Phase 44 f539 회고 작성 (Smoke Reality P1~P4) | docs/04-report/phase-44-f539-retrospective.md |

## 7 라우트 목록 (패턴)

| 그룹 | HTTP | 패턴 | 현재 | 목표 |
|------|------|------|------|------|
| A | GET | /api/biz-items | packages/api | fx-discovery |
| A | POST | /api/biz-items | packages/api | fx-discovery |
| A | GET | /api/biz-items/:id | packages/api | fx-discovery |
| B | GET | /api/biz-items/:id/discovery-progress | packages/api | fx-discovery |
| B | POST | /api/biz-items/:id/discovery-stage | packages/api | fx-discovery |
| B | GET | /api/discovery-pipeline/runs | packages/api | fx-discovery |
| B | GET | /api/discovery-pipeline/runs/:id | packages/api | fx-discovery |

## 성공 기준

- fx-gateway에서 7 라우트 모두 DISCOVERY로 라우팅 확인
- packages/api에서 7 라우트 정의 삭제 완료
- `grep /api/biz-items.*GET.*POST packages/api/src` = 0
- `pnpm test` PASS (all packages)
- KOAMI Smoke Reality: bi-koami-001 Graph 실행 → proposals ≥ 1건
- Phase 44 F539 회고 완성
