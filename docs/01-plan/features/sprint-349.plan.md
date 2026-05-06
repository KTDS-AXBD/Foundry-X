---
code: FX-PLAN-349
title: Sprint 349 — F614 shard-doc closure → core/docs/{routes,services,schemas}/
version: 1.0
status: Active
category: PLAN
created: 2026-05-06
updated: 2026-05-06
sprint: 349
f_item: F614
req: FX-REQ-679
priority: P3
---

# Sprint 349 — F614 shard-doc closure

> SPEC.md §5 F614 row가 권위 소스. 본 plan은 실행 절차 + Phase Exit 체크리스트 정리용.

## §1 배경 + 사전 측정

F596(Sprint 348, PR #746+#747) 직후 services/ 잔존 7 files 중 **가장 깨끗한 closure 후보**.

| 파일 | LOC | cross-domain import | 외부 callers |
|------|-----|---------------------|---------------|
| `routes/shard-doc.ts` | 126 | env + schemas/common (acceptable) | app.ts:41 1건 |
| `services/shard-doc.ts` | 261 | **0건** (zero-dep) | tests 2건 |
| `schemas/shard-doc.ts` | 35 | **0건** (zod-only) | sibling import만 |
| **합계** | 422 | (routes만 2 acceptable) | 3 callers |

`core/docs/` 현황:
- `core/docs/routes/index.ts` (F613 Sprint 347 신설, swagger UI sub-app)
- services/, schemas/ 디렉터리 미존재 → 신설 필요

## §2 인터뷰 4회 패턴 결정 (S335, 28회차)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 메인 결정 | A 트랙 — services/ 잔존 cleanup | 31 세션 연속 성공 패턴 연장 |
| 2차 첫 타깃 | shard-doc → core/docs/ | cross-domain 0 + 외부 callers 3건 = 가장 깨끗 |
| 3차 옵션 | A1 (F593 entity / F595 sr / F594 spec 패턴 재현) | 17회차 정착 패턴 |
| 4차 시동 | 즉시 (Sprint 349 시동) | autopilot ~5분 추정 |

## §3 범위 (a~i)

### (a) 디렉터리 신설
- `packages/api/src/core/docs/services/`
- `packages/api/src/core/docs/schemas/`

### (b) 3 files git mv
```bash
git mv packages/api/src/routes/shard-doc.ts packages/api/src/core/docs/routes/shard-doc.ts
git mv packages/api/src/services/shard-doc.ts packages/api/src/core/docs/services/shard-doc.ts
git mv packages/api/src/schemas/shard-doc.ts packages/api/src/core/docs/schemas/shard-doc.ts
```

### (c) types.ts 신설 (F609 re-export 패턴)
```typescript
// packages/api/src/core/docs/types.ts
export { ShardDocService } from "./services/shard-doc.js";
export * from "./schemas/shard-doc.js";
```

### (d) routes/shard-doc.ts cross-domain depth 갱신
- `../env.js` → `../../../env.js`
- `../schemas/common.js` → `../../../schemas/common.js`
- `../services/shard-doc.js` → `../services/shard-doc.js` (sibling 자동 동일)

### (e) app.ts import path 갱신 1건
- `./routes/shard-doc.js` → `./core/docs/routes/shard-doc.js`
- mount path `/api` 유지 (endpoint `/api/shard-doc/*` 호환, breaking change 회피)
- F613 docsApp(`/api/docs` mount)과 별 sub-app으로 공존

### (f) tests 2 import path 갱신
- `__tests__/shard-doc.test.ts` L4: `../services/shard-doc.js` → `../core/docs/services/shard-doc.js`
- `__tests__/shard-doc-route.test.ts` L3: `../routes/shard-doc.js` → `../core/docs/routes/shard-doc.js`

### (g) dist orphan cleanup (S314 패턴 28회차)
```bash
rm -rf packages/api/dist/routes/shard-doc.{js,js.map,d.ts,d.ts.map}
rm -rf packages/api/dist/services/shard-doc.{js,js.map,d.ts,d.ts.map}
rm -rf packages/api/dist/schemas/shard-doc.{js,js.map,d.ts,d.ts.map}
```

### (h) packages/api typecheck + vitest GREEN
회귀 0 확증.

### (i) Phase Exit P-a~P-l Smoke Reality 12항 (§4)

## §4 Phase Exit 체크리스트

| ID | 항목 | 측정 방법 | 기준 |
|----|------|----------|------|
| P-a | services/ + routes/ + schemas/ 루트 shard-doc 제거 | `find packages/api/src/{services,routes,schemas} -maxdepth 1 -name "shard-doc.ts"` | 0+0+0 |
| P-b | core/docs/ closure 존재 + types.ts | `find packages/api/src/core/docs -name "*.ts"` | routes/shard-doc + services/shard-doc + schemas/shard-doc + types.ts + routes/index ≥ 5 files |
| P-c | services/ 루트 .ts 카운트 | `find packages/api/src/services -maxdepth 1 -type f -name "*.ts" \| wc -l` | 6 (7-1) |
| P-d | 외부 callers OLD path=0 | `grep -rn '"\.\.?/.*shard-doc' packages/api/src --include="*.ts"` 중 OLD path | 0 |
| P-e | typecheck + tests GREEN | `pnpm -F api typecheck && pnpm -F api test` | 회귀 0 |
| P-f | dual_ai_reviews sprint 349 자동 INSERT | D1 query | ≥ 1건 (hook 24 sprint 연속, 누적 ≥ 35건) |
| P-g | F608~F613 baseline=0 회귀 | `bash scripts/lint-baseline-check.sh` | exit 0 |
| P-h | F587~F596 회귀 측정 10항 | grep + count | 모든 항목 회귀 0 |
| P-i | Match ≥ 90% | gap-detector | semantic 100% 목표 |
| P-j | dist orphan = 0 | `find packages/api/dist -name "shard-doc*"` | 0 (h cleanup 후) |
| P-k | MSA cross-domain baseline=0 유지 | `bash scripts/lint-baseline-check.sh` | 0 (env + schemas/common 2건 acceptable) |
| P-l | API `/api/shard-doc` 401 정상 | curl smoke (deploy 후) | auth 정상 = endpoint 살아있음 |

## §5 전제

- F596 ✅ (Sprint 348)
- F608~F613 baseline=0 ✅ (Sprint 342~347)
- C103+C104 ✅ (23 sprint 연속 정상)

## §6 예상 시간

- autopilot **~5분** (F593 최단 3분 42초 갱신 가능)
- 단순도: closure 가장 깨끗 + types.ts 1 + 3 callers + cross-domain depth 갱신 3건만

## §7 다음 사이클 후보 (F614 후속)

- **requirements closure** (routes+schemas 2 files) → core/req/ 신설
- **llm.ts 도메인 결정** (services/ 잔존 핵심)
- **pii-masker** → core/security/ 또는 core/infra/ 합류
- **pr-pipeline + merge-queue + conflict-detector** → core/spec/ 합류 (F594 spec 도메인 활용)
- Phase 47 GAP-3 27 stale proposals 정리
- **AI Foundry W19 BeSir 5/15 D-9** (PG 도입 결정 unlock 후 P0-2 sprint 분해)
