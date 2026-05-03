---
id: FX-PLAN-329
sprint: 329
feature: F581
req: FX-REQ-649
status: approved
date: 2026-05-04
---

# Sprint 329 Plan — F581: services/agent iii light 14 files 정리 (Phase 46 100% 종결 마지막 단계)

## 목표

**F580 후속 (Sprint 327, PR #708 Match 97% semantic 100%).** services/agent **16 files 잔존(iii)**을 light 14 + heavy 2로 분할해서 본 sprint는 light 14만 처리. heavy 2 (agent-runner 35 callers + execution-types 27 callers)는 cross-domain dep 처리 방향 별도 인터뷰가 필요해서 F583(별도 sprint)으로 분리.

**핵심 원칙**: callers 합 81건 중 light 14 (19건) 즉 23%만 갱신해서 표면 충족 함정 14회차를 회피한다. autopilot ~2~3시간 완결 예상.

## 사전 측정 (S320, 2026-05-04)

### 16 files 분류 결과

| 파일 | callers | fx-agent DUP | cross-deps | 분류 | 처리 부담 |
|------|---------|-------------|----------|------|---------|
| agent-runner | **35** (test 多) | ✓ exists | core/agent | **heavy → F583** | 🔥 |
| execution-types | **27** (test 多) | ✓ exists | — | **heavy → F583** | 🔥 |
| agent-adapter-factory | 5 (services/adapters) | ✓ exists | harness | DUP | medium |
| diagnostic-collector | 3 (discovery+test) | ✓ exists | — | DUP | light |
| graph-engine | 2 | ✓ exists | — | DUP | light |
| graphs/discovery-graph | 2 | ✓ exists | discovery | DUP | light |
| model-metrics | 2 (auth+test) | **✗ 신규** | — | NEW | light |
| mcp-registry | 1 (harness/mcp.ts) | ✓ exists | — | DUP | light |
| mcp-resources | 1 (harness/mcp.ts) | ✓ exists | — | DUP | light |
| mcp-runner | 1 (harness/mcp.ts) | ✓ exists | agent (TASK_TYPE_TO_MCP_TOOL) | DUP | light |
| mcp-sampling | 1 (harness/mcp.ts) | ✓ exists | — | DUP | light |
| mcp-transport | 1 (harness/mcp.ts) | ✓ exists | — | DUP | light |
| agent-collection | 1 (core/collection) | **✗ 신규** | — | NEW | light |
| agent.ts | 1 (test) | ✓ exists | harness (CustomRoleManager) | DUP | light |
| proposal-rubric | 1 (discovery) | ✓ exists | — | DUP | light |
| skill-metrics | 1 (shaping) | ✓ exists | — | DUP | light |

**합계**: light 14 files / callers 19건 (DUP 12 + NEW 2)

### Light 14 files 상세

#### DUP 12 (fx-agent 동명 파일 이미 존재 → main-api 측 git rm + callers fx-agent로 전환)

1. **agent-adapter-factory.ts** (5 callers)
   - callers: `packages/api/src/services/adapters/{build-validator,claude-api,deploy-verifier,evaluator-optimizer,spec-checker}-adapter.ts`
   - cross-dep: `core/harness/services/evaluator-optimizer.js` (type-only import — fx-agent에서도 동일 import 가능)
   - 처리: `git rm packages/api/src/services/agent/agent-adapter-factory.ts` + 5 callers `import` 경로를 fx-agent 측 동명 파일로 변경

2. **agent.ts** (1 caller, test only)
   - caller: `packages/api/src/__tests__/custom-role-manager.test.ts`
   - cross-dep: `core/harness/services/custom-role-manager.js`
   - 처리: git rm + test import 경로 갱신

3. **diagnostic-collector.ts** (3 callers)
   - callers: `packages/api/src/__tests__/stage-runner-metrics.test.ts`, `core/discovery/routes/discovery-stage-runner.ts`, `core/discovery/services/stage-runner-service.ts`
   - 처리: git rm + 3 callers fx-agent 측 동명 파일 import로 변경 (DiagnosticCollector class export 동일 가정)

4. **graph-engine.ts** (2 callers)
   - callers: `__tests__/services/discovery-graph.test.ts`, `core/discovery/services/discovery-graph-service.ts`
   - 처리: git rm + 2 callers fx-agent 측 (`packages/fx-agent/src/orchestration/graphs/graph-engine.ts`) 사용

5. **graphs/discovery-graph.ts** (2 callers)
   - callers: 동일 2개
   - cross-dep: `core/discovery/services/{stage-runner-service,analysis-path-v82}` import (discovery 도메인 강결합)
   - 처리: git rm + 2 callers fx-agent 측 (`packages/fx-agent/src/orchestration/graphs/discovery-graph.ts`) 사용. fx-agent 측 동명 파일이 동일 cross-dep을 갖는지 확인 (없으면 contract 추출 후 fx-agent에 추가)

6~10. **mcp-{registry,resources,runner,sampling,transport}.ts** (각 1 caller, 모두 `core/harness/routes/mcp.ts`)
   - 처리: git rm 5개 + harness/routes/mcp.ts import 5건 갱신
   - mcp-runner cross-dep: `core/agent/services/mcp-adapter.js` `TASK_TYPE_TO_MCP_TOOL` → fx-agent 동명 파일이 동일 import 가능한지 확인. 안 되면 mcp-adapter도 contract 추출 또는 함께 이전

11. **proposal-rubric.ts** (1 caller, `core/discovery/routes/discovery-stage-runner.ts`)
   - 처리: git rm + 1 caller 갱신

12. **skill-metrics.ts** (1 caller, `core/shaping/services/bd-skill-executor.ts`)
   - 처리: git rm + 1 caller 갱신

#### NEW 2 (fx-agent 미존재 → git mv 신규 이전)

13. **agent-collection.ts** (1 caller, `core/collection/routes/collection.ts`)
    - 처리: `git mv packages/api/src/services/agent/agent-collection.ts packages/fx-agent/src/services/agent-collection.ts` + 1 caller 갱신

14. **model-metrics.ts** (2 callers)
    - callers: `packages/api/src/__tests__/model-metrics.test.ts`, `packages/api/src/modules/auth/routes/token.ts`
    - 처리: git mv + 2 callers 갱신

## §3 OBSERVED P-a~P-h Numerical 강제 (autopilot 표면 충족 함정 14회차 회피)

| ID | 항목 | OBSERVED 측정 명령 | PASS 조건 |
|----|------|-------------------|-----------|
| P-a | services/agent files count | `find packages/api/src/services/agent -type f -name "*.ts" \| wc -l` | **≤ 2** (16 - 14 = 2 = agent-runner + execution-types 잔존) |
| P-b | fx-agent에 신규 2 추가 존재 | `[ -f packages/fx-agent/src/services/agent-collection.ts ] && [ -f packages/fx-agent/src/services/model-metrics.ts ]` | 둘 다 존재 |
| P-c | 외부 callers 잔존 import 0건 | `grep -rEn "from .*services/agent/(agent-adapter-factory\|agent-collection\|agent\.ts\|diagnostic-collector\|execution-types\|graph-engine\|graphs/discovery-graph\|mcp-registry\|mcp-resources\|mcp-runner\|mcp-sampling\|mcp-transport\|model-metrics\|proposal-rubric\|skill-metrics)" packages/ \| grep -v "packages/api/src/services/agent/" \| wc -l` | = **0** (light 14 files 외부 import 모두 갱신) |
| P-d | typecheck + lint + tests GREEN | `turbo typecheck && turbo lint && turbo test` | turbo 19/19, fail = 0 |
| P-e | dual_ai_reviews 자동 INSERT (sprint 329) | `wrangler d1 execute foundry-x-db --remote --command="SELECT COUNT(*) FROM dual_ai_reviews WHERE sprint_id=329"` | ≥ **1** (누적 ≥ **11**) |
| P-f | F560 회귀 0건 | fx-discovery 7 routes 401 응답 일관 (인증 필요 정상) | 401 일관 |
| P-g | F582 회귀 0건 | fx-discovery `discovery-stage.service.ts` `DiagnosticCollector + autoTriggerMetaAgent` 호출 위치 grep | ≥ 1 (sprint 시작 시 = sprint 328 결과 그대로) |
| P-h | iii heavy 2 잔존 확증 + F583 등록 | `find packages/api/src/services/agent -name "*.ts" \| sort` 출력 = `agent-runner.ts + execution-types.ts` 2개 + SPEC §5 F583 row 존재 | exact 2 + F583 row 확증 |

> **자동 INSERT 검증 핵심**: P-e dual_ai_reviews는 sprint 종료 hook(C103 + C104 확증됨)이 자동 trigger. autopilot이 "측정 안 함"으로 임의 skip 못 하도록 Plan에 측정 명령 명시.

## 파일 매핑

### 삭제 (DUP 12)

| 파일 | callers (갱신 대상) |
|------|---------|
| `packages/api/src/services/agent/agent-adapter-factory.ts` | 5 (services/adapters/) |
| `packages/api/src/services/agent/agent.ts` | 1 (test) |
| `packages/api/src/services/agent/diagnostic-collector.ts` | 3 (discovery 2 + test) |
| `packages/api/src/services/agent/graph-engine.ts` | 2 (discovery + test) |
| `packages/api/src/services/agent/graphs/discovery-graph.ts` | 2 (discovery + test) |
| `packages/api/src/services/agent/mcp-registry.ts` | 1 (harness/mcp.ts) |
| `packages/api/src/services/agent/mcp-resources.ts` | 1 (harness/mcp.ts) |
| `packages/api/src/services/agent/mcp-runner.ts` | 1 (harness/mcp.ts) — agent dep 동시 처리 |
| `packages/api/src/services/agent/mcp-sampling.ts` | 1 (harness/mcp.ts) |
| `packages/api/src/services/agent/mcp-transport.ts` | 1 (harness/mcp.ts) |
| `packages/api/src/services/agent/proposal-rubric.ts` | 1 (discovery/routes) |
| `packages/api/src/services/agent/skill-metrics.ts` | 1 (shaping/services) |

### 이전 (NEW 2)

| 원본 | 대상 | callers (갱신 대상) |
|------|------|------|
| `packages/api/src/services/agent/agent-collection.ts` | `packages/fx-agent/src/services/agent-collection.ts` | 1 (core/collection/routes/collection.ts) |
| `packages/api/src/services/agent/model-metrics.ts` | `packages/fx-agent/src/services/model-metrics.ts` | 2 (auth/token + test) |

### 갱신 (callers 17건 + 2건 = 19건)

import 경로 변경만:
- `packages/api/src/services/adapters/build-validator-adapter.ts`
- `packages/api/src/services/adapters/claude-api-adapter.ts`
- `packages/api/src/services/adapters/deploy-verifier-adapter.ts`
- `packages/api/src/services/adapters/evaluator-optimizer-adapter.ts`
- `packages/api/src/services/adapters/spec-checker-adapter.ts`
- `packages/api/src/__tests__/custom-role-manager.test.ts`
- `packages/api/src/__tests__/stage-runner-metrics.test.ts`
- `packages/api/src/__tests__/services/discovery-graph.test.ts`
- `packages/api/src/__tests__/model-metrics.test.ts`
- `packages/api/src/core/discovery/routes/discovery-stage-runner.ts`
- `packages/api/src/core/discovery/services/stage-runner-service.ts`
- `packages/api/src/core/discovery/services/discovery-graph-service.ts`
- `packages/api/src/core/harness/routes/mcp.ts` (5 imports)
- `packages/api/src/core/shaping/services/bd-skill-executor.ts`
- `packages/api/src/core/collection/routes/collection.ts`
- `packages/api/src/modules/auth/routes/token.ts`

### 변경 없음

- `packages/api/src/services/agent/agent-runner.ts` — heavy, F583
- `packages/api/src/services/agent/execution-types.ts` — heavy, F583
- `packages/api/src/core/agent/services/{claude-api-runner,openrouter-runner,mcp-adapter}.ts` — F583 인터뷰에서 처리 결정

## 위험 / Rollback

- **위험 1**: fx-agent 측 동명 파일이 main-api 측과 DIFF가 있으면 git rm 시 동작 변경 발생 가능. **사전 검증**: 각 DUP 파일 diff 분석 필수 (Red phase 또는 implementation 시작 시 우선 수행)
- **위험 2**: mcp-runner의 `TASK_TYPE_TO_MCP_TOOL` 의존이 `core/agent/services/mcp-adapter`인데, fx-agent 측 동명 파일에서도 같은 import가 가능한지 확증 필요. 안 되면 contract 추출 또는 mcp-adapter도 함께 fx-agent로 이전
- **위험 3**: graphs/discovery-graph가 cross-domain dep (`core/discovery/services/{stage-runner-service,analysis-path-v82}`)을 갖는데, fx-agent 측 동명 파일이 동일 import를 어떻게 처리하는지 확증 필요
- **Rollback**: 단일 PR squash → revert로 즉시 원복. F580 직전 상태 (services/agent 16) 복귀

## 사전 조건

- F580 ✅ (Phase 46 진정 종결 마지막 한 걸음 완료, services/agent 24→16)
- F582 ✅ (GAP-4 회복, fx-discovery DiagnosticCollector + autoTriggerMetaAgent 배선)
- C103+C104 ✅ (silent fail layer 4+5 종결, dual_ai_reviews hook 자동 trigger 검증)

## 일정

- **autopilot 예상**: 2~3시간
- **WT**: `bash -i -c "sprint 329"` → `ccs --model sonnet` → `/ax:sprint-autopilot`
- **Plan §3 OBSERVED P-a~P-h numerical 강제**가 표면 충족 함정 14회차 회피 무기

## 후속 (deferred)

- **F583** services/agent heavy 2 files (agent-runner 35 + execution-types 27 callers, cross-domain dep `core/agent/services/{claude-api-runner,openrouter-runner,mcp-adapter}` 처리 방향 별도 인터뷰) — Sprint TBD
- **Phase 47 GAP-2** output_tokens=0 (P2 C-track)
- **Phase 47 GAP-3** 27 stale proposals 검토 루프 (P2 F-track)
- **모델 A/B** Opus 4.7 vs Sonnet 4.6 (P3)
- **F582 P-d** 운영자 KOAMI Dogfood 1회 실행 (별건 운영 작업)

## Insight

- **Phase 46 100% 종결까지의 마지막 걸음을 F581 + F583으로 분할**: callers 81건 중 62건(76%)을 차지하는 agent-runner + execution-types를 별도 sprint로 분리해서 본 sprint를 ~2~3h 가벼운 정리로 한정. 표면 충족 함정 14회차 회피용.
- **DUP 12 발견**: F580 작업 시 8 files를 fx-agent로 이전했지만, 그 외에도 13/16의 잔존 파일이 fx-agent 측에 동명 파일이 이미 존재. **본질은 "신규 이전"이 아닌 "main-api 측 dead duplicate 정리"**. F580에서 일부 처리 후 누락된 부분으로 추정.
- **F583 cross-domain dep 처리 방향 미정**: agent-runner의 `core/agent/services/{claude-api-runner,openrouter-runner}` 강결합은 (A) F583 sprint 내 처리 / (B) core/agent 자체를 fx-agent로 이전 / (C) main-api 잔존 + contract 분리 옵션 중 별도 인터뷰 필요.
