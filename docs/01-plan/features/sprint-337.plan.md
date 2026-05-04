---
id: FX-PLAN-337
sprint: 337
feature: F591
req: FX-REQ-658
status: approved
date: 2026-05-04
---

# Sprint 337 Plan — F591: prd/prototype 5 files 도메인 분리 → core/offering/services/ (옵션 A1, 관행 일관성)

## 목표

**S327 F590(Sprint 336, PR #726 Match 100%, 7분 37초) 후속.** services/ 루트 23 files 중 prd/prototype 도메인 5 files를 정밀 분석한 결과 **fx-offering self-contained 재확증** + **api 측 callers biz-items.ts 1 production + 2 tests** + **PRD/Prototype = offering 도메인 일부**로 자연 동거. 5 files → core/offering/services/ 통합. services/ 루트 23 → 18 (-5) 정리.

**핵심 원칙**: F584/F587/F588/F589/F590 패턴 재현 — 단순 git mv 5 + 2 callers path 갱신. PRD/Prototype은 `core/offering/services/` 기존 11 files(bp-prd-generator, prd-interview-service, prd-confirmation-service, prd-review-pipeline 등)와 sibling 동거. 표면 충족 함정 22회차 회피용 P-a~P-k 11항 numerical 강제.

**부수 효과**: dist orphan 패턴(S314 교훈) 22회차 일관 적용 (28 files 추정 — 16 prototype + 12 prd). MSA cross-domain 누적 위반 18→**20건** (별도 F-item 후보).

## 사전 측정 (S328, 2026-05-04 — 본 세션)

### prd/prototype 파일 위치 + callers 분포

| 파일 | api/src callers (production) | api/src callers (test) | fx-offering 사본 | 분류 |
|------|------------------------------|------------------------|-------------------|------|
| `services/prd-generator.ts` | **1** (`core/discovery/routes/biz-items.ts:26`) | 0 | 있음 (자체 사본 + 자체 ./prd-template.js 사용) | **이동 (offering)** |
| `services/prd-template.ts` | **0** (transitive: prd-generator 내부 의존) | 0 | 있음 (`fx-offering/src/services/prd-generator.ts`에서 사용) | **이동 (offering, transitive)** |
| `services/prototype-generator.ts` | **1** (`core/discovery/routes/biz-items.ts:39`) | **1** (`__tests__/prototype-generator.test.ts`) | 있음 (자체 사본) | **이동 (offering)** |
| `services/prototype-styles.ts` | **0** (transitive: prototype-generator 내부 의존) | **1** (`__tests__/prototype-templates.test.ts`) | 있음 (`fx-offering/src/services/prototype-generator.ts`에서 사용) | **이동 (offering, transitive)** |
| `services/prototype-templates.ts` | **0** (transitive: prototype-generator 내부 의존) | **1** (`__tests__/prototype-templates.test.ts`) | 있음 (`fx-offering/src/services/prototype-generator.ts`에서 사용) | **이동 (offering, transitive)** |

**총 5 files** (사용자 1차 가정 7 files → 실측 5 files; 인터뷰 2회차 조정). **fx-offering self-contained 재확증**: fx-offering 자체 사본은 본 sprint 무관(자체 prd-generator/prototype-* 사용, api 측 사본과 별개).

### 외부 callers 갱신 대상 (이동 5 files 중 production callers 2건 + test callers 3건)

| 파일 | 현재 import | 신규 import | 비고 |
|------|-------------|-------------|------|
| `core/discovery/routes/biz-items.ts:26` | `import { PrdGeneratorService } from "../../../services/prd-generator.js"` | `import { PrdGeneratorService } from "../../offering/services/prd-generator.js"` | production runtime, cross-domain (기존 grandfathered 18건과 동일 패턴) |
| `core/discovery/routes/biz-items.ts:39` | `import { PrototypeGeneratorService } from "../../../services/prototype-generator.js"` | `import { PrototypeGeneratorService } from "../../offering/services/prototype-generator.js"` | production runtime, cross-domain |
| `__tests__/prototype-generator.test.ts` | `from "../services/prototype-generator.js"` | `from "../core/offering/services/prototype-generator.js"` | test runtime |
| `__tests__/prototype-templates.test.ts` | `from "../services/prototype-templates.js" + "../services/prototype-styles.js"` | `from "../core/offering/services/prototype-templates.js" + "../core/offering/services/prototype-styles.js"` | test runtime (2 imports) |
| `__tests__/services/prototype-templates.test.ts` (sibling 디렉토리) | (위 동일) | (위 동일) | 같은 위치 가능성 (실측 추가 필요) |

**총 callers 5건** (production 2 + test 3). prd-template/prototype-styles/prototype-templates는 prd-generator/prototype-generator의 내부 의존 → mv 후 sibling import는 자동 유지(상대 경로 동일 디렉토리).

### dist orphan 잔존 (S314 패턴 22회차)

```
packages/api/dist/services/prd-generator.{js,js.map,d.ts,d.ts.map}        # 4 files (mv 후 위치 옮겨야)
packages/api/dist/services/prd-template.{js,js.map,d.ts,d.ts.map}         # 4 files
packages/api/dist/services/prototype-generator.{js,js.map,d.ts,d.ts.map}  # 4 files
packages/api/dist/services/prototype-styles.{js,js.map,d.ts,d.ts.map}     # 4 files
packages/api/dist/services/prototype-templates.{js,js.map,d.ts,d.ts.map}  # 4 files
```

**총 28 files 추정** (사전 측정 ls 16+12=28). `tsc`는 src 삭제 시 dist 자동 정리 안 함. autopilot이 자동 인식 가능성도 있으나 P-j numerical 강제, 미인식 시 수동 git rm.

### 인터뷰 4회 결정 (S328)

1. **1차** "F591 prd/prototype 7 files 도메인 분리" 채택 (메인 트랙 Foundry-X 코드 사이클 + F-item 우선순위)
2. **2차** 사전 측정 후 실측 **5 files** 발견 (prd-qsa-adapter는 services/adapters/ 별도 위치라 본 sprint 범위 외) — 옵션 A "core/offering/services/ 통합" 선택
3. **3차** ESLint `no-cross-domain-import` 룰 분석 결과 **biz-items.ts에 이미 18건 grandfathered 위반 + lint script 스코프 eslint-rules/만** 발견 → 룰 vs 현실 괴리 사용자 공유
4. **4차** 사용자 의식적 결정 **A1 채택**: 관행 일관성 우선, grandfathered 18 + 신규 2 = **누적 20건** lint pass 유지, MSA 룰 강제는 별건 F-item으로 분리

4번의 인터뷰가 표면 충족 함정 22회차 회피의 보장. 옵션 B(core/discovery/services/)로 갔다면 룰 0 추가지만 도메인 시멘틱 부적절(PRD/Prototype = offering 본질). A1은 정직한 "관행 인정 + 룰 교정 별건화" 결정.

### core/offering/services/ 도메인 현황 (이동 후 예상)

```
packages/api/src/core/offering/services/
├── bdp-service.ts (기존)
├── bp-html-parser.ts (기존)
├── bp-prd-generator.ts (기존, BpPrdGenerator)
├── business-plan-generator.ts (기존)
├── business-plan-template.ts (기존)
├── content-adapter-service.ts (기존)
├── offering-metrics-service.ts (기존)
├── offering-service.ts (기존)
├── prd-confirmation-service.ts (기존)
├── prd-generator.ts (본 sprint 신설, ← 이동) ★
├── prd-interview-service.ts (기존)
├── prd-review-pipeline.ts (기존)
├── prd-template.ts (본 sprint 신설, ← 이동) ★
├── prototype-generator.ts (본 sprint 신설, ← 이동) ★
├── prototype-styles.ts (본 sprint 신설, ← 이동) ★
└── prototype-templates.ts (본 sprint 신설, ← 이동) ★
```

PRD/Prototype 도메인 일관성 향상 — bp-prd-generator/prd-interview-service와 sibling. fx-offering 자체 사본은 무관.

### services/ 루트 직속 .ts 변화

```
이전 (S327 F590 이후): 23 files
본 sprint 이후: 18 files (-5 = prd-generator + prd-template + prototype-generator + prototype-styles + prototype-templates 5 모두 이동)
```

**잔존 18 files**: conflict-detector / entity-registry / entity-sync / event-bus / hybrid-sr-classifier / kv-cache / llm / merge-queue / methodology-types / pii-masker / pr-pipeline / service-proxy / shard-doc / spec-library / spec-parser / sr-classifier / sr-workflow-mapper / sse-manager — F592 후속 후보.

## 범위

### 코드 변경

#### (a) git mv 5 files → core/offering/services/
- `git mv packages/api/src/services/prd-generator.ts packages/api/src/core/offering/services/prd-generator.ts`
- `git mv packages/api/src/services/prd-template.ts packages/api/src/core/offering/services/prd-template.ts`
- `git mv packages/api/src/services/prototype-generator.ts packages/api/src/core/offering/services/prototype-generator.ts`
- `git mv packages/api/src/services/prototype-styles.ts packages/api/src/core/offering/services/prototype-styles.ts`
- `git mv packages/api/src/services/prototype-templates.ts packages/api/src/core/offering/services/prototype-templates.ts`

#### (b) callers production 2건 import path 갱신
- `core/discovery/routes/biz-items.ts:26` — `from "../../../services/prd-generator.js"` → `from "../../offering/services/prd-generator.js"`
- `core/discovery/routes/biz-items.ts:39` — `from "../../../services/prototype-generator.js"` → `from "../../offering/services/prototype-generator.js"`

#### (c) test callers 3건 import path 갱신
- `__tests__/prototype-generator.test.ts` — `from "../services/prototype-generator.js"` → `from "../core/offering/services/prototype-generator.js"`
- `__tests__/prototype-templates.test.ts` — `from "../services/prototype-templates.js"` → `from "../core/offering/services/prototype-templates.js"` + `from "../services/prototype-styles.js"` → `from "../core/offering/services/prototype-styles.js"`
- (잠재) `__tests__/services/prototype-templates.test.ts` — 동일 패턴, 실측 시 발견되면 갱신

#### (d) dist orphan cleanup (S314 패턴 22회차)
- `git rm -r packages/api/dist/services/prd-generator.{js,js.map,d.ts,d.ts.map}` (4 files)
- `git rm -r packages/api/dist/services/prd-template.{js,js.map,d.ts,d.ts.map}` (4 files)
- `git rm -r packages/api/dist/services/prototype-{generator,styles,templates}.{js,js.map,d.ts,d.ts.map}` (12 files)
- 또는 build 재생성으로 자연 갱신 (`rm -rf packages/api/dist && pnpm build`)

### 검증

#### (e) packages/api typecheck + lint + tests 회귀 GREEN
- turbo typecheck 19/19 + 2308+ tests passed
- prototype-generator.test.ts / prototype-templates.test.ts (이동 후 path 갱신) GREEN 유지
- biz-items.ts cross-domain ESLint 룰 위반 18 → **20건** (lint script 스코프 한계로 catch 안됨, pass 보장)

## OBSERVED Phase Exit P-a~P-k Smoke Reality 11항

### F591 핵심 검증 (P-a~P-d)

| ID | 명세 | 측정 명령 | 기대값 |
|----|------|----------|--------|
| **P-a** | services/ 루트 prd*/prototype* 사라짐 | `find packages/api/src/services -maxdepth 1 \( -name "prd-*" -o -name "prototype-*" \) \| wc -l` | **0** |
| **P-b** | core/offering/services/ 5 files 신설 | `find packages/api/src/core/offering/services \( -name "prd-generator*" -o -name "prd-template*" -o -name "prototype-*" \) \| wc -l` | **5** (5 files: prd-generator, prd-template, prototype-generator, prototype-styles, prototype-templates) |
| **P-c** | services/ 루트 직속 .ts 18 files | `find packages/api/src/services -maxdepth 1 -name "*.ts" \| wc -l` | **18** (23-5) |
| **P-d** | 외부 callers 잔존 OLD import 0건 | `grep -rn "from .\\.\\./\\.\\./\\.\\./services/prd-generator\\|from .\\.\\./\\.\\./\\.\\./services/prototype-generator\\|from .\\.\\./services/prototype-templates\\|from .\\.\\./services/prototype-styles\\|from .\\.\\./services/prd-template" packages/api/src --include="*.ts"` | **0건** (5 callers 모두 NEW path) |

### 검증 인프라 (P-e~P-g)

| ID | 명세 | 기대값 |
|----|------|--------|
| **P-e** | typecheck + tests GREEN | turbo typecheck 19/19 + tests passed |
| **P-f** | dual_ai_reviews sprint 337 자동 INSERT ≥ 1건 | 누적 ≥ **26건** (S327 25 → 26+, hook **12 sprint 연속** 검증) |
| **P-g** | C103 fallback hook 자동 trigger 확증 | `save-dual-review-337.log` 생성, verdict 기록 |

### 회귀 검증 (P-h: 10 항)

| ID | 명세 | 기대값 |
|----|------|--------|
| **P-h-1** | F560 fx-discovery 회귀 0건 | curl 401 또는 acceptable variant 일관 (S327에서 404 acceptable로 변경됨) |
| **P-h-2** | F582 DiagnosticCollector 인프라 살아있음 | grep ≥ 16 (S324 baseline) |
| **P-h-3** | F583 services/agent = 0 유지 | `find packages/api/src/services/agent \| wc -l` = 0 |
| **P-h-4** | F584 model-router core/agent/services 위치 | grep = 1 |
| **P-h-5** | F585 core/agent/services 7+ files 유지 | `find packages/api/src/core/agent/services \| wc -l` ≥ 7 |
| **P-h-6** | F586 outputTokens grep 회귀 0건 | grep ≥ 16 |
| **P-h-7** | F587 core/work/services/traceability.service 유지 | = 1 |
| **P-h-8** | F588 core/work/ 5 files closure 유지 | ≥ 5 |
| **P-h-9** | F589 core/harness/services/worktree-manager 유지 | = 1 |
| **P-h-10** | F590 core/discovery/services/pm-skills-guide 유지 | = 1 |

### Match Rate (P-i)

| ID | 명세 | 기대값 |
|----|------|--------|
| **P-i** | autopilot Match Rate ≥ 90% | semantic Match 100% 목표 (단순 git mv 5 + 5 callers path 치환, F584~F590 패턴 재현) |

### Bonus 검증 (P-j: dist orphan 처리)

| ID | 명세 | 측정 명령 | 기대값 |
|----|------|----------|--------|
| **P-j** | dist orphan prd-*/prototype-* cleanup | `find packages/api/dist/services \( -name "prd-*" -o -name "prototype-*" \) \| wc -l` | **0** (또는 build 재생성으로 자연 갱신, autopilot 미인식 시 수동 cleanup 28 files) |

### MSA 룰 위반 의식적 인정 (P-k: NEW)

| ID | 명세 | 측정 명령 | 기대값 |
|----|------|----------|--------|
| **P-k** | MSA cross-domain 누적 위반 정확히 20건 | `cd packages/api && pnpm exec eslint src/core/discovery/routes/biz-items.ts 2>&1 \| grep -c "no-cross-domain-import"` | **20** (18 grandfathered + 2 신규 prd-generator/prototype-generator) — 룰 우회 의식적 결정 기록 |

## 근본 원칙

- **Source-First Fix Order**: src 변경 → dist는 자동 따라옴 (autopilot이 build 재실행하면)
- **F584/F587/F588/F589/F590 패턴 재현**: 단순 git mv + callers path 갱신 (옵션 A 16회차 정착화)
- **PRD/Prototype = offering 도메인 본질**: offering 기존 11 files와 sibling 동거 (도메인 시멘틱 일관성 향상)
- **fx-offering self-contained closure 유지**: fx-offering 자체 사본은 본 sprint 무관, 미래 fx-offering 통합 전략에서 재검토
- **MSA 룰 grandfathered 의식적 인정**: lint script 스코프 한계(eslint-rules/만 검증)로 18 grandfathered 위반 catch 안됨 → 본 sprint에서 +2 추가, 별건 F-item으로 룰 강제 교정 권고

## 전제

- F590 ✅ (services/ 26→23, dual_ai_reviews 25 + hook 11 sprint 연속)
- F589 ✅ (core/harness/services/worktree-manager seed)
- F588 ✅ (core/work/ closure 5 files)
- F587 ✅ (dead code + 도메인 이동 패턴 직접 모델)
- C103 (dual_ai_reviews hook fallback) + C104 (.dev.vars 자동 복사) 11 sprint 연속 정상 (S327)

## 예상 시간

**~7~10분** (autopilot, F587 8분 14초 + F589 ~8분 + F590 7분 37초 패턴 기반). 단순 git mv 5 + 5 callers 갱신 + dist cleanup + 회귀 검증.

## Risk

| Risk | 완화 |
|------|------|
| `core/discovery/routes/biz-items.ts` import 변경 후 production runtime 회귀 | P-h-2(F582 DiagnosticCollector grep ≥ 16) + P-e turbo test 동시 강제 |
| prd-template/prototype-styles/prototype-templates transitive 의존 매핑 깨짐 | sibling import는 같은 디렉토리이므로 git mv만으로 자연 유지, P-e turbo build/test catch |
| MSA 룰 위반 +2건이 미래 strict mode에서 차단 | P-k 명시 + 본 plan에 별건 F-item 등록 권고, 본 sprint는 의식적 grandfathered 추가 |
| dist orphan 28 files autopilot 자동 인식 못 함 | P-j 강제 numerical로 catch → 수동 git rm 또는 build 재생성 |
| fx-offering 측 prd-*/prototype-* 5 files 의도치 않은 이동 (autopilot 오인식) | 본 plan 사전 측정 명시 + fx-offering self-contained 유지 명시 (autopilot 프롬프트 SCOPE LOCK 권장) |
| `__tests__/services/prototype-templates.test.ts` (sibling 디렉토리 잠재 파일) 누락 | autopilot 실행 중 grep으로 추가 파일 발견 시 동일 path 갱신, P-e turbo test catch |

## 다음 사이클 후보

- **F592** logger/llm/methodology/spec-* 등 services/ 루트 잔존 18 files 추가 정리 (P2~P3)
- **MSA 룰 강제 교정 F-item** (P3~P4) — `pnpm lint` script 스코프 src/ 전체로 확장 + grandfathered 20+건 해소 plan
- Phase 47 GAP-3 27 stale proposals 검토 루프 (P2 F-track)
- 모델 A/B Opus 4.7 vs Sonnet 4.6 (P3 F-track)
- fx-discovery worker 404 환경 issue 별도 점검 (옵션 ~30분)
- AI Foundry Phase 1 W18+ D 액션 (별도 PRD 트랙, 5/15 회의 D-day, 사용자 직접 PM)

## 참고

- F590 시드: `docs/01-plan/features/sprint-336.plan.md` (FX-PLAN-336) — 옵션 B dead+이동 패턴
- F589 시드: `docs/01-plan/features/sprint-335.plan.md` (FX-PLAN-335) — 옵션 A worktree-manager
- F588 시드: `docs/01-plan/features/sprint-334.plan.md` (FX-PLAN-334) — core/work/ closure
- F587 시드: `docs/01-plan/features/sprint-333.plan.md` (FX-PLAN-333) — dead code + 도메인 이동 2
- F584 패턴: `docs/01-plan/features/sprint-331.plan.md` (FX-PLAN-331) — 7분 8초 최단
- MSA core/{domain}/ 룰: `CLAUDE.md` MSA 원칙 섹션 + `packages/api/src/eslint-rules/no-cross-domain-import.ts`
- ESLint lint script 한계: `packages/api/package.json` lint 스크립트가 `src/eslint-rules/`만 대상
- S314 dist orphan 패턴: `MEMORY.md` feedback_dist_orphan_after_src_delete.md
- S324~S327 인터뷰 3~4회 패턴: 사전 측정 → 1차 인터뷰 → 정밀 측정 → N차 인터뷰 → plan → autopilot → OBSERVED
