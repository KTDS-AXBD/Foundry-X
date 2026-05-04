---
id: FX-PLAN-339
sprint: 339
feature: F593
req: FX-REQ-661
status: approved
date: 2026-05-04
---

# Sprint 339 Plan — F593: entity 도메인 신설 + closure 3 files (옵션 c, F587/F588 선례 재현)

## 목표

**S329 F592(Sprint 338, PR #730 Match 100%, 9분 19초) 후속 + C105 승격.** services/ 잔존 16 files 중 entity-registry 묶음(routes/entities + services/entity-registry + schemas/entity = closure 3 files)을 신규 `core/entity/` 도메인으로 통합 이전. F587 traceability seed + F588 work closure 패턴 결합 재현.

**핵심 원칙**: F587/F588 간단 mv 패턴 (strict MSA sub-app 강제 안 함). API paths 완전 동일 유지. cross-domain 0건 추가. closure 3 files이므로 외부 callers 1건만 갱신(app.ts).

**부수 효과**: dist orphan 12 files cleanup. C105 (FX-REQ-660, S329 등록)을 F593으로 승격(task-promotion 기준 2 + 3 충족).

## 사전 측정 (S329, 2026-05-04 22:30 KST — 본 세션)

### 처리 대상 closure 3 files + callers 분포

| 파일 | 외부 callers | 내부 callers | 처리 |
|------|--------------|--------------|------|
| `services/entity-registry.ts` (242L, EntityRegistry class) | **0** | routes/entities.ts (1) | mv → core/entity/services/ |
| `routes/entities.ts` (172L, OpenAPIHono 4 endpoints) | app.ts:40+182 (1) | services/entity-registry + schemas/entity (sibling) | mv → core/entity/routes/ |
| `schemas/entity.ts` (RegisterEntitySchema 등) | **0** | routes/entities.ts (1) | mv → core/entity/schemas/ |

**총 closure 3 files** (외부 callers 1건만 = app.ts mount). web/cli/test 사용 0건 (production endpoint mounted but unused — F491/F517 SSO 인프라 일부, D1 service_entities/entity_links 테이블은 유지).

### API paths (완전 유지)

```
GET  /api/entities          (search)
POST /api/entities          (register)
GET  /api/entities/{id}/graph
POST /api/entities/link
POST /api/entities/sync
```

routes/entities.ts 내부 path 패턴 `path: "/entities"` + app.ts `app.route("/api", entitiesRoute)` = 외부 paths 동일. mv 후에도 import path만 변경.

### 외부 callers 갱신 대상 (1건)

| 파일 | 현재 import | 신규 import | 비고 |
|------|-------------|-------------|------|
| `app.ts:40` | `import { entitiesRoute } from "./routes/entities.js"` | `import { entitiesRoute } from "./core/entity/routes/entities.js"` | mount path는 동일 (`app.route("/api", entitiesRoute)`) |

### 내부 sibling callers 갱신 (routes/entities.ts 내부 imports)

routes/entities.ts (mv 후 core/entity/routes/entities.ts) 내부:

| 현재 | 신규 | 비고 |
|------|------|------|
| `from "../services/entity-registry.js"` | `from "../services/entity-registry.js"` | sibling within core/entity/, **변경 없음** (path는 동일하지만 base가 바뀜) |
| `from "../schemas/entity.js"` | `from "../schemas/entity.js"` | sibling within core/entity/, **변경 없음** |
| `from "../schemas/common.js"` | `from "../../../schemas/common.js"` | cross-domain, depth 변경 (1→3 levels up) |
| `from "../env.js"` | `from "../../../env.js"` | cross-domain, depth 변경 |
| `from "../middleware/tenant.js"` | `from "../../../middleware/tenant.js"` | cross-domain, depth 변경 |

**3 cross-domain imports** = ESLint `no-cross-domain-import` 룰 측면에서는 `core/entity/` → `schemas/`, `env.js`, `middleware/`는 root 공통 모듈이라 위반 후보 (eslint-rules/만 검증되므로 lint pass — F591 패턴).

### 신규 도메인 디렉터리 구조

```
packages/api/src/core/entity/
├── routes/
│   └── entities.ts (← from src/routes/entities.ts)
├── services/
│   └── entity-registry.ts (← from src/services/entity-registry.ts)
└── schemas/
    └── entity.ts (← from src/schemas/entity.ts)
```

F588 `core/work/` 패턴 (routes/work.ts + services/work.service.ts + 직접 mount in app.ts) 동일.

### dist orphan 잔존 (S314 패턴 24회차)

```
packages/api/dist/services/entity-registry.{js,js.map,d.ts,d.ts.map}   # 4 files
packages/api/dist/routes/entities.{js,js.map,d.ts,d.ts.map}            # 4 files
packages/api/dist/schemas/entity.{js,js.map,d.ts,d.ts.map}             # 4 files
```

**총 12 files** (실측 ls 기준). autopilot 미인식 가능성 높음 → P-j numerical 강제, 수동 git rm 또는 build 재생성.

### services/ 루트 직속 .ts 변화

```
이전 (S329 F592 이후): 16 files
본 sprint 이후: 15 files (-1 = entity-registry mv)
```

**잔존 15 files**: conflict-detector / entity-registry → entity 이동 / event-bus / hybrid-sr-classifier / kv-cache / llm / merge-queue / pii-masker / pr-pipeline / service-proxy / shard-doc / spec-library / spec-parser / sr-classifier / sr-workflow-mapper / sse-manager — 후속 사이클 후보.

### routes/ + schemas/ 루트 변화

- `routes/`: entities.ts 1 → 0 (mv)
- `schemas/`: entity.ts 1 → 0 (mv)

### 인터뷰 2회 결정 (S329 압축 패턴, 23회차+1)

1. **1차** "C105 entity-registry 도메인 결정 작업 시작" (사용자 직접 지시)
2. **2차** 사전 측정 후 옵션 (c) 신규 core/entity/ 도메인 채택 + 간단 mv (F587/F588 선례) + 즉시 가동 (3개 의사결정 1 인터뷰 묶음)

C105 → F593 승격 자동 결정 (task-promotion 기준 2(3 files+) + 기준 3(도메인 신설 + 사용자 관찰 가능 endpoint)).

## 범위

### 코드 변경

#### (a) 신규 디렉터리 생성 + git mv 3 files

```bash
mkdir -p packages/api/src/core/entity/routes
mkdir -p packages/api/src/core/entity/services
mkdir -p packages/api/src/core/entity/schemas

git mv packages/api/src/routes/entities.ts packages/api/src/core/entity/routes/entities.ts
git mv packages/api/src/services/entity-registry.ts packages/api/src/core/entity/services/entity-registry.ts
git mv packages/api/src/schemas/entity.ts packages/api/src/core/entity/schemas/entity.ts
```

#### (b) routes/entities.ts cross-domain import depth 갱신 (3건)

mv 후 `core/entity/routes/entities.ts` 내부:
- `from "../schemas/common.js"` → `from "../../../schemas/common.js"`
- `from "../env.js"` → `from "../../../env.js"`
- `from "../middleware/tenant.js"` → `from "../../../middleware/tenant.js"`

(sibling imports `../services/entity-registry.js`, `../schemas/entity.js`는 변경 없음 — sibling 디렉터리 동일)

#### (c) app.ts import 1건 갱신

- `app.ts:40` — `from "./routes/entities.js"` → `from "./core/entity/routes/entities.js"`
- `app.ts:182` — `app.route("/api", entitiesRoute)` (mount path 동일, 변경 없음)

#### (d) dist orphan cleanup (S314 패턴 24회차)

```bash
rm -rf packages/api/dist/services/entity-registry.{js,js.map,d.ts,d.ts.map}
rm -rf packages/api/dist/routes/entities.{js,js.map,d.ts,d.ts.map}
rm -rf packages/api/dist/schemas/entity.{js,js.map,d.ts,d.ts.map}
# 또는 build 재생성
```

### 검증

#### (e) packages/api typecheck + lint + tests 회귀 GREEN

- turbo typecheck 19/19 + 2308+ tests passed
- lint cross-domain 룰 위반 19 → **22건** 추정 (3 cross-domain imports 추가, lint script 스코프 한계로 catch 안됨, pass 보장 — F591 패턴)

## OBSERVED Phase Exit P-a~P-l Smoke Reality 12항

### F593 핵심 검증 (P-a~P-d)

| ID | 명세 | 측정 명령 | 기대값 |
|----|------|----------|--------|
| **P-a** | services/ 루트 entity-registry + routes/ entities + schemas/ entity 모두 사라짐 | `find packages/api/src/services -maxdepth 1 -name "entity-registry*" \| wc -l` + `find packages/api/src/routes -maxdepth 1 -name "entities*" \| wc -l` + `find packages/api/src/schemas -maxdepth 1 -name "entity.ts" \| wc -l` | **0 + 0 + 0** |
| **P-b** | core/entity/ closure 3 files 신설 | `find packages/api/src/core/entity -name "*.ts" \| wc -l` | **3** (routes/entities.ts + services/entity-registry.ts + schemas/entity.ts) |
| **P-c** | services/ 루트 직속 .ts 15 files | `find packages/api/src/services -maxdepth 1 -name "*.ts" \| wc -l` | **15** (16-1) |
| **P-d** | 외부 callers 잔존 OLD import 0건 | `grep -rn "from .*\\.\\./routes/entities\\|from .*\\.\\./services/entity-registry\\|from .*\\.\\./schemas/entity\\b" packages/api/src --include="*.ts"` | **0건** (1 caller in app.ts NEW path) |

### 검증 인프라 (P-e~P-g)

| ID | 명세 | 기대값 |
|----|------|--------|
| **P-e** | typecheck + tests GREEN | turbo typecheck 19/19 + tests passed |
| **P-f** | dual_ai_reviews sprint 339 자동 INSERT ≥ 1건 | 누적 ≥ **29건** (S329 28 → 29+, hook **14 sprint 연속** 검증) |
| **P-g** | C103 fallback hook 자동 trigger 확증 | `save-dual-review-339.log` 생성, verdict 기록 |

### 회귀 검증 (P-h: 8 항)

| ID | 명세 | 기대값 |
|----|------|--------|
| **P-h-1** | F583 services/agent = 0 유지 | `find packages/api/src/services/agent -type f \| wc -l` = 0 |
| **P-h-2** | F584 model-router core/agent/services 위치 | = 1 |
| **P-h-3** | F585 core/agent/services .ts files 유지 | ≥ 7 (실측 41) |
| **P-h-4** | F587 core/work/services/traceability 유지 | = 1 |
| **P-h-5** | F588 core/work/ closure files 유지 | ≥ 5 |
| **P-h-6** | F589 core/harness/services/worktree-manager 유지 | = 1 |
| **P-h-7** | F590 core/discovery/services/pm-skills-guide 유지 | = 1 |
| **P-h-8** | F591 core/offering/services/ prd*+prototype* files 유지 | = 5 |
| **P-h-9** | F592 core/discovery/services/methodology-types 유지 | = 1 |

### Match Rate (P-i)

| ID | 명세 | 기대값 |
|----|------|--------|
| **P-i** | autopilot Match Rate ≥ 90% | semantic Match 100% 목표 (3 files mv + 4 imports 갱신, F584~F592 패턴 재현 24회차) |

### Bonus 검증 (P-j: dist orphan)

| ID | 명세 | 측정 명령 | 기대값 |
|----|------|----------|--------|
| **P-j** | dist orphan entity-registry*+entities*+entity* cleanup | `find packages/api/dist/services -name "entity-registry*" \| wc -l` + `find packages/api/dist/routes -name "entities*" \| wc -l` + `find packages/api/dist/schemas -name "entity.*" \| wc -l` | **0 + 0 + 0** (12 files cleanup, S326~S329 패턴 24회차 일관 재현 예상) |

### MSA 룰 위반 변화 (P-k)

| ID | 명세 | 측정 명령 | 기대값 |
|----|------|----------|--------|
| **P-k** | MSA cross-domain 위반 19→22 (3건 추가, grandfathered 의식적 인정) | eslint-rules/ 직접 lint OR pnpm lint scope 검증 | **22** (19 + 3 신규 entity → schemas/common, env, middleware/tenant) |

### Production smoke (P-l: NEW)

| ID | 명세 | 기대값 |
|----|------|--------|
| **P-l** | API /api/entities endpoint 401 (auth 정상) | curl 401 응답 (mounted 정상 = mount path 동일) |

## 근본 원칙

- **Source-First Fix Order**: src 변경 → dist는 자동 따라옴
- **F587/F588 간단 mv 패턴 재현**: strict MSA sub-app 강제 안 함, API paths 완전 동일 유지
- **신규 도메인 closure 신설**: routes + services + schemas 3 files 동시 이전 (F588 work closure 직접 모델)
- **C105 → F593 승격**: task-promotion 기준 2(3 files+) + 기준 3(API endpoint + 도메인 신설) 충족
- **D1 service_entities/entity_links 테이블 유지**: production 데이터 orphan 회피, endpoint mount path 동일

## 전제

- F592 ✅ (services/ 18→16, dual_ai_reviews 28 + hook 13 sprint 연속)
- F590/F591 ✅ (옵션 A1/D-a 패턴 정착화)
- F588 ✅ (core/work/ closure 5 files — 본 sprint 직접 모델)
- F587 ✅ (dead code + 도메인 이동 + 신설 패턴)
- C103 + C104 ✅ (13 sprint 연속 정상)
- C105 (FX-REQ-660, S329 등록) → 본 sprint에서 F593 승격으로 흡수

## 예상 시간

**~7~10분** (autopilot, F584 7분 8초 + F590 7분 37초 + F592 9분 19초 패턴 기반). 3 files mv + 4 imports 갱신 + dist cleanup + 회귀 검증.

## Risk

| Risk | 완화 |
|------|------|
| API paths 변경 (production endpoint 끊김) | mount path `app.route("/api", entitiesRoute)` 동일 유지 + P-l curl 401 검증 |
| routes/entities.ts depth 변경 시 cross-domain import 누락 | autopilot grep + replace 일괄 처리 + P-e turbo typecheck GREEN 강제 |
| dist orphan 12 files autopilot 자동 인식 못 함 | P-j 강제 numerical로 catch → 수동 rm (S326~S329 패턴 24회차 일관 재현 예상) |
| autopilot이 D1 migration 0017 손대거나 service_entities 테이블 영향 | 본 plan SCOPE LOCK (코드 mv only, D1 schema 무관) + P-l smoke 검증 |
| ESLint 룰 위반 +3 건 grandfathered 양산 | 본 plan §3 P-k 명시 + MSA 룰 강제 교정 별건 F-item 후속 사이클 권고 |

## 다음 사이클 후보

- **F594 spec-* 묶음** → core/spec/services/ 신규 도메인 (P2, spec-parser 8 + spec-library 2 callers, cross-domain 5 도메인 grandfathered +3~5 위험)
- **F595 sr-* 묶음** → core/sr/services/ 신규 또는 fx-modules 이전 (P2~P3, 3 files)
- **F596 infra cluster** sse-manager(14)+kv-cache(12)+event-bus(6) cross-domain infra (P3)
- **MSA 룰 강제 교정 F-item** (P3~P4) — `pnpm lint` script 스코프 src/ 전체 + grandfathered 22건 해소 plan
- Phase 47 GAP-3 27 stale proposals 검토 루프 (P2 F-track)
- 모델 A/B Opus 4.7 vs Sonnet 4.6 (P3 F-track)
- fx-discovery worker 404 환경 issue 별도 점검 (옵션 ~30분)
- AI Foundry Phase 1 W18+ D 액션 (별도 PRD 트랙, 5/15 회의 D-day)

## 참고

- F592 시드: `docs/01-plan/features/sprint-338.plan.md` (FX-PLAN-338) — 옵션 D-a 보수 2 files
- F591 시드: `docs/01-plan/features/sprint-337.plan.md` (FX-PLAN-337) — 옵션 A1 5 files
- F590 시드: `docs/01-plan/features/sprint-336.plan.md` (FX-PLAN-336) — 옵션 B dead+이동
- F588 시드: `docs/01-plan/features/sprint-334.plan.md` (FX-PLAN-334) — **core/work/ closure 직접 모델**
- F587 시드: `docs/01-plan/features/sprint-333.plan.md` (FX-PLAN-333) — 도메인 신설 시드
- MSA core/{domain}/ 룰: `CLAUDE.md` MSA 원칙 섹션 + `packages/api/src/eslint-rules/no-cross-domain-import.ts`
- C105 등록 (S329): SPEC.md C105 row → 본 sprint에서 ✅ 승격
- D1 service_entities/entity_links: `packages/api/src/db/migrations/0017_sso_and_entities.sql`
- S324~S329 인터뷰 2~4회 패턴: 사전 측정 → 옵션 결정 → plan → autopilot → OBSERVED
