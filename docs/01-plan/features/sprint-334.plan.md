---
id: FX-PLAN-334
sprint: 334
feature: F588
req: FX-REQ-655
status: approved
date: 2026-05-04
---

# Sprint 334 Plan — F588: work 도메인 본격 분리 (P1)

## 목표

**F587(Sprint 333, PR #720 Match 100%, ~8분 14초) 시드 후속.** F587에서 `core/work/services/traceability.service.ts` 1 file을 work 도메인 신설 시드로 깔아놓은 위에, **routes/work + services/work.{service,kg.service}** 본격 분리. work 도메인을 closure로 완성한다.

**핵심 원칙**: F584/F585/F587 옵션 A 도메인 이동 패턴 19회차 정착화. `core/work/` 디렉토리에 routes 2 + services 3(F587 시드 1 + 본 sprint 2 = 3) 구성. 표면 충족 함정 19회차 회피용 P-a~P-i 9항 numerical 강제.

**부수 효과**: `services/worktree-manager.ts`는 work 도메인이 아닌 **harness/agent 도메인** 사용처(`core/agent/services/agent-orchestrator.ts` + `core/harness/services/auto-rebase.ts`)이라 본 sprint 범위 외 — F589+ 별도 검토. work 도메인이 깔끔하게 self-contained closure로 정착되며 후속 logger/llm/methodology 도메인 정리의 패턴 제공.

## 사전 측정 (S325, 2026-05-04)

### 4 files 분류

| 파일 | 크기 | api/src 내부 callers | 외부(타 패키지) callers | 분류 |
|------|------|------|------|------|
| `routes/work.ts` (workRoute) | — | **app.ts mount 1건** | 0 | **work routes 이동** |
| `routes/work-public.ts` (workPublicRoute) | — | **app.ts mount 1건** | 0 | **work routes 이동 (공개)** |
| `services/work.service.ts` | 21907B | **4건** (routes/work.ts + routes/work-public.ts + __tests__/work.service.test.ts + __tests__/work-sessions.test.ts) | 0 | **work services 이동** |
| `services/work-kg.service.ts` | 9547B | **3건** (routes/work.ts + routes/work-public.ts + __tests__/work-kg.service.test.ts) | 0 | **work services 이동** |

**합 callers 7건 (api/src 내부) + app.ts mount 2건 = 9건 path 갱신 필요.**

### 별건 처리: worktree-manager.ts

| 파일 | callers | 도메인 | 처분 |
|------|---------|--------|------|
| `services/worktree-manager.ts` | core/agent/services/agent-orchestrator.ts (type-import 1) + core/harness/services/auto-rebase.ts (type-import 1) | **harness 또는 agent (work 아님)** | F589+ 별건 (본 sprint 범위 외) |

worktree-manager는 git worktree CRUD 유틸리티이며 agent + harness 두 도메인이 type import. work 도메인 매핑은 부적절 → F589 또는 후속 sprint에서 harness 도메인(또는 contract 분리) 검토.

### core/work/ 도메인 현황 (F587 시드)

```
packages/api/src/core/work/services/
└── traceability.service.ts (F587, 373L)
```

본 sprint 후 예상:

```
packages/api/src/core/work/
├── routes/
│   ├── work.ts        (← routes/work.ts)
│   └── work-public.ts (← routes/work-public.ts)
└── services/
    ├── traceability.service.ts (F587 기존)
    ├── work.service.ts          (← services/work.service.ts)
    └── work-kg.service.ts       (← services/work-kg.service.ts)
```

→ routes 2 + services 3 = **5 files** core/work/ 하위 결합.

## 인터뷰 결정 (S325, 2026-05-04)

### 1차 인터뷰

**메인 트랙**: Foundry-X 코드 사이클(Recommended) 채택 / **FX target**: F588 work 도메인 본격 분리(Recommended) 채택.

### 2차 인터뷰 (사전 측정 후 재결정)

사전 측정에서 worktree-manager가 work 도메인이 아닌 harness/agent 도메인이라는 사실 발견. 단순히 "work 관련 5 files" 묶음은 F587 패턴(traceability=work / monitoring=harness 정확 매핑)을 위반. 옵션 비교 후 **A안 work 4 files**(worktree-manager 제외) 채택. git orphan 1건은 즉시 정리(별건 task 1).

## 범위

### (a) git mv — Routes (2 files)

```bash
git mv packages/api/src/routes/work.ts packages/api/src/core/work/routes/work.ts
git mv packages/api/src/routes/work-public.ts packages/api/src/core/work/routes/work-public.ts
```

### (b) git mv — Services (2 files)

```bash
git mv packages/api/src/services/work.service.ts packages/api/src/core/work/services/work.service.ts
git mv packages/api/src/services/work-kg.service.ts packages/api/src/core/work/services/work-kg.service.ts
```

### (c) app.ts 2 mount path 갱신

```typescript
// Before
import { workRoute } from "./routes/work.js";
import { workPublicRoute } from "./routes/work-public.js";

// After
import { workRoute } from "./core/work/routes/work.js";
import { workPublicRoute } from "./core/work/routes/work-public.js";
```

### (d) Routes 내부 services import 갱신

`core/work/routes/work.ts` + `core/work/routes/work-public.ts` 내부:

```typescript
// Before (routes/ 루트 기준)
import { WorkService } from "../services/work.service.js";
import { WorkKGService } from "../services/work-kg.service.js";

// After (core/work/routes/ 기준 — sibling services/)
import { WorkService } from "../services/work.service.js";
import { WorkKGService } from "../services/work-kg.service.js";
```

> 결과적으로 import 경로 문자열은 동일하지만 **물리적 위치는 sibling**이 됨(상대 경로 일치 → 변경 0건일 수도 있음, 실측 확인).

### (e) __tests__ 3 path 갱신

```typescript
// Before
import { WorkService } from "../services/work.service.js";
import { WorkKGService } from "../services/work-kg.service.js";

// After
import { WorkService } from "../core/work/services/work.service.js";
import { WorkKGService } from "../core/work/services/work-kg.service.js";
```

대상 파일:
- `packages/api/src/__tests__/work.service.test.ts`
- `packages/api/src/__tests__/work-sessions.test.ts`
- `packages/api/src/__tests__/work-kg.service.test.ts`

### (f) typecheck + lint + tests 회귀 GREEN

- `packages/api`: `pnpm typecheck` + `pnpm lint` + `pnpm test`
- `packages/cli`, `packages/fx-agent`, `packages/web`: typecheck 회귀 GREEN

## §3 Phase Exit OBSERVED — Smoke Reality 9항

| # | 항목 | 검증 명령 | 기대치 |
|---|------|----------|--------|
| **P-a** | services/ 루트에서 work 핵심 사라짐 | `find packages/api/src/services -maxdepth 1 \( -name "work.service.ts" -o -name "work-kg.service.ts" \) \| wc -l` | **0** |
| **P-b** | core/work/ 디렉토리 5 files 결합 | `find packages/api/src/core/work -type f -name "*.ts" \| wc -l` | **5** (F587 traceability 1 + 본 sprint routes 2 + services 2) |
| **P-c** | services/ 루트 .ts 25 (29-4) | `ls packages/api/src/services/*.ts \| wc -l` | **25** |
| **P-d** | 외부 callers 잔존 OLD import 0건 | `grep -rn 'services/work\.service\\\|services/work-kg\.service' packages/api/src \| grep -v 'core/work/' \| wc -l` | **0** |
| **P-e** | routes/ 루트에서 work*.ts 사라짐 | `find packages/api/src/routes -maxdepth 1 -name "work*.ts" \| wc -l` | **0** |
| **P-f** | typecheck + test GREEN (api/cli/fx-agent/web) | `pnpm turbo typecheck test --filter=...` | **GREEN** |
| **P-g** | dual_ai_reviews sprint 334 자동 INSERT | `wrangler d1 execute foundry-x-db --remote --command "SELECT id FROM dual_ai_reviews WHERE sprint_id=334"` | **≥ 1건** (누적 ≥ 21건) |
| **P-h** | F560/F582/F583/F584/F585/F586/F587 회귀 0건 7항 | 각 회귀 시그니처 grep | 모두 PASS |
| **P-i** | autopilot Match ≥ 90% | autopilot 자체 평가 | ≥ 90% |

### 회귀 회피 항목 (P-h 7항 상세)

| 회귀 항목 | 검증 |
|----------|------|
| F560 fx-discovery 401 일관 | `curl https://foundry-x-api.ktds-axbd.workers.dev/api/discovery/health` → 401 |
| F582 DiagnosticCollector 인프라 살아있음 | `grep -rn "DiagnosticCollector" packages/api/src packages/fx-discovery/src \| wc -l` ≥ 16 |
| F583 services/agent = 0 | `find packages/api/src/services/agent -type f -name "*.ts" \| wc -l` = 0 |
| F584 model-router core 위치 = 1 | `find packages/api/src/core/agent/services -name "model-router*" \| wc -l` = 1 |
| F585 core/agent/services 7+ files 유지 | `find packages/api/src/core/agent/services -name "*.ts" \| wc -l` ≥ 7 |
| F586 outputTokens grep ≥ 16 | `grep -rn "outputTokens" packages/{api,fx-agent}/src \| wc -l` ≥ 16 |
| **F587 core/work/services/traceability.service.ts ≥ 1** | `find packages/api/src/core/work -name "traceability.service.ts" \| wc -l` ≥ 1 |

### 표면 충족 함정 회피 핵심 조항

- **P-a + P-c 동시 충족** numerical 강제 — services/ 루트 work-kg/work.service 사라짐 + 전체 25 (29-4) 일치
- **P-b numerical 5 강제** — core/work/ closure 도달 시점 정확 측정 (F587 시드 1 + 본 sprint 4 = 5)
- **P-h F587 회귀 강제** — F587 traceability seed 살아있음을 명시적으로 검증
- **P-d 외부 callers 0건** — autopilot이 mv만 하고 callers 갱신 누락 시 즉시 FAIL

## 전제 조건

- F587 ✅ (Sprint 333, PR #720 MERGED, traceability.service core/work/services/ 시드 살아있음)
- F584 + F585 + F586 ✅
- C103 (dual_ai_reviews hook fallback) + C104 (.dev.vars 자동 복사) 8 sprint 연속 정상

## 예상 시간

**~10~15분** (autopilot, F587 8분 14초 + F584 7분 8초 패턴 기반). 단순 git mv + 9 callers 갱신 + 회귀 검증.

## Risk

| Risk | 완화 |
|------|------|
| `core/work/routes/`에서 services sibling import 경로 동일성 (../services/work.service.js) | autopilot이 자동 인식 또는 변경 0건. 수동 검증 필요 시 P-d grep으로 잔존 catch |
| __tests__ 3 path 갱신 누락 | P-d grep + P-f test GREEN 동시 강제 |
| app.ts 2 mount path 누락 | P-h F560 회귀(API health) + P-f typecheck 동시 catch |
| worktree-manager 의도치 않은 이동 (autopilot 오인식) | 본 plan §사전 측정 별건 처리 명시 + P-h 회귀 항목 검증 |

## 다음 사이클 후보

- **F589** worktree-manager 도메인 분리(harness 또는 contract, P2~P3)
- **F590** pm-skills 4 files / prd 7 files 도메인 분리(P2~P3)
- Phase 47 GAP-3 27 stale proposals 검토 루프 (P2 F-track)
- 모델 A/B Opus 4.7 vs Sonnet 4.6 (P3 F-track)
- F586 P-m 운영자 KOAMI Dogfood 1회 실행 (별건)
- AI Foundry Phase 1 W18 활동 (별도 PRD 트랙, 시간 민감도 高 — 5/15(금) 회의 D-day, 5/22 H1 Red 자동 전환)

## 참고

- F587 시드: `docs/01-plan/features/sprint-333.plan.md` (FX-PLAN-333)
- F584 패턴 정착화: `docs/01-plan/features/sprint-331.plan.md` (FX-PLAN-331)
- F585 패턴 16회차 확장: `docs/01-plan/features/sprint-332.plan.md` (FX-PLAN-332)
- MSA core/{domain}/ 룰: `CLAUDE.md` MSA 원칙 섹션
