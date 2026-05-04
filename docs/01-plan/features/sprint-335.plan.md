---
id: FX-PLAN-335
sprint: 335
feature: F589
req: FX-REQ-656
status: approved
date: 2026-05-04
---

# Sprint 335 Plan — F589: worktree-manager 도메인 분리 (옵션 A 15회차)

## 목표

**S325 F588(Sprint 334, PR #722 Match 100%, ~8분 15초) 후속.** F588 plan §사전 측정에서 별건 처리로 deferred 된 `services/worktree-manager.ts`를 옵션 A 15회차 패턴으로 `core/harness/services/`로 이동. services/ 루트 27 → 26 (-1) 정리. **단, S325 F588 dead code-like 패턴(api 측 production runtime 0건)이 추가 측정에서 더 정교한 구조로 드러남** — auto-rebase.test.ts에서 6회 runtime 인스턴스 + 2 type contract DI → 단순 git rm이 아닌 옵션 A 이동이 합리적.

**핵심 원칙**: F584/F585/F587/F588 옵션 A 도메인 이동 패턴 15회차 정착화. `core/harness/services/`로 자연 동거(`auto-rebase` sibling). `core/agent/services/agent-orchestrator`의 type-only 참조는 contract 예외 적용. 표면 충족 함정 20회차 회피용 P-a~P-i 9항 numerical 강제 + dist orphan 처리 부수.

**부수 효과**: dist orphan 4 files 정리 패턴(S314 교훈) 일관 적용. fx-agent 측 동명 파일은 fx-agent self-contained closure 유지(routes/agent.ts 자체 사용).

## 사전 측정 (S325, 2026-05-04 18:30 KST)

### worktree-manager 파일 위치 + callers 분포

| 위치 | 라인 | Production runtime | Type-only DI | Test runtime | 비고 |
|------|------|---------------------|--------------|--------------|------|
| `packages/api/src/services/worktree-manager.ts` | 150 | **0건** | 2건 (core/agent/agent-orchestrator + core/harness/auto-rebase) | 6건 (auto-rebase.test 6회 + 자체 unit test) | 본 sprint 이동 대상 |
| `packages/fx-agent/src/services/worktree-manager.ts` | 150 | 1건 (routes/agent.ts:953) | 2건 (fx-agent 내부) | — | **fx-agent self-contained 유지** (본 sprint 범위 외) |

**diff 결과**: 두 파일은 **2줄만 다름** (line 121/130 `agentId` ↔ `_agentId` underscore prefix). 사실상 duplicate.

### 외부 callers 갱신 대상

| 파일 | 현재 import | 신규 import | 비고 |
|------|-------------|-------------|------|
| `core/agent/services/agent-orchestrator.ts` (L11) | `import type { WorktreeManager } from "../../../services/worktree-manager.js"` | `import type { WorktreeManager } from "../../harness/services/worktree-manager.js"` | type-only, contract 예외 |
| `core/harness/services/auto-rebase.ts` (L1) | `import type { WorktreeManager } from "../../../services/worktree-manager.js"` | `import type { WorktreeManager } from "./worktree-manager.js"` | sibling |
| `__tests__/worktree-manager.test.ts` (L2) | `import { WorktreeManager } from "../services/worktree-manager.js"` | **테스트 파일 자체 이동** `core/harness/__tests__/worktree-manager.test.ts` 또는 `__tests__/services/worktree-manager.test.ts` | runtime |
| `__tests__/services/auto-rebase.test.ts` (L3) | `import { WorktreeManager } from "../../services/worktree-manager.js"` | `import { WorktreeManager } from "../../core/harness/services/worktree-manager.js"` | runtime, 6회 사용 |

**총 callers 4건** (api/src 내부) + **dist orphan 4 files** 별도.

### dist orphan 잔존 (S314 패턴)

| 파일 | 크기 | timestamp |
|------|------|-----------|
| `packages/api/dist/services/worktree-manager.js` | 3648B | 2026-05-04 14:37 |
| `packages/api/dist/services/worktree-manager.js.map` | 3519B | 2026-05-04 14:37 |
| `packages/api/dist/services/worktree-manager.d.ts` | 1356B | 2026-05-04 14:37 |
| `packages/api/dist/services/worktree-manager.d.ts.map` | 1513B | 2026-05-04 14:37 |

`tsc`는 src 삭제 시 dist 자동 정리 안 함 (S314 dist orphan 패턴). 본 sprint에서 `git rm -r packages/api/dist/services/worktree-manager.*` 또는 build 재생성 후 cleanup 필요. autopilot이 자동 인식 가능성도 있으나 P-l에서 numerical 강제.

### 인터뷰 결정 3회 (S325)

1. **1차** "F589 worktree-manager 분리" 채택 (메인 트랙 Foundry-X 코드 사이클 + F-item 우선순위)
2. **2차** 사전 측정 후 callers 0건 발견 → "Dead code 제거(E2)" 채택 (S324 F587 logger/telemetry-collector dead 패턴 연상)
3. **3차** 추가 측정에서 `auto-rebase.test.ts` runtime 6건 + 2 type contract DI 발견 → 진짜 dead code 아님 → "**옵션 A core/harness/services/ 이동 (15회차)**" 재결정

3번의 인터뷰가 표면 충족 함정 20회차 회피의 보장. 단순 git rm으로 진행했으면 auto-rebase.test 6 runtime 호출 깨짐 + type contract 2 깨짐 + 하위 호환성 risk. 옵션 A 이동은 구조 정합성 + duplicate 해소(2줄 차이)는 별건 처리.

### core/harness/services/ 도메인 현황 (이동 후 예상)

```
packages/api/src/core/harness/services/
├── auto-fix.ts (기존)
├── auto-rebase.ts (기존, type-import sibling으로 갱신)
├── monitoring.ts (F587 sprint 333 시드)
└── worktree-manager.ts (본 sprint 신설, 150L) ← 이동
```

`worktree-manager`는 git worktree CRUD 유틸리티 — `auto-rebase`(rebase 자동화)와 같은 harness 도메인(작업 환경 관리). 자연스러운 동거.

### services/ 루트 직속 .ts 변화

```
이전 (S325 F588 이후): 27 files
본 sprint 이후: 26 files (worktree-manager.ts 1 file 이동)
```

## 범위

### 코드 변경

#### (a) git mv + 자체 unit test 동반 이동
- `git mv packages/api/src/services/worktree-manager.ts packages/api/src/core/harness/services/worktree-manager.ts`
- `git mv packages/api/src/__tests__/worktree-manager.test.ts packages/api/src/__tests__/services/worktree-manager.test.ts` (또는 그대로 유지하되 import path만 갱신)

#### (b) callers 4건 import path 갱신
- `core/agent/services/agent-orchestrator.ts:11` (type-only):
  - `from "../../../services/worktree-manager.js"` → `from "../../harness/services/worktree-manager.js"`
  - cross-domain type contract 예외 (core/agent → core/harness/services type-only) — CLAUDE.md MSA 룰 "예외: 상대방 도메인의 types.ts(contract) 파일만 허용" 적용
- `core/harness/services/auto-rebase.ts:1` (type-only):
  - `from "../../../services/worktree-manager.js"` → `from "./worktree-manager.js"` (sibling)
- `__tests__/services/auto-rebase.test.ts:3` (runtime, 6회 사용):
  - `from "../../services/worktree-manager.js"` → `from "../../core/harness/services/worktree-manager.js"`
- `__tests__/worktree-manager.test.ts` (자체 unit test):
  - 위치 이동 후 `from "../services/worktree-manager.js"` → `from "../../core/harness/services/worktree-manager.js"` 또는 `from "../core/harness/services/worktree-manager.js"`

#### (c) dist orphan cleanup (S314 패턴)
- `git rm packages/api/dist/services/worktree-manager.{js,js.map,d.ts,d.ts.map}` (4 files)
- 또는 build 재생성으로 자연 삭제 후 git add 변경

### 검증

#### (d) packages/api typecheck + lint + tests 회귀 GREEN
- turbo typecheck 19/19 + 2308+ tests passed
- auto-rebase.test 6 runtime 호출 GREEN 유지

## OBSERVED Phase Exit P-a~P-i Smoke Reality 9항

### F589 핵심 검증 (P-a~P-d)

| ID | 명세 | 측정 명령 | 기대값 |
|----|------|----------|--------|
| **P-a** | services/ 루트 worktree-manager.ts 사라짐 | `find packages/api/src/services -maxdepth 1 -name "worktree-manager*" \| wc -l` | **0** |
| **P-b** | core/harness/services/worktree-manager.ts 신설 | `find packages/api/src/core/harness/services -name "worktree-manager*" \| wc -l` | **1** |
| **P-c** | services/ 루트 직속 .ts 26 files | `find packages/api/src/services -maxdepth 1 -name "*.ts" \| wc -l` | **26** (27-1) |
| **P-d** | 외부 callers 잔존 OLD import 0건 | `grep -rn "../../../services/worktree-manager\|../../services/worktree-manager" packages/api/src --include="*.ts"` | **0건** (4 callers 모두 신규 path) |

### 검증 인프라 (P-e~P-g)

| ID | 명세 | 기대값 |
|----|------|--------|
| **P-e** | typecheck + tests GREEN | turbo typecheck 19/19 + tests passed |
| **P-f** | dual_ai_reviews sprint 335 자동 INSERT ≥ 1건 | 누적 ≥ 23건 (S325 22 → 23+, hook 10 sprint 연속 검증) |
| **P-g** | C103 fallback hook 자동 trigger 확증 | `save-dual-review-335.log` 생성, verdict 기록 |

### 회귀 검증 (P-h: 8 항)

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

### Match Rate (P-i)

| ID | 명세 | 기대값 |
|----|------|--------|
| **P-i** | autopilot Match Rate ≥ 90% | semantic Match 100% 목표 (옵션 A 15회차 정착화 + 4 callers 단순 path 치환) |

### Bonus 검증 (P-j: dist orphan 처리)

| ID | 명세 | 측정 명령 | 기대값 |
|----|------|----------|--------|
| **P-j** | dist orphan 4 files cleanup | `find packages/api/dist/services -name "worktree-manager*" \| wc -l` | **0** (또는 build 재생성으로 자연 갱신, autopilot이 인식 못 하면 수동 cleanup) |

## 근본 원칙

- **Source-First Fix Order**: src 변경 → dist는 자동 따라옴 (autopilot이 build 재실행하면)
- **옵션 A 15회차 정착화**: F579/F581/F583/F584/F585/F587/F588 패턴 — `core/{domain}/services/` 이동 + callers path 치환
- **MSA `core/{domain}/` 룰 부분 복원**: services/ 루트에서 도메인 분리, cross-domain type contract만 예외
- **fx-agent self-contained closure 유지**: 본 sprint는 main-api 측만 정리, fx-agent worktree-manager는 자체 routes/agent.ts 사용 그대로

## 전제

- F587 ✅ (core/work/services/traceability.service seed)
- F588 ✅ (core/work/ closure 5 files)
- C103 (dual_ai_reviews hook fallback) + C104 (.dev.vars 자동 복사) 9 sprint 연속 정상 (S325)

## 예상 시간

**~8~12분** (autopilot, F587 8분 14초 + F588 8분 15초 패턴 기반). 단순 git mv + 4 callers 갱신 + dist cleanup + 회귀 검증.

## Risk

| Risk | 완화 |
|------|------|
| `core/agent/services/agent-orchestrator.ts` cross-domain type-only import → ESLint `no-cross-domain-import` 룰 위반 가능성 | type-only는 contract 예외 (CLAUDE.md MSA 룰 명시). lint 위반 시 P-e에서 catch → 추가 ESLint 설정 또는 shared/types 분리 fallback |
| `auto-rebase.test.ts` runtime 6 callers 갱신 누락 | P-d grep + P-e test GREEN 동시 강제 |
| 자체 unit test 위치 결정 (이동 vs 유지 import만 갱신) | autopilot이 자동 결정. P-d에서 OLD import 0건 + P-e GREEN 충족 시 양쪽 다 acceptable |
| dist orphan 4 files autopilot 자동 인식 못 함 | P-j 강제 numerical로 catch → 수동 git rm 또는 build 재생성 |
| fx-agent 측 worktree-manager.ts 의도치 않은 이동 (autopilot 오인식) | 본 plan 사전 측정 명시 + P-h-h 회귀 항목 (없음, 별도 numerical 강제 없으나 명시 보호) |

## 다음 사이클 후보

- **F590** pm-skills 4 files 도메인 분리 (P2~P3)
- **F591** prd/prototype 7 files 도메인 분리 (P2~P3)
- **F592** logger/llm/methodology 등 services/ 루트 잔존 추가 정리 (P2~P3)
- Phase 47 GAP-3 27 stale proposals 검토 루프 (P2 F-track)
- 모델 A/B Opus 4.7 vs Sonnet 4.6 (P3 F-track)
- F586 P-m 운영자 KOAMI Dogfood 1회 실행 (별건)
- AI Foundry Phase 1 W18 활동 (별도 PRD 트랙, 시간 민감도 高 — 5/15(금) 회의 D-day, 5/22 H1 Red 자동 전환)

## 참고

- F588 시드: `docs/01-plan/features/sprint-334.plan.md` (FX-PLAN-334) — work 도메인 closure
- F587 시드: `docs/01-plan/features/sprint-333.plan.md` (FX-PLAN-333) — dead code + 도메인 이동 2
- F584 패턴 정착화: `docs/01-plan/features/sprint-331.plan.md` (FX-PLAN-331) — 7분 8초 최단
- MSA core/{domain}/ 룰: `CLAUDE.md` MSA 원칙 섹션
- S314 dist orphan 패턴: `MEMORY.md` feedback_dist_orphan_after_src_delete.md
- S324 인터뷰 회차 패턴: 사전 측정 → 1차 인터뷰 → 정밀 측정 → 2차/3차 인터뷰 → plan → autopilot → OBSERVED
