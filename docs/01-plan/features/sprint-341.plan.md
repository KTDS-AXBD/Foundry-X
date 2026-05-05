---
id: FX-PLAN-341
sprint: 341
feature: F594
req: FX-REQ-663
status: approved
date: 2026-05-05
---

# Sprint 341 Plan — F594: spec 도메인 신설 + closure 6 files (옵션 A, F593+F595 패턴 재현)

## 목표

**S331 F595(Sprint 340, PR #734 Match 100%, ~4분 11초 본 sprint 두 번째 빠른 기록) 후속.** services/ 잔존 12 files 중 spec-* 묶음(routes/spec + routes/spec-library + services/spec-parser + services/spec-library + schemas/spec + schemas/spec-library = closure 6 files)을 신규 `core/spec/` 도메인으로 통합 이전. F593 entity 3 files / F595 sr 5 files closure 통합 패턴 직접 재현 — 옵션 A 18회차 정착화 + sub-domain depth +2 자동 처리 + closure 통합 mode 안정 정착.

**핵심 원칙**: F593+F595 closure 통합 패턴(strict MSA sub-app 강제 안 함). API path `/api/spec/*` + `/api/spec-library/*` 완전 동일 유지. **modules/portal grandfathered 2건 (reconciliation.ts services + routes) depth 갱신만 + 신규 grandfathered 의식적 인정 ~+8건** (routes/spec 6 + routes/spec-library 2). MSA 룰 강제 교정 별건 F-item 권고 누적 (현재 21 → 29 예상).

**부수 효과**: dist orphan ~24 files cleanup. F596 infra cluster (sse-manager+kv-cache+event-bus)는 다음 사이클 후보 유지.

## 사전 측정 (S331, 2026-05-05 오후 KST — 본 세션)

### 처리 대상 closure 6 files + callers 분포

| 파일 | 외부 callers | 내부 deps | 처리 |
|------|--------------|-----------|------|
| `services/spec-parser.ts` (3 export functions: parseSpecRequirements, parseStatusEmoji, parseSpecDeltas) | **8** (scheduled 1 + portal services 1 + portal routes 1 + core/harness/health-calc 1 + routes/requirements 1 + routes/spec(closure) 1 + tests 2) | (none, 순수 parser) | mv → core/spec/services/ |
| `services/spec-library.ts` (`SpecLibraryService` class) | **1** (test only) | (none, 순수 D1 service) | mv → core/spec/services/ |
| `routes/spec.ts` (OpenAPIHono routes, F227+F505 spec-pipeline) | app.ts:174 (1) | `../schemas/spec` (sibling closure), `../services/spec-parser` (sibling closure), `../services/llm` (cross), `../services/conflict-detector` (cross), `../services/kv-cache` (cross), `../schemas/common` (cross), `../modules/portal/services/github` (cross), `../env` (cross) | mv → core/spec/routes/ |
| `routes/spec-library.ts` (OpenAPIHono CRUD routes) | app.ts:237 (1) | `../schemas/spec-library` (sibling closure), `../services/spec-library` (sibling closure), `../env` (cross), `../middleware/tenant` (cross) | mv → core/spec/routes/ |
| `schemas/spec.ts` (zod-only, no internal deps) | (closure 내부만) | (none, zod only) | mv → core/spec/schemas/ |
| `schemas/spec-library.ts` (zod-only, no internal deps) | (closure 내부만) | (none, zod only) | mv → core/spec/schemas/ |

**총 closure 6 files** (외부 callers 7건 = app.ts mount 2 + scheduled 1 + portal 2 grandfathered + core/harness 1 + routes/requirements 1 + tests 3). routes/spec ↔ services/spec-parser ↔ schemas/spec, routes/spec-library ↔ services/spec-library ↔ schemas/spec-library = 모두 closure 안 sibling NEW path 자동 작동.

### API paths (완전 유지)

```
POST   /api/spec/generate            (NL→Spec)
POST   /api/spec/conflicts           (Conflict detect)
GET    /api/spec/cache               (KV cache snapshot)
... (routes/spec.ts 전체 endpoints)
POST   /api/spec-library             (CRUD create)
GET    /api/spec-library             (list)
GET    /api/spec-library/{id}        (read)
PATCH  /api/spec-library/{id}        (update)
DELETE /api/spec-library/{id}        (delete)
```

app.ts `app.route("/api", specRoute)` + `app.route("/api", specLibraryRoute)` mount 동일 유지.

### 외부 callers 갱신 대상 (10건)

| # | 파일 | 현재 import | 신규 import | 비고 |
|---|------|-------------|-------------|------|
| 1 | `app.ts:38` | `from "./routes/spec.js"` | `from "./core/spec/routes/spec.js"` | mount path 동일 |
| 2 | `app.ts:43` | `from "./routes/spec-library.js"` | `from "./core/spec/routes/spec-library.js"` | mount path 동일 |
| 3 | `scheduled.ts:5` | `from "./services/spec-parser.js"` | `from "./core/spec/services/spec-parser.js"` | cross-domain 1건 신규 |
| 4 | `core/harness/services/health-calc.ts:4` | `from "../../../services/spec-parser.js"` | `from "../../../core/spec/services/spec-parser.js"` | core→core depth 동일 |
| 5 | `routes/requirements.ts:17` | `from "../services/spec-parser.js"` | `from "../core/spec/services/spec-parser.js"` | cross-domain 1건 신규 |
| 6 | `modules/portal/services/reconciliation.ts:3` | `from "../../../services/spec-parser.js"` | `from "../../../core/spec/services/spec-parser.js"` | **기존 grandfathered, depth 갱신만** |
| 7 | `modules/portal/routes/reconciliation.ts:12` | `from "../../../services/spec-parser.js"` | `from "../../../core/spec/services/spec-parser.js"` | **기존 grandfathered, depth 갱신만** |
| 8 | `__tests__/services/spec-parser.test.ts:5` | `from "../../services/spec-parser.js"` | `from "../../core/spec/services/spec-parser.js"` | test |
| 9 | `__tests__/spec-parser-status.test.ts:12` | `from "../services/spec-parser.js"` | `from "../core/spec/services/spec-parser.js"` | test |
| 10 | `__tests__/spec-library.test.ts:3` | `from "../services/spec-library.js"` | `from "../core/spec/services/spec-library.js"` | test |

### 내부 sibling/cross-domain depth 갱신

**routes/spec.ts (mv 후 core/spec/routes/spec.ts) 내부 imports**:

| 현재 | 신규 | 분류 |
|------|------|------|
| `from "../schemas/spec.js"` | `from "../schemas/spec.js"` | **sibling 동일** (NEW core/spec/schemas/) |
| `from "../services/spec-parser.js"` | `from "../services/spec-parser.js"` | **sibling 동일** (NEW core/spec/services/) |
| `from "../services/llm.js"` | `from "../../../services/llm.js"` | cross-domain depth +2 (신규 grandfathered) |
| `from "../services/conflict-detector.js"` | `from "../../../services/conflict-detector.js"` | cross-domain depth +2 (신규 grandfathered) |
| `from "../services/kv-cache.js"` | `from "../../../services/kv-cache.js"` | cross-domain depth +2 (신규 grandfathered) |
| `from "../schemas/common.js"` | `from "../../../schemas/common.js"` | cross-domain depth +2 (신규 grandfathered) |
| `from "../modules/portal/services/github.js"` | `from "../../../modules/portal/services/github.js"` | cross-domain depth +2 (신규 grandfathered) |
| `from "../env.js"` | `from "../../../env.js"` | cross-domain depth +2 (신규 grandfathered) |

**routes/spec-library.ts (mv 후 core/spec/routes/spec-library.ts) 내부 imports**:

| 현재 | 신규 | 분류 |
|------|------|------|
| `from "../schemas/spec-library.js"` | `from "../schemas/spec-library.js"` | **sibling 동일** |
| `from "../services/spec-library.js"` | `from "../services/spec-library.js"` | **sibling 동일** |
| `from "../env.js"` | `from "../../../env.js"` | cross-domain depth +2 (신규 grandfathered) |
| `from "../middleware/tenant.js"` | `from "../../../middleware/tenant.js"` | cross-domain depth +2 (신규 grandfathered) |

**services/spec-parser.ts + services/spec-library.ts + schemas/spec.ts + schemas/spec-library.ts**: 외부 deps 0건 (모두 zod-only 또는 순수 파싱) — depth 영향 없음.

**신규 grandfathered 추가 ~8건** (routes/spec 6 + routes/spec-library 2). modules/portal 2건은 기존 grandfathered → depth만 갱신 (룰 카운트 불변). MSA cross-domain 21 → ~29 예상.

## 인터뷰 패턴 (S331, 26회차)

| # | 질문 | 사용자 답변 |
|---|------|-------------|
| 1 | 다음 사이클 메인 결정 (F594/F596/AI Foundry/MSA 룰) | F594 spec-* 묶음 채택 |
| 2 | 작업 모드 (사전 측정+인터뷰+autopilot) | 정착화 패턴 채택 |
| 3 | closure 범위 (옵션 A 6 files / B 4 files / C micro 3 / D + portal 정리) | 옵션 A 6 files 일괄 |
| 4 | 절차 (한 번에 진행 / 분할) | 한 번에 진행 |

**결정 정착화**: F593(3 files) + F595(5 files) → F594(6 files) 점진적 closure 통합 mode 정착화 18회차. modules/portal grandfathered 의식적 인정(별 sprint 도메인 결정 deferred).

## 범위

(a) 신규 디렉터리 `core/spec/{routes,services,schemas}/` 생성
(b) 6 files git mv:
   - `routes/spec.ts` → `core/spec/routes/spec.ts`
   - `routes/spec-library.ts` → `core/spec/routes/spec-library.ts`
   - `services/spec-parser.ts` → `core/spec/services/spec-parser.ts`
   - `services/spec-library.ts` → `core/spec/services/spec-library.ts`
   - `schemas/spec.ts` → `core/spec/schemas/spec.ts`
   - `schemas/spec-library.ts` → `core/spec/schemas/spec-library.ts`
(c) routes/spec.ts cross-domain depth 갱신 6건 (env, common, llm, conflict-detector, kv-cache, modules/portal/github)
(d) routes/spec-library.ts cross-domain depth 갱신 2건 (env, middleware/tenant)
(e) sibling imports closure 안 자동 (NEW path 동일)
(f) app.ts import 2건 갱신 (specRoute + specLibraryRoute)
(g) 외부 callers 8건 path 갱신 (scheduled, health-calc, requirements, portal 2 depth, tests 3)
(h) **dist orphan cleanup** — `rm -rf packages/api/dist/{routes/spec,routes/spec-library,services/spec-parser,services/spec-library,schemas/spec,schemas/spec-library}.{js,js.map,d.ts,d.ts.map}` (~24 files, S314 패턴 26회차)
(i) packages/api typecheck + tests 회귀 GREEN

## Phase Exit P-a~P-l Smoke Reality 12항

| # | 항목 | 측정 | 목표 |
|---|------|------|------|
| P-a | services/+routes/+schemas/ 루트 spec*=0 | `find` count | **0+0+0** |
| P-b | core/spec/ closure files | `find core/spec` count | **6** (routes 2 + services 2 + schemas 2 모두 git rename) |
| P-c | services/ 루트 .ts | `find services -maxdepth 1` count | **10** (12-2) |
| P-d | 외부 callers OLD import | grep `from.*services/spec-` 또는 `from.*schemas/spec` | **0** (8 callers NEW path) |
| P-e | typecheck + test GREEN | CI green | ✅ |
| P-f | dual_ai_reviews D1 누적 | sprint 341 자동 INSERT ≥ 1건 | **≥31** (30 → 31+) |
| P-g | C103 fallback hook 자동 trigger | `save-dual-review-341.log` 또는 P-f INSERT | ✅ |
| P-h | 회귀 11항 (F583~F595) | 각각 grep count | F583=0 / F584=1 / F585=8 / F587=1 / F588=5 / F589=1 / F590=1 / F591=10 / F592=1 / F593=3 / F595=5 |
| P-i | autopilot Match | self-eval | ≥ 90% (semantic 100% 목표) |
| P-j | dist orphan = 0 | `ls dist/{routes,services,schemas}/spec*` | **24→0** (autopilot 미인식 수동 cleanup S331 패턴 26회차 일관 재현 가능) |
| P-k | MSA cross-domain | grep cross-domain count | **21 → ~29** (신규 grandfathered +8: routes/spec 6 + routes/spec-library 2 의식적 인정) |
| P-l | API endpoint 살아있음 | `curl /api/spec` + `curl /api/spec-library` | **401** (auth 정상, mount path 동일) |

**전제**: F595 ✅, C103+C104 ✅ (15 sprint 연속 정상)

**MSA 룰 강제 교정 별건 F-item 권고 유지**: 본 sprint 후 누적 ~29 grandfathered → lint script 스코프 src/ 전체 확장 + grandfathered 일괄 해소 별건 F-item 압력 더 커짐.

## 위험 + 완화

| 위험 | 완화 |
|------|------|
| routes/spec.ts cross-domain 6건이 가장 많음 → depth 오류 위험 | autopilot이 cross-domain depth 정확 적용 (F593+F595 패턴 재현). OBSERVED P-d로 검증 |
| modules/portal grandfathered 2건 depth 누락 | autopilot이 OLD `../../../services/spec-parser` → NEW `../../../core/spec/services/spec-parser` 자동 갱신. P-d 검증 |
| KV cache 초기화 / spec generation pipeline 영향 | mount path 동일 유지 + import 갱신만이라 production 영향 0. P-l 401 확증 |
| dist orphan 24 files autopilot 미인식 (S326~S331 패턴 26회차) | 수동 `rm -rf` cleanup (gitignored, production 무관) |

## 다음 사이클 후보

- F596 infra cluster sse-manager+kv-cache+event-bus (P3, cross-domain 영향 가장 큼)
- llm.ts 별 도메인 결정 (P3, services/ 루트 잔존, 다수 cross-domain caller)
- **MSA 룰 강제 교정 F-item** (P3~P4, lint script 스코프 src/ 전체 확장 + grandfathered ~29건 해소) — 누적 압력 정점
- Phase 47 GAP-3 27 stale proposals
- 모델 A/B Opus 4.7 vs Sonnet 4.6
- fx-discovery 404 환경 issue
- **AI Foundry W18+ D 액션 (5/15 D-day, 사용자 직접 PM)**
