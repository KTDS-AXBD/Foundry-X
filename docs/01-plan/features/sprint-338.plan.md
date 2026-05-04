---
id: FX-PLAN-338
sprint: 338
feature: F592
req: FX-REQ-659
status: approved
date: 2026-05-04
---

# Sprint 338 Plan — F592: services/ 잔존 dead+sibling 2 files 정리 (옵션 D-a, 매우 보수)

## 목표

**S328 F591(Sprint 337, PR #728 Match 100%, +159/-16) 후속.** services/ 루트 18 files 정밀 분석 결과 **dead 1 + sibling-natural 1**의 가장 작은 묶음 채택. entity-sync(0 callers, pure dead) + methodology-types(1 caller sibling = `core/discovery/services/pm-skills-criteria.ts`) → 2 files만 처리. services/ 루트 18 → 16 (-2).

**핵심 원칙**: F587/F590 dead+이동 패턴 23회차 재현 (옵션 D = 묶음 최소). cross-domain 0건 추가 (sibling 이동은 룰 위반 0). entity-registry는 도메인 모호로 C105 Backlog C-track에 보류 등록.

**부수 효과**: dist orphan 8 files cleanup (entity-sync 4 + methodology-types 4). MSA 룰 위반 누적 그대로 19건 유지(증가 0).

## 사전 측정 (S329, 2026-05-04 — 본 세션)

### 후보 파일 위치 + callers 분포 (실측)

| 파일 | api/src callers (production) | api/src callers (test) | 처리 | 비고 |
|------|------------------------------|------------------------|------|------|
| `services/entity-sync.ts` | **0** | **0** | **git rm (pure dead)** | F587 logger 패턴 |
| `services/methodology-types.ts` | **1** (`core/discovery/services/pm-skills-criteria.ts:6`) | **0** | **git mv → core/discovery/services/methodology-types.ts** | sibling 이동 (3-level → 0-level relative path) |

**총 처리 2 files** (1 rm + 1 mv). 사용자 1차 가정 18 files 후보 → 2차 정밀 측정 옵션 D 묶음 dead+sibling 4 files → 3차 entity-registry 도메인 모호 발견 → 4차 의식적 보수 2 files A-only 채택.

### 외부 callers 갱신 대상 (1건만)

| 파일 | 현재 import | 신규 import | 비고 |
|------|-------------|-------------|------|
| `core/discovery/services/pm-skills-criteria.ts:6` | `import type { CriterionDefinition, GateResult } from "../../../services/methodology-types.js"` | `import type { CriterionDefinition, GateResult } from "./methodology-types.js"` | sibling import (3 level → 0 level), **type-only import** = production runtime 영향 0 |

**총 callers 1건**. type-only import이므로 빌드 산출물에 흔적 없음(완전 erasure).

### dist orphan 잔존 (S314 패턴 23회차)

```
packages/api/dist/services/entity-sync.{js,js.map,d.ts,d.ts.map}         # 4 files (rm 후 dist도 제거)
packages/api/dist/services/methodology-types.{js,js.map,d.ts,d.ts.map}   # 4 files (mv 후 dist도 제거)
```

**총 8 files** (실측 ls 기준). `tsc`는 src 삭제 시 dist 자동 정리 안 함. autopilot 자동 인식 가능성 낮음 (S326~S328 22회차 일관 미인식 패턴) → P-j numerical 강제, 수동 git rm 또는 build 재생성.

### 인터뷰 4회 결정 (S329, 23회차)

1. **1차** "오늘 메인 = Foundry-X F592 사이클 + 학습 모드 인터뷰 + autopilot" 채택
2. **2차** services/ 18 files 정밀 caller 분포 측정 → 옵션 D "묶음 dead+sibling 4 files" 채택 (entity-sync rm + entity-registry mv + methodology-types mv)
3. **3차** entity-registry mv 목적지 검증 → routes/entities.ts mount 활성 + 도메인 모호("cross-service entities" = harness/work/신규 entity 후보) → 룰 grandfathered 추가 양산 위험 발견
4. **4차** 사용자 의식적 결정 **옵션 D-a 채택** (보수 2 files, entity-registry 보류 + C105 등록): cross-domain 0건 추가, services/ 18→16 작은 진전, 도메인 결정 비대칭은 별건 사이클로 분리

4차 인터뷰 = "도메인 결정 모호한 작업은 별건 분리"의 의식적 결정 문서화. F591 4차 인터뷰(MSA 룰 grandfathered 의식적 인정) 패턴 재현.

### core/discovery/services/ 도메인 현황 (이동 후 예상)

```
packages/api/src/core/discovery/services/
├── analysis-context.ts (기존)
├── analysis-engine.ts (기존)
├── ax-bd-criteria.ts (기존)
├── biz-item-evaluator.ts (기존)
├── domain-recommender.ts (기존)
├── methodology-types.ts (본 sprint 신설, ← 이동) ★
├── opportunity-engine.ts (기존)
├── persona-engine.ts (기존)
├── pm-skills-criteria.ts (기존, methodology-types 의존)
├── pm-skills-guide.ts (기존, F590에서 이동)
└── ... (기타 기존 files)
```

methodology-types는 pm-skills-criteria의 sibling으로 자연 동거. type-only이므로 도메인 의미는 약하지만 "discovery 평가 기준 type 정의"로 해석 가능 → 도메인 시멘틱 합당.

### services/ 루트 직속 .ts 변화

```
이전 (S328 F591 이후): 18 files
본 sprint 이후: 16 files (-2 = entity-sync rm + methodology-types 이동)
```

**잔존 16 files**: conflict-detector / entity-registry / event-bus / hybrid-sr-classifier / kv-cache / llm / merge-queue / pii-masker / pr-pipeline / service-proxy / shard-doc / spec-library / spec-parser / sr-classifier / sr-workflow-mapper / sse-manager — 후속 사이클 후보(C105 entity-registry / spec-* 묶음 / sr-* 묶음 / infra cluster).

## 범위

### 코드 변경

#### (a) git rm 1 file (pure dead)
- `git rm packages/api/src/services/entity-sync.ts`

#### (b) git mv 1 file → core/discovery/services/
- `git mv packages/api/src/services/methodology-types.ts packages/api/src/core/discovery/services/methodology-types.ts`

#### (c) callers 1건 import path 갱신
- `core/discovery/services/pm-skills-criteria.ts:6` — `from "../../../services/methodology-types.js"` → `from "./methodology-types.js"` (sibling import)

#### (d) dist orphan cleanup (S314 패턴 23회차)
- `git rm -r packages/api/dist/services/entity-sync.{js,js.map,d.ts,d.ts.map}` (4 files)
- `git rm -r packages/api/dist/services/methodology-types.{js,js.map,d.ts,d.ts.map}` (4 files)
- 또는 build 재생성으로 자연 갱신 (`rm -rf packages/api/dist && pnpm --filter @foundry-x/api build`)

### 검증

#### (e) packages/api typecheck + lint + tests 회귀 GREEN
- turbo typecheck 19/19 + 2308+ tests passed
- type-only import이므로 runtime 영향 0
- ESLint cross-domain 룰 위반 19 → **19건 그대로 유지** (sibling 이동은 cross-domain 아님)

## OBSERVED Phase Exit P-a~P-j Smoke Reality 10항

### F592 핵심 검증 (P-a~P-d)

| ID | 명세 | 측정 명령 | 기대값 |
|----|------|----------|--------|
| **P-a** | services/ 루트 entity-sync + methodology-types 사라짐 | `find packages/api/src/services -maxdepth 1 \( -name "entity-sync*" -o -name "methodology-types*" \) \| wc -l` | **0** |
| **P-b** | core/discovery/services/methodology-types.ts 신설 | `find packages/api/src/core/discovery/services -name "methodology-types*" \| wc -l` | **1** (1 file: methodology-types.ts) |
| **P-c** | services/ 루트 직속 .ts 16 files | `find packages/api/src/services -maxdepth 1 -name "*.ts" \| wc -l` | **16** (18-2) |
| **P-d** | 외부 callers 잔존 OLD import 0건 | `grep -rn "from .\\.\\./\\.\\./\\.\\./services/methodology-types\\|from .\\.\\./\\.\\./services/entity-sync\\|from .\\.\\./services/methodology-types\\|from .\\.\\./services/entity-sync" packages/api/src --include="*.ts"` | **0건** (1 caller NEW sibling path, entity-sync 0 caller 이미) |

### 검증 인프라 (P-e~P-g)

| ID | 명세 | 기대값 |
|----|------|--------|
| **P-e** | typecheck + tests GREEN | turbo typecheck 19/19 + tests passed |
| **P-f** | dual_ai_reviews sprint 338 자동 INSERT ≥ 1건 | 누적 ≥ **27건** (S328 26 → 27+, hook **13 sprint 연속** 검증) |
| **P-g** | C103 fallback hook 자동 trigger 확증 | `save-dual-review-338.log` 생성, verdict 기록 |

### 회귀 검증 (P-h: 7 항)

| ID | 명세 | 기대값 |
|----|------|--------|
| **P-h-1** | F583 services/agent = 0 유지 | `find packages/api/src/services/agent -type f \| wc -l` = 0 |
| **P-h-2** | F584 model-router core/agent/services 위치 | `find packages/api/src/core/agent/services -name "model-router*" \| wc -l` = 1 |
| **P-h-3** | F585 core/agent/services .ts files 유지 | `find packages/api/src/core/agent/services -name "*.ts" \| wc -l` ≥ 7 |
| **P-h-4** | F587 core/work/services/traceability.service 유지 | = 1 |
| **P-h-5** | F588 core/work/ closure files 유지 | ≥ 5 |
| **P-h-6** | F589 core/harness/services/worktree-manager 유지 | = 1 |
| **P-h-7** | F590 core/discovery/services/pm-skills-guide 유지 | = 1 |
| **P-h-8** | F591 core/offering/services/ prd/prototype 5 files 유지 | = 5 |

### Match Rate (P-i)

| ID | 명세 | 기대값 |
|----|------|--------|
| **P-i** | autopilot Match Rate ≥ 90% | semantic Match 100% 목표 (단순 git rm 1 + git mv 1 + 1 caller path 치환, F584~F591 패턴 재현, **본 sprint 최단 기록 가능성** ~5~8분) |

### Bonus 검증 (P-j: dist orphan)

| ID | 명세 | 측정 명령 | 기대값 |
|----|------|----------|--------|
| **P-j** | dist orphan entity-sync*/methodology-types* cleanup | `find packages/api/dist/services \( -name "entity-sync*" -o -name "methodology-types*" \) \| wc -l` | **0** (또는 build 재생성으로 자연 갱신, autopilot 미인식 시 수동 cleanup 8 files = S326~S328 22회차 패턴 재현) |

### MSA 룰 위반 변화 (P-k: NEW)

| ID | 명세 | 측정 명령 | 기대값 |
|----|------|----------|--------|
| **P-k** | MSA cross-domain 누적 위반 19건 그대로 유지 (증가 0) | `cd packages/api && pnpm exec eslint src/core/discovery/routes/biz-items.ts 2>&1 \| grep -c "no-cross-domain-import"` | **19** (sibling 이동은 cross-domain 아님 → 룰 위반 0건 추가) |

## 근본 원칙

- **Source-First Fix Order**: src 변경 → dist는 자동 따라옴 (autopilot이 build 재실행하면)
- **F587/F590 dead+이동 패턴 재현**: 단순 git rm + git mv + caller sibling path 갱신 (옵션 D 23회차 정착화 — 보수 mode)
- **methodology-types = discovery 도메인 sibling**: pm-skills-criteria의 type 의존이므로 자연 sibling, type-only erasure로 runtime 영향 0
- **entity-registry 도메인 모호 → 보류**: routes/entities + schemas/entity 묶음 도메인 결정은 C105 Backlog C-track에 별건 등록
- **cross-domain 0건 추가**: 본 sprint는 룰 위반 누적 그대로 유지 (F591 19건 → 19건)

## 전제

- F591 ✅ (services/ 23→18, dual_ai_reviews 26 + hook 12 sprint 연속)
- F590 ✅ (services/ 26→23, pm-skills-guide → core/discovery/services/)
- F589 ✅ (core/harness/services/worktree-manager seed)
- F588 ✅ (core/work/ closure 5 files)
- F587 ✅ (dead code + 도메인 이동 패턴 직접 모델)
- C103 (dual_ai_reviews hook fallback) + C104 (.dev.vars 자동 복사) 12 sprint 연속 정상 (S328)
- C105 (📋 보류 등록) — entity-registry+routes/entities+schemas/entity 도메인 결정 별건 트랙

## 예상 시간

**~5~8분** (autopilot, F584 7분 8초 + F590 7분 37초 패턴 기반 — **본 sprint 최단 기록 갱신 후보**). 단순 git rm 1 + git mv 1 + 1 caller sibling path 갱신 + dist cleanup + 회귀 검증.

## Risk

| Risk | 완화 |
|------|------|
| methodology-types type-only erasure 빌드 회귀 | P-e turbo typecheck + test 강제 (type-only이므로 사실상 0 위험) |
| pm-skills-criteria.ts sibling import path 오타 | autopilot path 치환 단일 라인 + P-d 0건 grep 강제 |
| entity-sync rm 후 잠재 신규 caller 기록 발견 | 사전 측정 0 callers 확증 + P-d grep 강제 |
| dist orphan 8 files autopilot 자동 인식 못 함 | P-j 강제 numerical로 catch → 수동 git rm 또는 build 재생성 (S326~S328 22회차 패턴) |
| autopilot이 entity-registry까지 끌어들여 처리 | 본 plan SCOPE LOCK 명시 (entity-registry는 C105 보류, 본 sprint 범위 외) |

## 다음 사이클 후보

- **C105 entity-registry** 도메인 결정 작업 (P3, FX-REQ-660): routes/entities + schemas/entity 묶음 → core/{entity|harness|work}/services/ 또는 신규 도메인 디렉터리 신설 결정
- **F593 spec-* 묶음** → core/spec/services/ 또는 core/discovery/services/ (P2, spec-parser 8 + spec-library 2 callers, cross-domain 5 도메인)
- **F594 sr-* 묶음** → core/sr/services/ 신규 도메인 또는 fx-modules 이전 (P2~P3, 3 files)
- **F595 infra cluster** (sse-manager 14 + kv-cache 12 + event-bus 6) — cross-domain infra 처리 (P3)
- **MSA 룰 강제 교정 F-item** (P3~P4) — `pnpm lint` script 스코프 src/ 전체로 확장 + grandfathered 19건 해소 plan
- Phase 47 GAP-3 27 stale proposals 검토 루프 (P2 F-track)
- 모델 A/B Opus 4.7 vs Sonnet 4.6 (P3 F-track)
- fx-discovery worker 404 환경 issue 별도 점검 (옵션 ~30분)
- AI Foundry Phase 1 W18+ D 액션 (별도 PRD 트랙, 5/15 회의 D-day, 사용자 직접 PM)

## 참고

- F591 시드: `docs/01-plan/features/sprint-337.plan.md` (FX-PLAN-337) — 옵션 A1 prd/prototype 5 files
- F590 시드: `docs/01-plan/features/sprint-336.plan.md` (FX-PLAN-336) — 옵션 B dead+이동 패턴
- F589 시드: `docs/01-plan/features/sprint-335.plan.md` (FX-PLAN-335) — 옵션 A worktree-manager
- F587 시드: `docs/01-plan/features/sprint-333.plan.md` (FX-PLAN-333) — dead code + 도메인 이동 2
- F584 패턴: `docs/01-plan/features/sprint-331.plan.md` (FX-PLAN-331) — 7분 8초 최단
- MSA core/{domain}/ 룰: `CLAUDE.md` MSA 원칙 섹션 + `packages/api/src/eslint-rules/no-cross-domain-import.ts`
- ESLint lint script 한계: `packages/api/package.json` lint 스크립트가 `src/eslint-rules/`만 대상 (F591 3차 인터뷰에서 발견)
- S314 dist orphan 패턴: `MEMORY.md` feedback_dist_orphan_after_src_delete.md
- S324~S328 인터뷰 3~4회 패턴: 사전 측정 → 1차 인터뷰 → 정밀 측정 → N차 인터뷰 → plan → autopilot → OBSERVED
