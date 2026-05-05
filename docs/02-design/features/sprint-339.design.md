---
id: FX-DSGN-339
sprint: 339
feature: F593
req: FX-REQ-661
status: approved
date: 2026-05-05
---

# Sprint 339 Design — F593: entity 도메인 신설 + closure 3 files

## §1 목표

`services/entity-registry.ts`, `routes/entities.ts`, `schemas/entity.ts` 3 files를 신규 `core/entity/` 도메인으로 git mv. F587/F588 간단 mv 패턴 재현. API paths 완전 동일 유지. app.ts import 1건 갱신.

## §2 변경 파일 목록

### 신규 생성 (디렉터리)
- `packages/api/src/core/entity/routes/`
- `packages/api/src/core/entity/services/`
- `packages/api/src/core/entity/schemas/`

### git mv (3 files)
| 원본 | 대상 |
|------|------|
| `packages/api/src/routes/entities.ts` | `packages/api/src/core/entity/routes/entities.ts` |
| `packages/api/src/services/entity-registry.ts` | `packages/api/src/core/entity/services/entity-registry.ts` |
| `packages/api/src/schemas/entity.ts` | `packages/api/src/core/entity/schemas/entity.ts` |

### 수정 (2 files)

#### `packages/api/src/core/entity/routes/entities.ts` (mv 후 내부 import 경로 갱신)
| 현재 | 변경 후 |
|------|---------|
| `from "../schemas/common.js"` | `from "../../../schemas/common.js"` |
| `from "../env.js"` | `from "../../../env.js"` |
| `from "../middleware/tenant.js"` | `from "../../../middleware/tenant.js"` |
| `from "../services/entity-registry.js"` | `from "../services/entity-registry.js"` (**변경 없음** — sibling) |
| `from "../schemas/entity.js"` | `from "../schemas/entity.js"` (**변경 없음** — sibling) |

#### `packages/api/src/app.ts` (import 1건 갱신)
| 현재 (line 40) | 변경 후 |
|----------------|---------|
| `from "./routes/entities.js"` | `from "./core/entity/routes/entities.js"` |

## §3 변경하지 않는 것
- `app.ts:182` — `app.route("/api", entitiesRoute)` mount path 동일 유지
- D1 테이블 `service_entities`, `entity_links` — schema 변경 없음
- API endpoint paths (`/api/entities`, `/api/entities/{id}/graph`, `/api/entities/link`, `/api/entities/sync`)

## §4 dist orphan cleanup
```
packages/api/dist/services/entity-registry.{js,js.map,d.ts,d.ts.map}  — 4 files
packages/api/dist/routes/entities.{js,js.map,d.ts,d.ts.map}           — 4 files
packages/api/dist/schemas/entity.{js,js.map,d.ts,d.ts.map}            — 4 files
```
총 12 files — git rm 또는 build 재생성

## §5 파일 매핑 (Worker 없음 — 단일 구현)

| # | 파일 | 작업 |
|---|------|------|
| 1 | `packages/api/src/routes/entities.ts` | git mv → core/entity/routes/ |
| 2 | `packages/api/src/services/entity-registry.ts` | git mv → core/entity/services/ |
| 3 | `packages/api/src/schemas/entity.ts` | git mv → core/entity/schemas/ |
| 4 | `packages/api/src/core/entity/routes/entities.ts` | import depth 3건 갱신 (mv 후) |
| 5 | `packages/api/src/app.ts` | import path 1건 갱신 (line 40) |

## §6 OBSERVED P-a~P-l (Plan §3에서 승계)
→ `docs/01-plan/features/sprint-339.plan.md` §3 참조
