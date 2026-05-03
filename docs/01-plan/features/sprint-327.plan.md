---
id: FX-PLAN-327
sprint: 327
feature: F580
req: FX-REQ-647
status: approved
date: 2026-05-03
---

# Sprint 327 Plan — F580: services/agent KEEP 3 + (ii) 5 = 8 files contract 추출 + fx-agent 이전

## 목표

**F579(Sprint 326, PR #707 Match 100%) 후속.** services/agent 24 files 잔존 → KEEP 3 + (ii) 5 = **8 files를 fx-agent로 이전**(필요 시 contract 추출). Phase 46 진정 종결 마지막 한 걸음.

**핵심**: F578(분류) → F579(deduplicate) → F580(contract 추출 + 이전)의 점진적 종결 경로 마지막. iii 16 files는 강한 main-api 결합으로 잔존 사유 명시 후 별도 평가(F581 또는 backlog).

## 배경 — F578/F579 학습 패턴

| 항목 | F578 (Sprint 325) | F579 (Sprint 326) | **F580 (본 sprint)** |
|------|------------------|------------------|---------------------|
| 작업 방식 | 분류표 작성 + dead code 3 삭제 | 17 files deduplicate + 7 callers 갱신 + core/agent/services 신설 | **8 files contract 추출 + fx-agent 이전 + 20 callers 갱신** |
| autopilot 자체 Match | 95% | 100% | 목표 ≥ 90% (OBSERVED P-a~P-h 강제) |
| OBSERVED P-c | ❌ git rename 0건 (FAIL) | ✅ 8 git mv + 9 delete | **목표 ≥ 8 git mv 또는 새 fx-agent file ≥ 8** |
| services/agent 변화 | 44 → 41 (-3) | 41 → 24 (-17) | **24 → ≤ 16 (-8)** |
| Phase Exit dual_ai_reviews | ✅ 4 (id 1+2 retroactive) | ✅ 6 (id 3+4 sprint 325 + id 5+6 sprint 326 자동) | **≥ 7 (id ≥ 7 sprint 327 자동) — codex_verdict 분포 추적** |
| codex_verdict 분포 | 첫 발생 BLOCK 4건 | PASS 첫 발생 (id 5+6) | **PASS/BLOCK ratio 누적 통계 시작** |

> **표면 충족 함정 13회차 회피 (rules/development-workflow.md "Autopilot Production Smoke Test")**: F578 autopilot이 "이전"을 "삭제"로 임의 해석한 패턴 학습. 본 Plan §3 OBSERVED P-c는 `find packages/fx-agent/src/services/{8 files} -type f \| wc -l ≥ 8` + `git log --diff-filter=R --name-status` count 측정 동시 강제.

## §1 사전 측정 (S318 baseline)

| # | 항목 | S318 baseline | 측정 명령 |
|---|------|--------------|----------|
| M1 | api/services/agent total files (F579 후) | **24** | `find packages/api/src/services/agent -type f -name "*.ts" \| wc -l` |
| M2 | KEEP 3 외부 callers | **10** (3+2+5) | model-router(shaping/bmc-insight, shaping/bmc-agent, collection/insight-agent), agent-inbox(harness/auto-rebase, modules/portal/inbox), reviewer-agent(modules/portal × 3, services/pr-pipeline, __tests__/webhook-comment) |
| M3 | (ii) 5 외부 callers | **10** (1+4+2+3+0) | agent-orchestrator(middleware/constraint-guard), prompt-gateway(shaping × 3, collection × 1), skill-pipeline-runner(core/discovery/discovery-pipeline + __tests__), task-state-service(harness/transition-trigger + __tests__ × 2), task-state(0 외부) |
| M4 | (ii) 5 cross-domain dep | **8건** | agent-orchestrator → harness/auto-fix; prompt-gateway → harness/audit-logger; skill-pipeline-runner → discovery × 2 + shaping × 1 + modules/launch × 1; task-state-service → harness/transition-guard; task-state → harness/transition-guard |
| M5 | contract 추출 distinct types | **7개** | harness 3(AutoFixService, AuditLogService, TransitionGuard+createDefaultGuard), discovery 2(DiscoveryPipelineService, DiscoveryStageService), shaping 1(BdSkillExecutor), modules/launch 1(PipelineCheckpointService) |
| M6 | fx-agent 동명 file 존재 (8 files) | model-router=NONE / agent-inbox/reviewer-agent/agent-orchestrator/prompt-gateway/task-state-service=YES / skill-pipeline-runner/task-state=api ONLY | `for f in 8 files; do diff fx-agent/services/$f api/services/agent/$f; done` |
| M7 | dual_ai_reviews D1 누적 | **6** (id 1=323/2=324 retroactive + id 3+4=325 자동 + id 5+6=326 자동) | `wrangler d1 execute foundry-x-db --remote --command "SELECT COUNT(*) FROM dual_ai_reviews"` |

**참고 — fx-agent 동명 DIFF 분석 결과** (M6 상세):
- DIFF=NONE 1: `model-router` → 단순 git rm + caller 갱신
- DIFF=YES 5: `agent-inbox`, `reviewer-agent`, `agent-orchestrator`, `prompt-gateway`, `task-state-service` → 합본 분석 후 fx-agent 측 update + git rm
- api ONLY 2: `skill-pipeline-runner`, `task-state` → fx-agent에 신설(`git mv`)

## §2 범위 — 7 항목 (P-a ~ P-g)

### (a) KEEP 3 처리 (외부 callers 10건)

**model-router (DIFF=NONE)**:
- `git rm packages/api/src/services/agent/model-router.ts`
- 3 callers 변경 → `import { ModelRouter } from "../../../../fx-agent/src/services/model-router.js"` (cross-package import) **또는** AGENT service binding 호출 패턴
  - `packages/api/src/core/shaping/services/bmc-insight-service.ts`
  - `packages/api/src/core/shaping/services/bmc-agent.ts`
  - `packages/api/src/core/collection/services/insight-agent-service.ts`

**agent-inbox (DIFF=YES)**:
- DIFF 분석 → fx-agent 측 합본 (필요 시 services/agent의 unique 변경 백포팅)
- `git rm packages/api/src/services/agent/agent-inbox.ts`
- 2 callers 변경
  - `packages/api/src/core/harness/services/auto-rebase.ts` (type only import)
  - `packages/api/src/modules/portal/routes/inbox.ts` (값 import)

**reviewer-agent (DIFF=YES)**:
- DIFF 분석 → fx-agent 측 합본
- `git rm packages/api/src/services/agent/reviewer-agent.ts`
- 5 callers 변경
  - `packages/api/src/__tests__/webhook-comment.test.ts` (vi.mock path)
  - `packages/api/src/modules/portal/services/github-review.ts` (type only)
  - `packages/api/src/modules/portal/routes/webhook.ts` (값 import)
  - `packages/api/src/modules/portal/routes/github.ts` (값 import)
  - `packages/api/src/services/pr-pipeline.ts` (type only)

### (b) ii 5 contract 추출 (7개 distinct types)

**Contract location**: `packages/shared/src/types/agent-services.ts` 신규 또는 `packages/fx-agent/src/types/contracts.ts` 신규.

추출할 type/interface (8 files이 외부 dep로 import하는 5개 도메인 service의 type만):
1. `AutoFixService` (core/harness/services/auto-fix) → contract type
2. `AuditLogService` (core/harness/services/audit-logger) → contract type
3. `TransitionGuard` + `createDefaultGuard` (core/harness/services/transition-guard) → contract type + factory signature
4. `DiscoveryPipelineService` (core/discovery/services/discovery-pipeline-service) → contract type
5. `DiscoveryStageService` (core/discovery/services/discovery-stage-service) → contract type
6. `BdSkillExecutor` (core/shaping/services/bd-skill-executor) → contract type
7. `PipelineCheckpointService` (modules/launch/services/pipeline-checkpoint-service) → contract type

각 contract는 메서드 signature만 정의(구현 제외) → fx-agent와 packages/api 양쪽이 같은 type에 의존.

### (c) ii 5 fx-agent 이전 (5 files)

**DIFF=YES 3** (agent-orchestrator/prompt-gateway/task-state-service):
- diff 분석 → 합본
- `git rm packages/api/src/services/agent/{file}.ts`
- import 경로를 contract import로 변경 (b)에서 추가한 contract 사용

**api-only 2** (skill-pipeline-runner/task-state):
- `git mv packages/api/src/services/agent/{file}.ts packages/fx-agent/src/services/{file}.ts`
- 새 위치에서 import 경로를 contract import로 변경

### (d) 외부 callers 20건 갱신

총 callers = KEEP 3 callers 10 + ii 5 callers 10 = **20건** (test 포함):

| File | Callers (count) | 새 import 경로 |
|------|-----------------|---------------|
| model-router | 3 | fx-agent service binding or `@foundry-x/fx-agent` cross-package |
| agent-inbox | 2 | 동상 |
| reviewer-agent | 5 | 동상 |
| agent-orchestrator | 1 | contract import |
| prompt-gateway | 4 | contract import |
| skill-pipeline-runner | 2 | contract import (fx-agent로 이동) |
| task-state-service | 3 | contract import |
| task-state | 0 | (외부 사용처 없음) |

`grep -rn "services/agent/{8 files}" packages/ --include="*.ts" | grep -v "packages/api/src/services/agent/" | wc -l` = 0 (모두 갱신 완료 측정)

### (e) services/agent 잔존 ≤ 16

목표: `find packages/api/src/services/agent -type f -name "*.ts" | wc -l ≤ 16`

iii 16 files (잔존 — 강한 main-api 결합):
- agent-adapter-factory.ts
- agent-collection.ts
- agent-runner.ts
- agent.ts
- diagnostic-collector.ts
- execution-types.ts
- graph-engine.ts
- graphs/discovery-graph.ts
- mcp-registry.ts, mcp-resources.ts, mcp-runner.ts, mcp-sampling.ts, mcp-transport.ts (5)
- model-metrics.ts
- proposal-rubric.ts
- skill-metrics.ts

= 16 files. 사유: graph-engine + adapters + mcp-* 5개 + agent-runner = main-api 도메인의 graph/adapter/MCP 통합층. **별도 F-item(F581 후보) 또는 backlog C-track 등록**.

### (f) 회귀 검증 GREEN

```bash
pnpm -C packages/api typecheck
pnpm -C packages/api lint
pnpm -C packages/api test
pnpm -C packages/fx-agent typecheck
pnpm -C packages/fx-agent test
turbo typecheck  # 모노리포 전체
turbo test       # 모노리포 전체
```

모두 GREEN. test pass rate ≥ 99%.

### (g) Phase Exit P1~P4 Smoke Reality

- **P1**: fx-gateway 경유 8 files 함수 호출 정상 (autopilot 종료 시 자동 hook으로 검증되거나 manual)
- **P2**: dual_ai_reviews 자동 INSERT ≥ 1건 (Sprint 327 종료 시점 hook 자동 trigger). 누적 D1 ≥ 7건
- **P3**: codex_verdict 분포 추적 — 누적 7건 중 PASS/BLOCK ratio
- **P4**: typecheck + test 모두 GREEN

## §3 OBSERVED 측정 명령 (강한 numerical 강제)

**13회차 표면 충족 함정 회피용 — autopilot이 작업 후 보고하기 전 본 측정으로 자체 PASS 판정 강제**

| # | 항목 | PASS 조건 | 측정 명령 |
|---|------|----------|----------|
| **P-a** | services/agent 잔존 | ≤ **16** | `find packages/api/src/services/agent -type f -name "*.ts" \| wc -l` |
| **P-b** | fx-agent에 8 files 신설/이전 결과 | ≥ **8** | `for f in model-router agent-inbox reviewer-agent agent-orchestrator prompt-gateway skill-pipeline-runner task-state-service task-state; do test -f "packages/fx-agent/src/services/${f}.ts" && echo "OK $f" \|\| echo "MISS $f"; done \| grep -c '^OK'` |
| **P-c** | 8 files git rename or delete count | ≥ **8** | `git log --diff-filter=DR --name-status sprint/327...master \| grep -E "^[DR].*packages/api/src/services/agent/" \| wc -l` |
| **P-d** | contract files 추가 | ≥ **1** (file) + ≥ **7** (export type) | `find packages/{shared,fx-agent}/src/types -name "agent-services.ts" -o -name "contracts.ts" \| head -5; grep -c "^export " packages/{shared,fx-agent}/src/types/agent-services.ts 2>/dev/null` |
| **P-e** | 외부 callers 갱신 (8 files import 잔존 0건) | = **0** | `for f in model-router agent-inbox reviewer-agent agent-orchestrator prompt-gateway skill-pipeline-runner task-state-service task-state; do grep -rn "services/agent/$f" packages/ --include="*.ts" \| grep -v "packages/api/src/services/agent/" \| grep -v "packages/fx-agent/" ; done \| wc -l` |
| **P-f** | typecheck + test GREEN | turbo PASS | `turbo typecheck && turbo test` exit 0 |
| **P-g** | dual_ai_reviews 자동 INSERT (Sprint 327) | ≥ **1** | `wrangler d1 execute foundry-x-db --remote --command "SELECT COUNT(*) FROM dual_ai_reviews WHERE sprint_id=327"` |
| **P-h** | dual_ai_reviews 누적 | ≥ **7** | `wrangler d1 execute foundry-x-db --remote --command "SELECT COUNT(*) FROM dual_ai_reviews"` |

**P-a + P-b + P-c 동시 충족** = "이전" 의도 진정 충족 (autopilot이 분류만 추가하거나 dead code만 삭제하는 표면 충족 패턴 차단).

## §4 위험 + 완화

| 위험 | 영향 | 완화 |
|------|------|------|
| R1 contract 추출 시 cross-package binding 추가 부담 | fx-agent + packages/api 양쪽 빌드 의존 | shared 패키지에 type만 추가 → 구현 분리 |
| R2 cross-package import 시 turbo 빌드 순서 깨질 수 있음 | turbo build FAIL | turbo.json `dependsOn` 명시 + `pnpm install` 후 빌드 검증 |
| R3 reviewer-agent webhook routes 갱신 후 GitHub webhook 실 호출 영향 | 프로덕션 webhook 처리 회귀 가능 | autopilot 종료 후 master 측에서 production smoke 실측 1회(curl webhook simulation) |
| R4 task-state-service tests __tests__ 위치 vs fx-agent 위치 혼선 | test 회귀 FAIL 가능 | __tests__ 파일은 packages/api/src/__tests__ 위치 유지 + import path만 변경 (fx-agent로 이전 시 cross-package import 또는 vitest projects 분리) |
| R5 13회차 표면 충족 함정 (Match 보고 ≠ 실제 이전) | Phase 46 진정 종결 미달 | §3 P-a~P-h numerical 강제 + 본 Plan §2 (a)~(g) 모든 항목 design 문서에 매핑 |

## §5 작업 흐름

1. autopilot WT 진입
2. F580 status 📋(plan) → 🔧(impl) (autopilot이 자동 처리)
3. **Design** 작성 — `docs/02-design/features/sprint-327.design.md`
   - 8 files DIFF 분석 결과 표
   - contract 추출 7개 distinct types signature
   - 20 callers 변경 매핑 표
4. TDD Red — contract import + 회귀 보호 테스트 (필요 시)
5. **Implementation**
   - (b) contract files 신규 (`packages/shared/src/types/agent-services.ts` or `packages/fx-agent/src/types/contracts.ts`)
   - (a) KEEP 3 처리 (model-router git rm + 합본 2)
   - (c) ii 5 fx-agent 이전 (git mv 2 + 합본 3)
   - (d) 외부 callers 20건 import 갱신
6. Verify §3 OBSERVED P-a~P-h 모두 PASS
7. PR 생성 (Match self-eval) + CI green wait + master squash merge
8. Phase Exit P1~P4 (master 측 dual_ai_reviews 자동 INSERT 검증)

## §6 Done 정의

- §3 OBSERVED P-a + P-b + P-c + P-e + P-f 동시 PASS (필수)
- §3 P-g (≥ 1 자동 INSERT sprint 327) PASS
- §3 P-h (누적 ≥ 7) PASS
- iii 16 files 잔존 사유 design 또는 SPEC 비고에 명시 + F581 또는 backlog 등록 권고

## §7 후속 (F581 또는 backlog)

iii 16 files 추가 정리:
- mcp-* 5개 → mcp 도메인 별도 분리(F562 shared-contracts 패턴 또는 modules/mcp 신설)
- agent-runner / agent-orchestrator(이전 후 잔존) / graph-engine → main-api 통합 layer로 잔존 또는 fx-agent 추가 이전
- adapters → fx-agent로 이전 (단순 wrapper면 가능)

별도 평가 필요 — 본 Sprint 327 종결 후 사용자 결정.
