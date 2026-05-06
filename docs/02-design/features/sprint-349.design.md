---
code: FX-DSGN-349
title: Sprint 349 — F614 shard-doc closure Design
version: 1.0
status: Active
category: DESIGN
created: 2026-05-06
updated: 2026-05-06
sprint: 349
f_item: F614
req: FX-REQ-679
---

# Sprint 349 — F614 shard-doc closure Design

## §1 목표

`services/shard-doc.ts` + `routes/shard-doc.ts` + `schemas/shard-doc.ts` 3 files (422 LOC)을 `core/docs/` 도메인으로 이동. cross-domain import 0건 + external callers 3건 → 가장 깨끗한 closure 후보.

## §2 현재 상태

| 파일 | LOC | cross-domain import | 외부 callers |
|------|-----|---------------------|---------------|
| `routes/shard-doc.ts` | 126 | env(acceptable) + schemas(sibling) + services(sibling) | app.ts:41, app.ts:232 |
| `services/shard-doc.ts` | 261 | **0건** (zero-dep) | `__tests__/shard-doc.test.ts:4` |
| `schemas/shard-doc.ts` | 35 | **0건** (zod-only) | routes/shard-doc.ts (sibling) |

core/docs/ 현황: `core/docs/routes/index.ts` (F613 Sprint 347, swagger UI sub-app만 존재)

## §3 변경 파일 매핑 (§5)

| # | 파일 | 변경 유형 | 내용 |
|---|------|----------|------|
| 1 | `routes/shard-doc.ts` | `git mv` → `core/docs/routes/shard-doc.ts` | import depth 갱신 |
| 2 | `services/shard-doc.ts` | `git mv` → `core/docs/services/shard-doc.ts` | 변경 없음 (zero-dep) |
| 3 | `schemas/shard-doc.ts` | `git mv` → `core/docs/schemas/shard-doc.ts` | 변경 없음 (zod-only) |
| 4 | `core/docs/types.ts` | 신규 생성 | F609 re-export 패턴 |
| 5 | `app.ts` | 수정 | import path 1건 갱신 |
| 6 | `__tests__/shard-doc.test.ts` | 수정 | import path 1건 갱신 |
| 7 | `__tests__/shard-doc-route.test.ts` | 수정 | import path 1건 갱신 |
| 8 | dist orphan | 삭제 | `dist/{routes,services,schemas}/shard-doc.*` |

## §4 import 경로 변경 상세

### core/docs/routes/shard-doc.ts (git mv 후 수정 필요)

| 현재 import | 변경 후 | 근거 |
|-------------|---------|------|
| `../schemas/shard-doc.js` | `../schemas/shard-doc.js` | sibling (core/docs/schemas/) |
| `../services/shard-doc.js` | `../services/shard-doc.js` | sibling (core/docs/services/) |
| `../env.js` | `../../../env.js` | src/ root까지 3 depth up |

### app.ts

| 현재 | 변경 후 |
|------|---------|
| `./routes/shard-doc.js` | `./core/docs/routes/shard-doc.js` |

mount path `/api` 유지 (endpoint `/api/shard-doc/*` 호환, breaking change 없음)

### __tests__/shard-doc.test.ts

| 현재 | 변경 후 |
|------|---------|
| `../services/shard-doc.js` | `../core/docs/services/shard-doc.js` |

### __tests__/shard-doc-route.test.ts

| 현재 | 변경 후 |
|------|---------|
| `../routes/shard-doc.js` | `../core/docs/routes/shard-doc.js` |

## §5 core/docs/types.ts (F609 re-export 패턴)

```typescript
export { ShardDocService } from "./services/shard-doc.js";
export * from "./schemas/shard-doc.js";
```

## §6 검증

1. `pnpm -F api typecheck` — 회귀 0
2. `pnpm -F api test` — shard-doc 2 test files GREEN
3. `find packages/api/dist -name "shard-doc*"` — 0 (orphan cleanup 후)
4. `find packages/api/src/{services,routes,schemas} -maxdepth 1 -name "shard-doc.ts"` — 0
5. `find packages/api/src/core/docs -name "*.ts"` — ≥ 5 files
