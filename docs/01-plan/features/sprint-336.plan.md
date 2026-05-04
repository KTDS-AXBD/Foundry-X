---
id: FX-PLAN-336
sprint: 336
feature: F590
req: FX-REQ-657
status: approved
date: 2026-05-04
---

# Sprint 336 Plan — F590: pm-skills dead code 2 git rm + 1 도메인 이동 (옵션 B, F587 패턴 재현)

## 목표

**S326 F589(Sprint 335, PR #724 Match 100%, ~8분) 후속.** services/ 루트 26 files 중 pm-skills 도메인을 인터뷰 3회 패턴으로 정밀 분석한 결과 **dead code 2 + 정상 이동 1**의 F587 패턴 재현 발견. dead code 2 git rm + pm-skills-guide → core/discovery/services/로 자연 동거. services/ 루트 26 → 23 (-3) 정리.

**핵심 원칙**: F587(Sprint 333 — logger/telemetry-collector dead 2 git rm + monitoring/traceability 도메인 이동 2) 패턴 직접 재현. fx-offering self-contained closure 유지(별건). pm-skills-guide의 single production caller `core/discovery/services/analysis-context.ts:6`를 sibling import로 자연스럽게 갱신. 표면 충족 함정 21회차 회피용 P-a~P-j 10항 numerical 강제.

**부수 효과**: dist orphan 패턴(S314 교훈) 21회차 일관 적용. fx-offering 측 동명 3 files는 self-contained 유지(routes/methodology.ts 자체 사용 그대로).

## 사전 측정 (S327, 2026-05-04 20:35 KST)

### pm-skills 파일 위치 + callers 분포

| 파일 | 라인 | api/src callers (production) | api/src callers (test) | api/src callers (sibling) | fx-agent 사본 | fx-offering 사본 | 분류 |
|------|------|------------------------------|------------------------|---------------------------|---------------|-------------------|------|
| `services/pm-skills-guide.ts` | 136 | **1** (`core/discovery/services/analysis-context.ts:6`) | 1 (`__tests__/pm-skills-guide.test.ts`) | 1 (`services/pm-skills-pipeline.ts:6`, dead-by-association) | 없음 | 있음 (`fx-offering/src/services/pm-skills-guide.ts`) | **이동 (도메인=discovery)** |
| `services/pm-skills-module.ts` | 103 | **0** | 0 | 0 | 없음 | 있음 (`fx-offering/src/services/pm-skills-module.ts` + `routes/methodology.ts:21`) | **DEAD CODE git rm** |
| `services/pm-skills-pipeline.ts` | 134 | **0** | 1 (`__tests__/pm-skills-pipeline.test.ts`) | 1 (`services/pm-skills-module.ts:14`, dead-caller) | 없음 | 있음 (`fx-offering/src/services/pm-skills-pipeline.ts`) | **effectively DEAD git rm** |

**총 373 lines** (api/src/services/ 루트). **dead code 패턴 확증**: pm-skills-module api/src callers 0건 (F587 logger 패턴 재현). pm-skills-pipeline은 module의 dead-caller만 있어서 **dead-by-association**.

### 외부 callers 갱신 대상 (이동 1 file)

| 파일 | 현재 import | 신규 import | 비고 |
|------|-------------|-------------|------|
| `core/discovery/services/analysis-context.ts:6` | `import { getSkillGuide, type PmSkillGuide } from "../../../services/pm-skills-guide.js"` | `import { getSkillGuide, type PmSkillGuide } from "./pm-skills-guide.js"` | sibling, production runtime |
| `__tests__/pm-skills-guide.test.ts:2` | `import { ... } from "../services/pm-skills-guide.js"` | `import { ... } from "../core/discovery/services/pm-skills-guide.js"` | test runtime |

**총 callers 2건** 갱신 + git rm dead 2 files + git rm pm-skills-pipeline.test.ts (dead test).

### dist orphan 잔존 (S314 패턴 21회차)

```
packages/api/dist/services/pm-skills-guide.{js,js.map,d.ts,d.ts.map}     # 4 files (mv 후 위치 옮겨야)
packages/api/dist/services/pm-skills-module.{js,js.map,d.ts,d.ts.map}    # 4 files (rm 대상)
packages/api/dist/services/pm-skills-pipeline.{js,js.map,d.ts,d.ts.map}  # 4 files (rm 대상)
```

`tsc`는 src 삭제 시 dist 자동 정리 안 함. 본 sprint에서 `git rm -r packages/api/dist/services/pm-skills*` 또는 build 재생성 후 cleanup 필요. autopilot이 자동 인식 가능성도 있으나 P-j numerical 강제.

### 인터뷰 3회 결정 (S327)

1. **1차** "F590 pm-skills 4 files 도메인 분리" 채택 (메인 트랙 Foundry-X 코드 사이클 + F-item 우선순위, MEMORY.md 기록)
2. **2차** 사전 측정 후 실제 **3 files** 발견 (`pm-skills-criteria.ts`는 이미 `core/discovery/services/`에 분리되어 있음) + `pm-skills-module.ts` api callers **0건** (DEAD CODE 패턴)
3. **3차** **옵션 B 채택** — dead code 2 git rm + pm-skills-guide → core/discovery/services/ 이동. F587 패턴 직접 재현, services/ 26→23 (-3)

3번의 인터뷰가 표면 충족 함정 21회차 회피의 보장. 옵션 A(3 files 모두 이동)로 갔다면 dead code 2 보존 + autopilot 16회차 패턴 정착화. 옵션 B는 정직한 정리 — fx-offering이 self-contained로 자체 사본 사용 중이므로 api 측 dead 2 보존 의미 없음.

### core/discovery/services/ 도메인 현황 (이동 후 예상)

```
packages/api/src/core/discovery/services/
├── analysis-context.ts (기존 — pm-skills-guide consumer)
├── analysis-paths.ts (기존)
├── pm-skills-criteria.ts (기존)
├── pm-skills-guide.ts (본 sprint 신설, 136L) ← 이동
└── ...
```

`pm-skills-guide`는 PM 스킬 메타데이터 + 가이드(`getSkillGuide()`) — `analysis-context`(분석 컨텍스트 빌드)에서 직접 사용. 자연스러운 동거.

### services/ 루트 직속 .ts 변화

```
이전 (S326 F589 이후): 26 files
본 sprint 이후: 23 files (-3 = pm-skills-module rm + pm-skills-pipeline rm + pm-skills-guide 이동)
```

## 범위

### 코드 변경

#### (a) Dead code 2 git rm + 관련 test 1 git rm
- `git rm packages/api/src/services/pm-skills-module.ts` (api/src callers 0건, 103L)
- `git rm packages/api/src/services/pm-skills-pipeline.ts` (api/src production callers 0건, dead-caller만 있음, 134L)
- `git rm packages/api/src/__tests__/pm-skills-pipeline.test.ts` (dead 코드 대상 test)

#### (b) pm-skills-guide → core/discovery/services/ 이동
- `git mv packages/api/src/services/pm-skills-guide.ts packages/api/src/core/discovery/services/pm-skills-guide.ts`

#### (c) callers 2건 import path 갱신
- `core/discovery/services/analysis-context.ts:6` (production runtime):
  - `from "../../../services/pm-skills-guide.js"` → `from "./pm-skills-guide.js"` (sibling)
- `__tests__/pm-skills-guide.test.ts:2` (test runtime):
  - `from "../services/pm-skills-guide.js"` → `from "../core/discovery/services/pm-skills-guide.js"`

#### (d) dist orphan cleanup (S314 패턴 21회차)
- `git rm -r packages/api/dist/services/pm-skills-{guide,module,pipeline}.{js,js.map,d.ts,d.ts.map}` (12 files)
- 또는 build 재생성으로 자연 삭제 (`rm -rf packages/api/dist && pnpm build`)

### 검증

#### (e) packages/api typecheck + lint + tests 회귀 GREEN
- turbo typecheck 19/19 + 2308+ tests passed
- pm-skills-guide.test.ts (이동 후 path 갱신) GREEN 유지
- `analysis-context.ts` import path 변경 후 turbo build 무회귀

## OBSERVED Phase Exit P-a~P-j Smoke Reality 10항

### F590 핵심 검증 (P-a~P-d)

| ID | 명세 | 측정 명령 | 기대값 |
|----|------|----------|--------|
| **P-a** | services/ 루트 pm-skills* 사라짐 | `find packages/api/src/services -maxdepth 1 -name "pm-skills*" \| wc -l` | **0** |
| **P-b** | core/discovery/services/pm-skills-guide.ts 신설 | `find packages/api/src/core/discovery/services -name "pm-skills-guide*" \| wc -l` | **1** |
| **P-c** | services/ 루트 직속 .ts 23 files | `find packages/api/src/services -maxdepth 1 -name "*.ts" \| wc -l` | **23** (26-3) |
| **P-d** | 외부 callers 잔존 OLD import 0건 | `grep -rn "../../../services/pm-skills-guide\|../services/pm-skills-guide\|services/pm-skills-module\|services/pm-skills-pipeline" packages/api/src --include="*.ts" \| grep -v "core/discovery/services"` | **0건** (2 callers 신규 path + dead 2 사라짐) |

### 검증 인프라 (P-e~P-g)

| ID | 명세 | 기대값 |
|----|------|--------|
| **P-e** | typecheck + tests GREEN | turbo typecheck 19/19 + tests passed |
| **P-f** | dual_ai_reviews sprint 336 자동 INSERT ≥ 1건 | 누적 ≥ 25건 (S326 24 → 25+, hook 11 sprint 연속 검증) |
| **P-g** | C103 fallback hook 자동 trigger 확증 | `save-dual-review-336.log` 생성, verdict 기록 |

### 회귀 검증 (P-h: 9 항)

| ID | 명세 | 기대값 |
|----|------|--------|
| **P-h-1** | F560 fx-discovery 401 회귀 0건 | curl 401 일관 |
| **P-h-2** | F582 DiagnosticCollector 인프라 살아있음 | grep ≥ 16 (S324 baseline) |
| **P-h-3** | F583 services/agent = 0 유지 | `find packages/api/src/services/agent \| wc -l` = 0 |
| **P-h-4** | F584 model-router core/agent/services 위치 | grep = 1 |
| **P-h-5** | F585 core/agent/services 7 files 유지 | `find packages/api/src/core/agent/services \| wc -l` ≥ 7 |
| **P-h-6** | F586 outputTokens grep 회귀 0건 | grep ≥ 16 |
| **P-h-7** | F587 core/work/services/traceability.service 유지 | `find packages/api/src/core/work/services/traceability.service.ts` = 1 |
| **P-h-8** | F588 core/work/ 5 files closure 유지 | `find packages/api/src/core/work \| wc -l` ≥ 5 |
| **P-h-9** | F589 core/harness/services/worktree-manager 유지 | `find packages/api/src/core/harness/services/worktree-manager*` = 1 |

### Match Rate (P-i)

| ID | 명세 | 기대값 |
|----|------|--------|
| **P-i** | autopilot Match Rate ≥ 90% | semantic Match 100% 목표 (옵션 B F587 재현 + dead 2 git rm + 1 이동 + 2 callers 단순 path 치환) |

### Bonus 검증 (P-j: dist orphan 처리)

| ID | 명세 | 측정 명령 | 기대값 |
|----|------|----------|--------|
| **P-j** | dist orphan pm-skills* cleanup | `find packages/api/dist/services -name "pm-skills*" \| wc -l` | **0** (또는 build 재생성으로 자연 갱신, autopilot이 인식 못 하면 수동 cleanup) |

## 근본 원칙

- **Source-First Fix Order**: src 변경 → dist는 자동 따라옴 (autopilot이 build 재실행하면)
- **F587 dead code + 도메인 이동 패턴 재현**: dead code 정직한 정리 + 살아있는 file 자연 동거
- **fx-offering self-contained closure 유지**: 본 sprint는 main-api 측만 정리, fx-offering pm-skills 3 files는 자체 routes/methodology.ts 사용 그대로 (별건, 미래 fx-offering 통합 전략에서 재검토)
- **MSA `core/{domain}/` 룰 부분 복원**: services/ 루트에서 도메인 분리, dead code 보존 의미 없음

## 전제

- F589 ✅ (core/harness/services/worktree-manager seed)
- F588 ✅ (core/work/ closure 5 files)
- F587 ✅ (dead code + 도메인 이동 패턴 직접 모델)
- C103 (dual_ai_reviews hook fallback) + C104 (.dev.vars 자동 복사) 10 sprint 연속 정상 (S326)

## 예상 시간

**~7~10분** (autopilot, F587 8분 14초 + F589 ~8분 패턴 기반). 단순 git rm 3 + git mv 1 + 2 callers 갱신 + dist cleanup + 회귀 검증.

## Risk

| Risk | 완화 |
|------|------|
| `core/discovery/services/analysis-context.ts` import 변경 후 production runtime 회귀 | P-h-2(F582 DiagnosticCollector grep ≥ 16) + P-e turbo test 동시 강제 |
| dead code git rm이 진짜 dead 아닌 케이스(미발견 외부 caller) | P-d grep 광범위 패턴 + P-e turbo build/test 동시 강제 (catch 시 git revert) |
| pm-skills-pipeline.test.ts 삭제 후 미사용 import 잔존 | P-e turbo lint + typecheck (양쪽 다 catch) |
| dist orphan 12 files autopilot 자동 인식 못 함 | P-j 강제 numerical로 catch → 수동 git rm 또는 build 재생성 |
| fx-offering 측 pm-skills 3 files 의도치 않은 이동 (autopilot 오인식) | 본 plan 사전 측정 명시 + fx-offering self-contained 유지 명시 (autopilot 프롬프트에 SCOPE LOCK 포함 권장) |

## 다음 사이클 후보

- **F591** prd/prototype 7 files 도메인 분리 (P2~P3)
- **F592** logger/llm/methodology 등 services/ 루트 잔존 추가 정리 (P2~P3)
- Phase 47 GAP-3 27 stale proposals 검토 루프 (P2 F-track)
- 모델 A/B Opus 4.7 vs Sonnet 4.6 (P3 F-track)
- AI Foundry Phase 1 W18 활동 (별도 PRD 트랙, 시간 민감도 高 — 5/15(금) 회의 D-day, 5/22 H1 Red 자동 전환)

## 참고

- F587 시드: `docs/01-plan/features/sprint-333.plan.md` (FX-PLAN-333) — dead code + 도메인 이동 2 직접 모델
- F589 시드: `docs/01-plan/features/sprint-335.plan.md` (FX-PLAN-335) — autopilot ~8분 패턴
- F588 시드: `docs/01-plan/features/sprint-334.plan.md` (FX-PLAN-334) — core/work/ closure
- F584 패턴 정착화: `docs/01-plan/features/sprint-331.plan.md` (FX-PLAN-331) — 7분 8초 최단
- MSA core/{domain}/ 룰: `CLAUDE.md` MSA 원칙 섹션
- S314 dist orphan 패턴: `MEMORY.md` feedback_dist_orphan_after_src_delete.md
- S324~S327 인터뷰 3회 패턴: 사전 측정 → 1차 인터뷰 → 정밀 측정 → 2차/3차 인터뷰 → plan → autopilot → OBSERVED
