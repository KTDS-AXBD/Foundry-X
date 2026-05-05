---
id: FX-PLAN-340
sprint: 340
feature: F595
req: FX-REQ-662
status: approved
date: 2026-05-05
---

# Sprint 340 Plan — F595: sr 도메인 신설 + closure 5 files (옵션 B, F593 entity 패턴 재현)

## 목표

**S330 F593(Sprint 339, PR #732 Match 100%, ~3분 42초 본 sprint 최단 기록 갱신) 후속.** services/ 잔존 15 files 중 sr-* 묶음(routes/sr.ts + schemas/sr.ts + services/sr-classifier + services/hybrid-sr-classifier + services/sr-workflow-mapper = closure 5 files)을 신규 `core/sr/` 도메인으로 통합 이전. F593 entity closure 패턴 (routes+services+schemas 통합) 재현 — 옵션 A 패턴 17회차 정착화 + sub-domain depth +2 자동 처리.

**핵심 원칙**: F593 closure 통합 패턴(strict MSA sub-app 강제 안 함). API path `/api/sr` 완전 동일 유지. cross-domain llm.ts 2건 의식적 인정(routes/sr 1 + hybrid-sr-classifier 1). closure 5 files라서 외부 callers 8건 갱신(app.ts 1 + tests 7).

**부수 효과**: dist orphan ~20 files cleanup. F594 spec-* 묶음은 사전 측정에서 callers 10건 + modules/portal cross-domain 분기 분포로 grandfathered +4 양산 위험 발견 → 다음 사이클로 보류 (인터뷰 2차 사용자 의식적 조정).

## 사전 측정 (S331, 2026-05-05 오전 KST — 본 세션)

### 처리 대상 closure 5 files + callers 분포

| 파일 | 외부 callers | 내부 imports | 처리 |
|------|--------------|--------------|------|
| `services/sr-classifier.ts` (`SrClassifier` class) | **2** (모두 tests) | `../schemas/sr` (type-only) | mv → core/sr/services/ |
| `services/hybrid-sr-classifier.ts` (`HybridSrClassifier` class) | **2** (routes/sr.ts:9 + test 1) | `./sr-classifier`, `./llm`, `../schemas/sr` (sibling/cross) | mv → core/sr/services/ |
| `services/sr-workflow-mapper.ts` (`SrWorkflowMapper` class) | **3** (routes/sr.ts:8 + tests 2) | `../schemas/sr` (type-only) | mv → core/sr/services/ |
| `routes/sr.ts` (156L Hono routes) | app.ts:41 (1) | `../schemas/sr` (sibling), `../services/sr-*` 3 (sibling), `../env`, `../middleware/tenant`, `../services/llm` (cross 3) | mv → core/sr/routes/ |
| `schemas/sr.ts` (zod-only, no internal deps) | **6** (5 internal sr-* sibling + 1 test) | (none, zod only) | mv → core/sr/schemas/ |

**총 closure 5 files** (외부 callers 8건 = app.ts mount 1 + tests 7). routes/sr.ts와 services 3 모두 schemas/sr를 sibling으로 import하므로 NEW path에서 자동 작동.

### API paths (완전 유지)

```
POST   /api/sr             (createSrRequest)
PATCH  /api/sr/{id}        (updateSrRequest)
GET    /api/sr             (listSrQuery)
POST   /api/sr/{id}/execute (executeSrRequest)
POST   /api/sr/{id}/feedback (srFeedbackRequest)
```

routes/sr.ts 내부 path 패턴 + app.ts `app.route("/api/sr", srRoute)` 또는 동등 mount = 외부 paths 동일. mv 후에도 import path만 변경.

### 외부 callers 갱신 대상 (8건)

| # | 파일 | 현재 import | 신규 import | 비고 |
|---|------|-------------|-------------|------|
| 1 | `app.ts:41` | `import { srRoute } from "./routes/sr.js"` | `import { srRoute } from "./core/sr/routes/sr.js"` | mount path 동일 |
| 2 | `__tests__/routes/sr.test.ts:3` | `from "../../services/sr-classifier.js"` | `from "../../core/sr/services/sr-classifier.js"` | test |
| 3 | `__tests__/routes/sr.test.ts:4` | `from "../../services/sr-workflow-mapper.js"` | `from "../../core/sr/services/sr-workflow-mapper.js"` | test |
| 4 | `__tests__/routes/sr.test.ts:5` | `from "../../schemas/sr.js"` | `from "../../core/sr/schemas/sr.js"` | test type-only |
| 5 | `__tests__/sr-classifier.test.ts:2` | `from "../services/sr-classifier.js"` | `from "../core/sr/services/sr-classifier.js"` | test |
| 6 | `__tests__/sr-workflow-mapper.test.ts:2` | `from "../services/sr-workflow-mapper.js"` | `from "../core/sr/services/sr-workflow-mapper.js"` | test |
| 7 | `__tests__/sr-workflow-mapper.test.ts:3` | `from "../schemas/sr.js"` | `from "../core/sr/schemas/sr.js"` | test type-only |
| 8 | `__tests__/hybrid-sr-classifier.test.ts:2` | `from "../services/hybrid-sr-classifier.js"` | `from "../core/sr/services/hybrid-sr-classifier.js"` | test |

### 내부 sibling/cross-domain depth 갱신

**routes/sr.ts (mv 후 core/sr/routes/sr.ts) 내부 imports**:

| 현재 | 신규 | 분류 |
|------|------|------|
| `from "hono"` | (그대로) | external |
| `from "../env.js"` | `from "../../../env.js"` | cross-domain depth +2 |
| `from "../middleware/tenant.js"` | `from "../../../middleware/tenant.js"` | cross-domain depth +2 |
| `from "../schemas/sr.js"` | `from "../schemas/sr.js"` | **sibling 동일** (NEW core/sr/schemas/) |
| `from "../services/sr-workflow-mapper.js"` | `from "../services/sr-workflow-mapper.js"` | **sibling 동일** (NEW core/sr/services/) |
| `from "../services/hybrid-sr-classifier.js"` | `from "../services/hybrid-sr-classifier.js"` | **sibling 동일** |
| `from "../services/llm.js"` | `from "../../../services/llm.js"` | **cross-domain depth +2 (llm.ts services/ 루트 잔존)** |

**services/hybrid-sr-classifier.ts (mv 후 core/sr/services/hybrid-sr-classifier.ts) 내부 imports**:

| 현재 | 신규 | 분류 |
|------|------|------|
| `from "./sr-classifier.js"` | `from "./sr-classifier.js"` | **sibling 동일** |
| `from "./llm.js"` | `from "../../../services/llm.js"` | **cross-domain depth +2** |
| `from "../schemas/sr.js"` | `from "../schemas/sr.js"` | **sibling 동일** (NEW core/sr/schemas/) |

**services/sr-classifier.ts + sr-workflow-mapper.ts (mv 후 core/sr/services/)**:

| 현재 | 신규 |
|------|------|
| `from "../schemas/sr.js"` (type-only) | `from "../schemas/sr.js"` (sibling 동일) |

**총 cross-domain depth 갱신 = 4건** (env 1 + middleware 1 + llm 2). 모두 NEW path 정확 적용 필요. autopilot이 F593 entity sprint에서 동일 패턴 정확 처리 입증 (~3분 42초).

### MSA cross-domain grandfathered 추가 (의식적 인정)

| 출발 | 목적 | 분류 | 새 추가 여부 |
|------|------|------|-------------|
| `core/sr/routes/sr.ts` | `services/llm.js` | cross-domain | **+1 신규** |
| `core/sr/services/hybrid-sr-classifier.ts` | `services/llm.js` | cross-domain | **+1 신규** |
| `core/sr/routes/sr.ts` | `env.js`, `middleware/tenant.js`, `schemas/common.js` | shared root (eslint-rules patterns에서는 cross로 안 잡힘 추정) | 0 |

**P-k 측정 예상**: 19→**21** (llm.ts cross +2건 의식적 인정). 단 autopilot의 측정 회피 패턴 일관 재현 시(F593 P-k 19 그대로 유지 사례) 19로 보존될 가능성 — acceptable variant.

**MSA 룰 강제 교정 별건 F-item 권고 유지** (F591/F592 4차 인터뷰 결정, S328~S329 누적): `pnpm lint` 스코프 src/ 전체 확장 + grandfathered 21건 해소 plan은 별 사이클.

### 신규 도메인 디렉터리 구조

```
packages/api/src/core/sr/
├── routes/
│   └── sr.ts (← from src/routes/sr.ts)
├── services/
│   ├── sr-classifier.ts (← from src/services/sr-classifier.ts)
│   ├── hybrid-sr-classifier.ts (← from src/services/hybrid-sr-classifier.ts)
│   └── sr-workflow-mapper.ts (← from src/services/sr-workflow-mapper.ts)
└── schemas/
    └── sr.ts (← from src/schemas/sr.ts)
```

F593 `core/entity/` 패턴 (routes+services+schemas 통합) 재현. F588 `core/work/` 패턴 확장.

### dist orphan 잔존 (S314 패턴 25회차)

```
packages/api/dist/routes/sr.{js,js.map,d.ts,d.ts.map}                         # 4 files
packages/api/dist/services/sr-classifier.{js,js.map,d.ts,d.ts.map}            # 4 files
packages/api/dist/services/hybrid-sr-classifier.{js,js.map,d.ts,d.ts.map}     # 4 files
packages/api/dist/services/sr-workflow-mapper.{js,js.map,d.ts,d.ts.map}       # 4 files
packages/api/dist/schemas/sr.{js,js.map,d.ts,d.ts.map}                        # 4 files
```

**총 ~20 files** (실측 ls 기준). autopilot 미인식 가능성 높음 → P-j numerical 강제, 수동 rm 또는 build 재생성.

### services/ + routes/ + schemas/ 루트 변화

```
services/ 루트 .ts: 15 → 12 (-3 = sr-classifier + hybrid-sr-classifier + sr-workflow-mapper mv)
routes/ 루트: -1 (sr.ts mv)
schemas/ 루트: -1 (sr.ts mv)
```

**잔존 services/ 12 files**: conflict-detector / event-bus / kv-cache / llm / merge-queue / pii-masker / pr-pipeline / service-proxy / shard-doc / spec-library / spec-parser / sse-manager — 후속 사이클 후보(F594 spec-* / F596 infra cluster sse-manager+kv-cache+event-bus / llm.ts 별 도메인 결정).

## 범위

### (a) 디렉터리 + git mv 5 files

```bash
mkdir -p packages/api/src/core/sr/{routes,services,schemas}

git mv packages/api/src/routes/sr.ts packages/api/src/core/sr/routes/sr.ts
git mv packages/api/src/services/sr-classifier.ts packages/api/src/core/sr/services/sr-classifier.ts
git mv packages/api/src/services/hybrid-sr-classifier.ts packages/api/src/core/sr/services/hybrid-sr-classifier.ts
git mv packages/api/src/services/sr-workflow-mapper.ts packages/api/src/core/sr/services/sr-workflow-mapper.ts
git mv packages/api/src/schemas/sr.ts packages/api/src/core/sr/schemas/sr.ts
```

### (b) routes/sr.ts cross-domain depth 갱신 (3건)

```diff
- import type { Env } from "../env.js";
+ import type { Env } from "../../../env.js";

- import type { TenantVariables } from "../middleware/tenant.js";
+ import type { TenantVariables } from "../../../middleware/tenant.js";

- import { LLMService } from "../services/llm.js";
+ import { LLMService } from "../../../services/llm.js";
```

sibling imports 4건 (`../schemas/sr`, `../services/sr-workflow-mapper`, `../services/hybrid-sr-classifier`) 동일 유지 (NEW path에서 자동 sibling).

### (c) services/hybrid-sr-classifier.ts 내부 imports 갱신 (1건)

```diff
- import { LLMService } from "./llm.js";
+ import { LLMService } from "../../../services/llm.js";
```

`./sr-classifier.js`, `../schemas/sr.js` 동일 유지.

### (d) app.ts import 갱신

```diff
- import { srRoute } from "./routes/sr.js";
+ import { srRoute } from "./core/sr/routes/sr.js";
```

mount path 동일 (변경 없음).

### (e) 외부 tests 7건 갱신

위 표 #2~#8 참고. 모든 test 파일에서 `services/sr-*` → `core/sr/services/sr-*`, `schemas/sr` → `core/sr/schemas/sr` 치환.

### (f) dist orphan cleanup (~20 files)

```bash
rm -rf packages/api/dist/routes/sr.{js,js.map,d.ts,d.ts.map}
rm -rf packages/api/dist/services/sr-classifier.{js,js.map,d.ts,d.ts.map}
rm -rf packages/api/dist/services/hybrid-sr-classifier.{js,js.map,d.ts,d.ts.map}
rm -rf packages/api/dist/services/sr-workflow-mapper.{js,js.map,d.ts,d.ts.map}
rm -rf packages/api/dist/schemas/sr.{js,js.map,d.ts,d.ts.map}
```

(autopilot 미인식 가능성 높음, P-j numerical 강제로 catch)

### (g) packages/api typecheck + tests 회귀 GREEN

```bash
cd packages/api
pnpm typecheck     # GREEN
pnpm test          # 모든 sr-* tests PASS (이전과 동일)
```

## Phase Exit P-a~P-l Smoke Reality 12항

| # | 항목 | 측정 방법 | PASS 기준 |
|---|------|-----------|----------|
| **P-a** | services/+routes/+schemas/ 루트 sr* 0 | `find packages/api/src/{services,routes,schemas} -maxdepth 1 -name "sr*.ts" \| wc -l` (3 dirs sum) | **0+0+0** |
| **P-b** | core/sr/ closure files 5 | `find packages/api/src/core/sr -name "*.ts" \| wc -l` | **5** (routes/sr + services 3 + schemas/sr) |
| **P-c** | services/ 루트 .ts 12 | `find packages/api/src/services -maxdepth 1 -name "*.ts" \| wc -l` | **12** (15-3) |
| **P-d** | 외부 callers OLD import 0 | `grep -rn "services/sr-\|routes/sr\|schemas/sr" packages/api/src --include='*.ts' \| grep -v 'core/sr/'` | **0** (8 callers NEW path) |
| **P-e** | typecheck + tests GREEN | `cd packages/api && pnpm typecheck && pnpm test` | exit 0 + sr-* tests PASS |
| **P-f** | dual_ai_reviews D1 INSERT ≥ 1 | `wrangler d1 execute foundry-x-db --remote --command "SELECT COUNT(*) FROM dual_ai_reviews WHERE sprint=340"` | **≥ 1** (누적 ≥ 30) |
| **P-g** | C103 fallback hook 자동 trigger | `ls /tmp/save-dual-review-340.log` 또는 PostToolUse hook 로그 | exists + verdict 기록 |
| **P-h** | F583/F584/F585/F587/F588/F589/F590/F591/F592/F593 회귀 0 | 각 F-item 핵심 측정 (services/agent=0, F584 model-router=1, F585 dual_ai_reviews 41, F587 traceability=1, F588 core/work=5, F589 worktree-manager=1, F590 pm-skills-guide=1, F591 prd/prototype=5, F592 entity-sync=0+methodology-types=1, F593 entity closure=3) | 10/10 PASS |
| **P-i** | Match ≥ 90% (semantic 100% 목표) | autopilot self-evaluation | **≥ 90%** |
| **P-j** | dist orphan = 0 | `find packages/api/dist -name "sr-*.js" -o -name "routes/sr.js" -o -name "schemas/sr.js"` (cleanup 후) | **0** files |
| **P-k** | MSA cross-domain 19→21 (의식적 인정) | `grep -rn "from.*services/llm" packages/api/src/core/sr/` | **2** new (routes/sr + hybrid-sr) — autopilot이 19 보존 시 acceptable variant |
| **P-l** | API /api/sr 401 (auth 정상) | `curl -s -o /dev/null -w "%{http_code}" https://foundry-x-api.ktds-axbd.workers.dev/api/sr` | **401** (auth 보호 정상, mount path 동일 = endpoint 살아있음) |

## 전제 조건

- F593 ✅ MERGED (PR #732, S330) — entity 도메인 신설 + closure 3 files 완결
- C103+C104 ✅ (14 sprint 연속 정상) — dual_ai_reviews hook + .dev.vars 자동 sync
- C105 ✅ (F593으로 승격 완결) — entity-registry 도메인 결정 종결

## 구현 순서 (autopilot)

1. **WT 생성**: `bash -i -c "sprint 340"` (Foundry-X-340)
2. **TDD Red Phase**: skip (단순 git mv + import path 갱신, 신규 로직 0건)
3. **Green Phase**: 위 (a)~(g) 순차 실행
4. **Verify**: typecheck + test GREEN + dist orphan cleanup
5. **Commit**: `feat(api): F595 — core/sr/ 도메인 신설, closure 5 files mv` 단일 커밋
6. **PR**: gh pr create + squash merge auto
7. **Phase Exit**: P-a~P-l 12항 모두 ≥ 90% PASS 확인 (P-k acceptable variant 19 vs 21)

## 후속 사이클 후보

- **F594** spec-* 묶음 → core/spec/ (P2~P3, sprint 341 후보) — spec-parser 8 callers + spec-library 2 callers + modules/portal 2 grandfathered (인터뷰 4차 결정 필요)
- **F596** infra cluster sse-manager(14)+kv-cache(12)+event-bus(6) cross-domain infra (P3~P4)
- **MSA 룰 강제 교정 F-item** (P3~P4) — `pnpm lint` 스코프 src/ 전체 + grandfathered 21건 해소 (S328~S331 누적 권고)
- **llm.ts 별 도메인 결정** (P3) — services/ 루트 잔존, 다수 cross-domain caller
- Phase 47 GAP-3 27 stale proposals 검토 루프 (P2 F-track)
- 모델 A/B Opus 4.7 vs Sonnet 4.6 (P3 F-track)
- fx-discovery worker 404 환경 issue 별 점검 (옵션 ~30분)
- **AI Foundry W18+ D 액션** (5/15 회의 D-day, 사용자 직접 PM)

## 인사이트

- **인터뷰 3회 패턴 25회차**: 1차 메인 결정 (F594 vs F595) → 2차 사전 측정 후 옵션 A 17회차 정착에 더 깨끗한 F595 (7 callers + sibling) → 3차 closure 결정 옵션 B (F593 entity 패턴 재현)
- **옵션 B closure 5 files** = F593 entity 패턴 재현 — sub-domain depth +2 자동 처리, sibling imports 자동 보존, 외부 callers 8건 단순 path 치환
- autopilot 예상 ~9분 (F593 3분 42초보다 +5분 = 5 files 묶음 + 4 cross-domain depth + 8 callers)
- llm.ts 별 도메인 결정은 본 sprint 외 — services/ 루트 잔존 12 files 중 다수 cross-domain caller 보유 (별 사이클 후보)
- MSA grandfathered +2 의식적 인정 패턴 일관 (S328 F591 +13 / S329 F592 +0 / S330 F593 +0 / S331 F595 +2 예상)
