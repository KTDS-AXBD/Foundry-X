---
id: FX-DSGN-346
sprint: 346
feature: F612
req: FX-REQ-676
status: approved
date: 2026-05-05
---

# Sprint 346 Design — F612: MSA 룰 강제 교정 Pass 5 — multi-domain 26 violations

## §1 목표

baseline 27 → 1 달성. no-cross-domain-import 26건(8 파일) 제거.
F609/F610 패턴 재현: 5 target types.ts 보강 + 8 caller import path 변경.

## §2 접근 방식

F609에서 정립된 re-export 패턴:
1. caller가 import하는 실제 symbol을 target domain의 types.ts에 추가 export
2. caller import path를 `../target/services/foo.js` → `../target/types.js` 로 변경

## §3 변경 매트릭스

### 3a. types.ts 보강 (5 파일)

| 파일 | 추가 심볼 | 소스 |
|------|-----------|------|
| `core/agent/types.ts` | `AgentCollectionService` | `./services/agent-collection.js` |
| `core/agent/types.ts` | `SkillPipelineRunner` | `./services/skill-pipeline-runner.js` |
| `core/discovery/types.ts` | `AgentCollector`, `CollectorError` | `./services/agent-collector.js` |
| `core/discovery/types.ts` | `DiscoveryPipelineService` | `./services/discovery-pipeline-service.js` |
| `core/discovery/types.ts` | `DiscoveryStageService` | `./services/discovery-stage-service.js` |
| `core/shaping/types.ts` | `BdSkillExecutor` | `./services/bd-skill-executor.js` |
| `core/shaping/types.ts` | `ShapingOrchestratorService` | `./services/shaping-orchestrator-service.js` |
| `core/offering/types.ts` | `OfferingMetricsService` | `./services/offering-metrics-service.js` |
| `core/collection/types.ts` | `CollectionCandidate` | `./services/collection-pipeline.js` |

### 3b. caller import 변경 (8 파일 × 26 lines)

| caller | 현재 (위반) | 변경 후 |
|--------|-------------|---------|
| `offering/services/business-plan-generator.ts:6` | `../../agent/services/agent-runner.js` | `../../agent/types.js` |
| `offering/services/business-plan-generator.ts:7-10` | `../../discovery/services/*.js` | `../../discovery/types.js` |
| `offering/services/prototype-generator.ts:5` | `../../agent/services/agent-runner.js` | `../../agent/types.js` |
| `offering/services/prototype-generator.ts:6-8` | `../../discovery/services/*.js` | `../../discovery/types.js` |
| `offering/services/prd-generator.ts:6` | `../../agent/services/agent-runner.js` | `../../agent/types.js` |
| `offering/services/prd-generator.ts:7-9` | `../../discovery/services/*.js` | `../../discovery/types.js` |
| `discovery/services/agent-collector.ts:5-6` | `../../../core/agent/services/*.js` | `../../agent/types.js` |
| `discovery/services/agent-collector.ts:7` | `../../collection/services/collection-pipeline.js` | `../../collection/types.js` |
| `collection/routes/collection.ts:10-11` | `../../discovery/services/agent-collector.js` | `../../discovery/types.js` |
| `collection/routes/collection.ts:11` | `../../../core/agent/services/agent-runner.js` | `../../agent/types.js` (상대 depth 정정) |
| `collection/routes/collection.ts:12` | `../../agent/services/agent-collection.js` | `../../agent/types.js` |
| `agent/services/skill-pipeline-runner.ts:7` | `../../discovery/services/discovery-pipeline-service.js` | `../../discovery/types.js` |
| `agent/services/skill-pipeline-runner.ts:9` | `../../shaping/services/bd-skill-executor.js` | `../../shaping/types.js` |
| `agent/services/skill-pipeline-runner.ts:10` | `../../discovery/services/discovery-stage-service.js` | `../../discovery/types.js` |
| `harness/services/bd-roi-calculator.ts:10` | `../../discovery/services/signal-valuation.js` | `../../discovery/types.js` |
| `harness/services/bd-roi-calculator.ts:11` | `../../offering/services/offering-metrics-service.js` | `../../offering/types.js` |
| `discovery/routes/discovery-pipeline.ts:9` | `../../shaping/services/shaping-orchestrator-service.js` | `../../shaping/types.js` |
| `discovery/routes/discovery-pipeline.ts:19` | `../../agent/services/skill-pipeline-runner.js` | `../../agent/types.js` |

### 3c. baseline JSON 갱신

`packages/api/.eslint-baseline.json`:
- `msa_total`: 27 → 1
- `msa_errors`: 27 → 1
- `fingerprints`: 26 no-cross-domain 항목 제거, no-direct-route 1건만 잔존

## §4 DoD

- 5 target types.ts 보강 완료 (총 ~9개 신규 export)
- 8 caller 파일 import path 변경 (26 lines)
- baseline 27 → 1
- `cd packages/api && pnpm lint` exit 0 (baseline check 통과)
- `turbo typecheck` PASS
- `turbo test` 회귀 0건

## §5 파일 매핑

### 수정 파일 (13개)

1. `packages/api/src/core/agent/types.ts` — +2 export
2. `packages/api/src/core/discovery/types.ts` — +4 export
3. `packages/api/src/core/shaping/types.ts` — +2 export
4. `packages/api/src/core/offering/types.ts` — +1 export
5. `packages/api/src/core/collection/types.ts` — +1 export
6. `packages/api/src/core/offering/services/business-plan-generator.ts` — 5 lines
7. `packages/api/src/core/offering/services/prototype-generator.ts` — 4 lines
8. `packages/api/src/core/offering/services/prd-generator.ts` — 4 lines
9. `packages/api/src/core/discovery/services/agent-collector.ts` — 3 lines
10. `packages/api/src/core/collection/routes/collection.ts` — 3 lines
11. `packages/api/src/core/agent/services/skill-pipeline-runner.ts` — 3 lines
12. `packages/api/src/core/harness/services/bd-roi-calculator.ts` — 2 lines
13. `packages/api/src/core/discovery/routes/discovery-pipeline.ts` — 2 lines
14. `packages/api/.eslint-baseline.json` — msa_total/errors/fingerprints

## §6 TDD

- TDD 면제: re-export + import path 변경은 타입 전용 수정 (서비스 로직 zero)
- 검증: typecheck PASS = 심볼 해결 확인, lint exit 0 = baseline 통과
