---
id: FX-PLAN-330
sprint: 330
feature: F583
req: FX-REQ-650
status: approved
date: 2026-05-04
---

# Sprint 330 Plan — F583: services/agent heavy 2 files deduplicate (옵션 C, fx-agent SSOT) — Phase 46 100% literal 종결

## 목표

**F581 후속 (Sprint 329, PR #711 Match 100% semantic 100%).** services/agent **2 files 잔존(heavy 2)**을 fx-agent 측 SSOT로 deduplicate해서 Phase 46 **100% literal** 종결을 달성한다. 즉, `find packages/api/src/services/agent -type f -name "*.ts" | wc -l = 0` 도달.

**핵심 원칙**: fx-agent 측 동명 파일이 self-contained임을 사전 측정(execution-types DIFF=NONE + agent-runner 3 import path만 차이)으로 확증한 상태. 67 callers(test 18 + source 49)의 import path를 fx-agent 측 SSOT로 일괄 갱신해서 단일 PR squash로 종결한다.

**OBSERVED 강제 13항 (F581 8항 + F583 고유 5항)** — 표면 충족 함정 15회차 회피.

## 사전 측정 (S321, 2026-05-04)

### 잔존 2 files

| 파일 | callers (총) | fx-agent DUP | DIFF | 처리 부담 |
|------|-------------|-------------|------|---------|
| `packages/api/src/services/agent/agent-runner.ts` | **37** | ✓ exists | YES (3 import path만 차이) | medium |
| `packages/api/src/services/agent/execution-types.ts` | **30** | ✓ exists | **NONE** (완전 동일) | light |

### Callers 분포 (총 67건)

**agent-runner.ts (37 callers)**:

| 분류 | 수 | 파일 |
|------|----|------|
| __tests__ | 13 | biz-items-prd-persona, biz-items-starting-point, biz-items, biz-persona-evaluator, collection-pipeline, discovery-graph-service, evaluator-optimizer, item-classifier, prd-persona-evaluator, prototype-generator, sixhats-debate, starting-point-classifier, trend-data |
| core/agent/services | 12 | agent-adapter-factory, architect-agent, claude-api-runner, graphs/discovery-graph, infra-agent, mcp-adapter, openrouter-runner, qa-agent, security-agent, test-agent (+ 2) |
| core/discovery/services + routes | 8 | biz-items, discovery-stage-runner, agent-collector, competitor-scanner, discovery-graph-service, item-classifier, stage-runner-service, starting-point-classifier, trend-data-service |
| core/harness/services | 3 | auto-fix, auto-rebase, evaluator-optimizer |
| core/offering/services | 3 | bp-prd-generator, business-plan-generator, prd-interview-service |
| core/shaping/services | 2 | biz-persona-evaluator, sixhats-debate |
| core/collection/routes | 1 | collection |
| services (root) | 2 | prd-generator, prototype-generator |
| adapters | (포함) | (test의 경우 인접) |

**execution-types.ts (30 callers)**:

| 분류 | 수 | 파일 |
|------|----|------|
| __tests__ | 5 | biz-persona-evaluator, evaluator-optimizer, item-classifier, prd-persona-evaluator, starting-point-classifier |
| core/agent/services | 13 | agent-adapter-factory, architect-agent, claude-api-runner, diagnostic-collector, infra-agent, mcp-adapter, mcp-runner, openrouter-runner, planner-agent, prompt-utils, qa-agent, security-agent, test-agent |
| core/discovery/services | 7 | agent-collector, competitor-scanner, item-classifier, stage-runner-service, starting-point-classifier, trend-data-service (+ 1) |
| core/harness/services | 2 | auto-fix, evaluator-optimizer |
| core/shaping/services | 2 | biz-persona-evaluator, bmc-insight-service |
| core/collection/services | 1 | insight-agent-service |
| modules/gate/services | 1 | evaluation-criteria |

### fx-agent SSOT 확증

```bash
# fx-agent 측 deps closure (self-contained)
ls packages/fx-agent/src/services/ | grep -E "agent-runner|claude-api|execution-types|mcp-adapter|model-router|openrouter"
# → agent-runner.ts, claude-api-runner.ts, execution-types.ts, mcp-adapter.ts, model-router.ts, openrouter-runner.ts, openrouter-service.ts

# agent-runner main-api vs fx-agent diff
diff packages/api/src/services/agent/agent-runner.ts packages/fx-agent/src/services/agent-runner.ts
# → 3 lines (import path만):
#   ../../core/agent/services/claude-api-runner.js → ./claude-api-runner.js
#   ../../core/agent/services/openrouter-runner.js → ./openrouter-runner.js
#   ../model-router.js → ./model-router.js

# execution-types diff
diff packages/api/src/services/agent/execution-types.ts packages/fx-agent/src/services/execution-types.ts
# → 0 (완전 동일)
```

### 인터뷰 결정 (S321)

| 옵션 | 채택? | 사유 |
|------|------|------|
| **A. core/agent/services/로 이동** (F581 패턴) | ❌ | fx-agent 분리 의도와 괴리. MSA core/{domain}/ 룰 부분 복원이지만 진정 fx-agent 이전은 다음 sprint 이월 |
| **B. fx-agent service binding 전환** | ❌ | 67 callers cross-package binding 전환 risk 高, autopilot 복잡도 高 |
| **C. fx-agent SSOT deduplicate** | ✅ | execution-types DIFF=NONE + agent-runner DIFF=path만 → fx-agent 측 SSOT 자명. 67 callers는 단순 import path 치환만, 단일 PR squash 가능 |

## §3 OBSERVED P-a~P-m Numerical 강제 (autopilot 표면 충족 함정 15회차 회피)

| ID | 항목 | OBSERVED 측정 명령 | PASS 조건 |
|----|------|-------------------|-----------|
| P-a | services/agent files count | `find packages/api/src/services/agent -type f -name "*.ts" \| wc -l` | = **0** (Phase 46 100% literal 종결) |
| P-b | fx-agent에 agent-runner+execution-types 잔존 | `[ -f packages/fx-agent/src/services/agent-runner.ts ] && [ -f packages/fx-agent/src/services/execution-types.ts ]` | 둘 다 존재 ✓ |
| P-c | 외부 callers 잔존 import 0건 | `grep -rEn "from .*services/agent/(agent-runner\|execution-types)" packages/ \| grep -v "packages/fx-agent" \| wc -l` | = **0** (67건 모두 갱신) |
| P-d | typecheck + lint + tests GREEN | `turbo typecheck && turbo lint && turbo test` | turbo 19/19, fail = 0 |
| P-e | dual_ai_reviews 자동 INSERT (sprint 330) | `wrangler d1 execute foundry-x-db --remote --command="SELECT COUNT(*) FROM dual_ai_reviews WHERE sprint_id=330"` | ≥ **1** (누적 ≥ **13**) |
| P-f | F560 회귀 0건 | fx-discovery 7 routes 401 응답 일관 (인증 필요 정상) | 401 일관 |
| P-g | F582 회귀 0건 | fx-discovery `discovery-stage.service.ts` `DiagnosticCollector + autoTriggerMetaAgent` 호출 위치 grep | ≥ 21 (sprint 시작 시 = sprint 329 결과 그대로) |
| P-h | Phase 46 100% literal 종결 확증 | SPEC.md §5 F583 row status `🔧→✅` + Phase 46 종결 명시 | row 갱신 + commit log "Phase 46 100% literal" 포함 |
| **P-i** | **(F583 고유)** api/services/model-router.ts 잔존 명시 | `[ -f packages/api/src/services/model-router.ts ] && grep -l "model-router" SPEC.md` | 별건 명시 (F584 후보 또는 services 정리 항목) |
| **P-j** | **(F583 고유)** fx-agent self-contained closure 확증 | `grep -rEn "from .*core/agent/services" packages/fx-agent/src/ \| wc -l` | = **0** (fx-agent 측이 main-api core/agent/services 참조 0건) |
| **P-k** | **(F583 고유)** codex_verdict 분포 추적 | `wrangler d1 execute foundry-x-db --remote --command="SELECT codex_verdict, COUNT(*) FROM dual_ai_reviews GROUP BY codex_verdict"` | PASS/PASS-degraded/BLOCK 분포 기록 (정량 PASS 조건 없음, 추세 관찰용) |
| **P-l** | **(F583 고유)** agent_run_metrics 회귀 0건 | `wrangler d1 execute foundry-x-db --remote --command="SELECT COUNT(*) FROM agent_run_metrics"` | ≥ 116 (F582 인프라 가동 유지 — 신규 INSERT 없어도 stale 116 유지) |
| **P-m** | **(F583 고유)** services/agent 디렉토리 git 추적 제거 | `git ls-files packages/api/src/services/agent/ \| wc -l` | = **0** (git rm 완료) |

> **자동 INSERT 검증 핵심**: P-e dual_ai_reviews는 sprint 종료 hook(C103 + C104 확증됨)이 자동 trigger. autopilot이 "측정 안 함"으로 임의 skip 못 하도록 Plan에 측정 명령 명시.

> **표면 충족 함정 회피**: P-a (= 0)와 P-c (= 0)는 동시 충족이 필수다. P-a만 충족 + P-c 잔존 import는 git rm 후 import 깨진 상태 → P-d FAIL로 자동 감지된다. P-j는 fx-agent SSOT 정합성 검증 — 만약 fx-agent가 여전히 main-api core/agent/services를 참조한다면 deduplicate 의도 미충족.

## 파일 매핑

### 삭제 (heavy 2)

| 파일 | callers (갱신 대상) |
|------|---------|
| `packages/api/src/services/agent/agent-runner.ts` | **37** |
| `packages/api/src/services/agent/execution-types.ts` | **30** |

### 갱신 (callers 67건)

import 경로 변경만 — `from "../../services/agent/agent-runner"` 또는 `from "../../services/agent/execution-types"` → fx-agent 측 SSOT 사용:

**옵션 1**: monorepo workspace import — `from "@foundry-x/fx-agent/services/agent-runner"` (build-time alias 또는 tsconfig paths)
**옵션 2**: 상대 경로 — `from "../../../fx-agent/src/services/agent-runner"` (cross-package import — 권장 안 함)
**옵션 3**: API service binding — fx-agent Worker에 RPC method 노출 후 main-api에서 binding 호출 (가장 큰 변경, F583 범위 외)

> **autopilot 결정**: F578~F581 사이에 services/agent → core/agent/services 패턴이 정착했으므로 **옵션 1 (workspace import)**가 가장 자연스럽다. 단 fx-agent의 export 정책이 만약 단일 entry (`packages/fx-agent/src/index.ts`)만 노출한다면 entry에 추가 export 필요. autopilot이 결정.

### 변경 없음

- `packages/api/src/services/model-router.ts` — fx-agent 측에 동명 파일 있으나 main-api 측 다른 callers가 있음 (P-i 별건 명시)
- `packages/api/src/core/agent/services/{claude-api-runner,openrouter-runner,mcp-adapter}.ts` — F581 결정 그대로 유지 (Phase 46 후속 별도 사이클 또는 Phase 47에서 처리)

## 위험 / Rollback

- **위험 1**: fx-agent export 정책 — fx-agent가 단일 `index.ts` entry만 노출하면 67 import path가 컴파일 에러. 사전 점검: `cat packages/fx-agent/src/index.ts` 또는 `packages/fx-agent/package.json` `exports` 필드 확인. 없으면 fx-agent index에 `export * from "./services/agent-runner"`/`./services/execution-types` 추가
- **위험 2**: tsconfig paths alias 미설정 — `@foundry-x/fx-agent/*` 패턴이 동작하지 않으면 패키지 export 또는 alias 설정 필요. 사전 점검: `packages/api/tsconfig.json` paths 필드 + `packages/fx-agent/package.json` exports
- **위험 3**: workspace dep 순환 — fx-agent가 packages/api에 의존성이 있으면 순환 import 위험. 사전 점검: `pnpm why @foundry-x/api --filter @foundry-x/fx-agent` 또는 `cat packages/fx-agent/package.json` dependencies 확인. 없을 것으로 예상되나 사전 확증 필요
- **위험 4**: heavy 2 file 자체에 main-api 전용 코드 path가 숨어있을 가능성 (DIFF=path만 분석은 import만 비교, body 전체 비교 필수) — Red phase 시 vimdiff 또는 bash diff 전체 출력으로 검증
- **Rollback**: 단일 PR squash → revert로 즉시 원복. F581 직전 상태 (services/agent 2 files 잔존) 복귀

## 사전 조건

- F581 ✅ (Phase 46 100% semantic 종결, services/agent 16→2)
- F582 ✅ (GAP-4 회복, fx-discovery DiagnosticCollector + autoTriggerMetaAgent 배선)
- C103+C104 ✅ (silent fail layer 1~5 종결, dual_ai_reviews hook 자동 trigger 검증)
- fx-agent 측 동명 2 files 존재 + DIFF 분석 완료 (S321 사전 측정)

## 일정

- **autopilot 예상**: 1.5~2.5시간 (sprint 329 12분 32초 갱신 가능성 — 67 callers 단순 path 치환은 sed 가능, dependency closure 검증이 핵심)
- **WT**: `bash -i -c "sprint 330"` → `ccs --model sonnet` → `/ax:sprint-autopilot`
- **Plan §3 OBSERVED P-a~P-m 13항 numerical 강제**가 표면 충족 함정 15회차 회피 무기

## 후속 (deferred)

- **F584** (후보) — `packages/api/src/services/model-router.ts` + 기타 services/ 루트 잔존 정리 (P-i 별건). fx-agent 측 동명 파일 동등성 검증 후 deduplicate 가능
- **Phase 47 GAP-2** output_tokens=0 (P2 C-track)
- **Phase 47 GAP-3** 27 stale proposals 검토 루프 (P2 F-track)
- **모델 A/B** Opus 4.7 vs Sonnet 4.6 (P3)
- **F582 P-d** 운영자 KOAMI Dogfood 1회 실행 (별건 운영 작업)
- **AI Foundry Phase 1 트랙** — `docs/specs/ai-foundry-phase1/` Draft → 별도 PRD 트랙으로 운영. SPEC §3 Phase 47에는 편입하지 않음 (Foundry-X 코드 도메인 외 전략 자료)

## Insight

- **deduplicate 패턴 정착**: F578(분류) → F579(deduplicate light 14) → F580(contract+이전 8) → F581(이동 14) → **F583(deduplicate heavy 2)** = 점진적 종결 경로의 마지막 한 걸음. fx-agent 측 SSOT 신뢰 증명을 단계마다 누적
- **DIFF=NONE 우선 원칙**: execution-types는 DIFF=NONE이라 risk 0. agent-runner는 import path 3건 차이라 fx-agent 측이 사실상 main-api의 superset (self-contained closure)
- **sprint 최단 기록 갱신 가능성**: sprint 329는 12분 32초 — 본 sprint는 callers 67건 단순 path 치환 + Plan §3 명시로 sprint 329 또는 그 이하 가능. 단 fx-agent export 정책 결정이 critical path
- **Plan §3 13항 강화**: F583 고유 5항(P-i~P-m)은 (1) main-api 잔존 model-router 명시, (2) fx-agent self-contained closure 검증, (3) codex_verdict 분포 추적(PASS-degraded 사이클 정착), (4) F582 인프라 회귀 검증, (5) git ls-files 0 검증. 모두 표면 충족 함정 회피 + 다음 사이클(Phase 47) 정렬 목적
