---
id: FX-DESIGN-312
sprint: 312
f_items: [F560]
status: done
match_rate: TBD
---

# Sprint 312 Design — F560 Discovery 완전 이관

## §1 목표
SCOPE LOCKED 3항목 정확히 수행. Sprint 311 scope drift(F560→ax-bd 이전, MAIN_API 명시 라우트 추가) 재발 방지.

## §2 현재 상태
- `fx-discovery/src/routes/`: discovery.ts, discovery-report.ts, discovery-reports.ts, biz-items.ts, discovery-stages.ts, discovery-pipeline.ts (F538+F539c 이관 완료)
- `packages/api/src/core/discovery/routes/`: 위 6개 파일이 DUPLICATE로 잔존 + ax-bd-*.ts + discovery-shape-pipeline.ts + discovery-stage-runner.ts
- `app.ts`: bizItemsRoute, discoveryStagesRoute, discoveryPipelineRoute가 여전히 MAIN_API에 등록
- `fx-gateway/src/app.ts` lines 122~151: Sprint 311 scope drift로 추가된 F560-태그 MAIN_API 7개 명시 라우트 (catch-all과 중복)

## §3 변경 불가 범위 (OUT-OF-SCOPE)
- `ax-bd-*.ts` 경로 — OUT-OF-SCOPE
- `discovery-stage-runner.ts`, `discovery-shape-pipeline.ts` — F571/F562까지 MAIN_API dep 유지
- gateway MAIN_API routing 추가 — OUT-OF-SCOPE
- MAIN_API catch-all (line 154) — 건드리지 않음

## §4 테스트 계약 (TDD Red Target)
삭제/정리 작업 — Red 테스트 불필요 (회귀 검증이 목적).
기존 테스트 PASS = Green 기준.

## §5 파일 매핑 (SCOPE LOCKED 3항목)

### (a) core/discovery/routes 정리

| 파일 | 액션 | 이유 |
|------|------|------|
| `packages/api/src/core/discovery/routes/biz-items.ts` | **NO-OP (KEEP + 등록 유지)** | 52KB 복합 MAIN_API 라우트 잔류. classify/PRD/prototype 등 cross-domain 라우트는 fx-discovery 외부. CRUD 3개는 fx-gateway→DISCOVERY가 처리 |
| `packages/api/src/core/discovery/routes/discovery-reports.ts` | **DELETE** | fx-discovery에 완전 이관, 테스트 import 없음 (3368 vs 3374 bytes = 등가) |
| `packages/api/src/core/discovery/routes/discovery-stages.ts` | **DELETE** | fx-discovery에 완전 이관, 테스트 import 없음 (fx-discovery 버전이 상위 집합) |
| `packages/api/src/core/discovery/routes/discovery.ts` | **KEEP** (export만 제거) | 7 test files가 직접 import — 파일 유지, core/discovery/index.ts export 제거 |
| `packages/api/src/core/discovery/routes/discovery-pipeline.ts` | **KEEP** (export만 제거) | 3 test files import — 파일 유지, export 제거 |
| `packages/api/src/core/discovery/routes/discovery-report.ts` | **KEEP** (export만 제거) | 1 test file import — 파일 유지, export 제거 |
| `packages/api/src/core/discovery/routes/ax-bd-*.ts` | **NO-OP** | OUT-OF-SCOPE |
| `packages/api/src/core/discovery/routes/discovery-stage-runner.ts` | **NO-OP** | MAIN_API dep, F571까지 유지 |
| `packages/api/src/core/discovery/routes/discovery-shape-pipeline.ts` | **NO-OP** | MAIN_API dep, F562까지 유지 |

### (b) packages/api/src/app.ts

| 변경 | 위치 |
|------|------|
| import에서 `bizItemsRoute` 제거 | line ~35 |
| import에서 `discoveryPipelineRoute` 제거 | line ~36 |
| import에서 `discoveryStagesRoute` 제거 | line ~37 |
| `app.route("/api", bizItemsRoute)` 제거 | line ~272 |
| `app.route("/api", discoveryStagesRoute)` 제거 | line ~275 |
| `app.route("/api", discoveryPipelineRoute)` 제거 | line ~368 |

### (b-2) packages/api/src/core/index.ts + core/discovery/index.ts

| 파일 | 변경 |
|------|------|
| `core/index.ts` | `bizItemsRoute`, `discoveryPipelineRoute`, `discoveryStagesRoute` export 제거 |
| `core/discovery/index.ts` | 위 3개 + `discoveryRoute`, `discoveryReportRoute`, `discoveryReportsRoute` export 제거 |

### (c) packages/fx-gateway/src/app.ts

| 제거 대상 | Lines | 대체 |
|----------|-------|------|
| F560: discovery-stage-runner MAIN_API 라우트 3개 | 122~133 | catch-all `/api/*` → MAIN_API (line 154) |
| F560: discovery-graph MAIN_API 라우트 2개 | 135~142 | catch-all |
| F560: discovery-shape-pipeline MAIN_API 라우트 2개 | 144~151 | catch-all |

**안전성 확인**: 제거 후 동작 보장
- `/api/biz-items/:id/discovery-stage/:stage/run` → catch-all → MAIN_API ✓
- `/api/biz-items/:id/discovery-graph/run-all` → catch-all → MAIN_API ✓
- `/api/pipeline/shape/trigger` → catch-all → MAIN_API ✓
- 기존 DISCOVERY 라우트 (lines 22~77)와 경로 겹침 없음 ✓

## §6 주의사항
- `7파일 이동` 중 실제로는 3 DELETE + 3 export-only 제거 + 3 NO-OP(MAIN_API dep/ax-bd)
- 테스트 파일이 core 경로를 직접 import하는 3개 파일(discovery, pipeline, report)은 F560 이후 레거시 테스트 인프라로 유지
- test migration은 후속 sprint 범위
