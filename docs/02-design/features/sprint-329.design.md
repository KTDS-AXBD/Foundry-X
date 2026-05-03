---
id: FX-DESIGN-329
sprint: 329
feature: F581
req: FX-REQ-649
status: approved
date: 2026-05-04
---

# Sprint 329 Design — F581: services/agent light 14 files → core/agent/services/ 이전

## §1 목표

`packages/api/src/services/agent/` 16 files 중 light 14를 `core/agent/services/` (F579 확립 패턴)으로 이전.
heavy 2 (agent-runner + execution-types)는 F583 별도 sprint.

## §2 이전 대상 분류

### DUP 12 (fx-agent 측 동명 파일 존재 → main-api 경로만 정리)

| 파일 | 목적지 | 내부 import 수정 |
|------|--------|----------------|
| agent-adapter-factory.ts | core/agent/services/ | agent-runner, execution-types → services/agent/ 상대경로 보정 |
| agent.ts | core/agent/services/ | 없음 |
| diagnostic-collector.ts | core/agent/services/ | execution-types → services/agent/ 보정 |
| graph-engine.ts | core/agent/services/ | 없음 |
| graphs/discovery-graph.ts | core/agent/services/graphs/ | 5개 상대경로 보정 |
| mcp-registry.ts | core/agent/services/ | 없음 |
| mcp-resources.ts | core/agent/services/ | 없음 |
| mcp-runner.ts | core/agent/services/ | mcp-adapter → ./, execution-types → services/agent/ |
| mcp-sampling.ts | core/agent/services/ | 없음 |
| mcp-transport.ts | core/agent/services/ | 없음 |
| proposal-rubric.ts | core/agent/services/ | 없음 |
| skill-metrics.ts | core/agent/services/ | 없음 |

### NEW 2 (fx-agent 미존재 → git mv 신규 이전)

| 파일 | 목적지 | 내부 import 수정 |
|------|--------|----------------|
| agent-collection.ts | core/agent/services/ | 없음 |
| model-metrics.ts | core/agent/services/ | 없음 |

## §3 외부 callers 갱신 목록 (19 files)

| caller 파일 | 변경 내용 |
|------------|---------|
| services/adapters/build-validator-adapter.ts | agent-adapter-factory 경로 갱신 |
| services/adapters/claude-api-adapter.ts | 동일 |
| services/adapters/deploy-verifier-adapter.ts | 동일 |
| services/adapters/evaluator-optimizer-adapter.ts | 동일 |
| services/adapters/spec-checker-adapter.ts | 동일 |
| __tests__/custom-role-manager.test.ts | agent.ts 경로 갱신 |
| core/discovery/services/stage-runner-service.ts | diagnostic-collector 경로 갱신 |
| core/discovery/routes/discovery-stage-runner.ts | diagnostic-collector + proposal-rubric 경로 갱신 |
| __tests__/stage-runner-metrics.test.ts | diagnostic-collector 경로 갱신 |
| core/discovery/services/discovery-graph-service.ts | graph-engine + graphs/discovery-graph 경로 갱신 |
| __tests__/services/discovery-graph.test.ts | 동일 |
| core/harness/routes/mcp.ts | mcp-* 5개 경로 갱신 |
| __tests__/mcp-routes-resources.test.ts | mcp vi.mock 경로 갱신 |
| __tests__/mcp-routes-prompts.test.ts | 동일 |
| __tests__/mcp-routes.test.ts | 동일 |
| core/shaping/services/bd-skill-executor.ts | skill-metrics 경로 갱신 |
| modules/auth/routes/token.ts | model-metrics 경로 갱신 |
| __tests__/model-metrics.test.ts | 동일 |
| core/collection/routes/collection.ts | agent-collection 경로 갱신 |

## §4 경로 변환 규칙

### 이전 파일 내부 imports (services/agent/ → core/agent/services/)

| 기존 상대경로 | 신규 상대경로 |
|------------|------------|
| `./agent-runner.js` | `../../../services/agent/agent-runner.js` |
| `./execution-types.js` | `../../../services/agent/execution-types.js` |
| `../../core/harness/services/X.js` | `../../harness/services/X.js` |
| `../../core/agent/services/X.js` | `./X.js` |
| (graphs/ 내) `../graph-engine.js` | `../graph-engine.js` (변경 없음) |
| (graphs/ 내) `../agent-runner.js` | `../../../../services/agent/agent-runner.js` |
| (graphs/ 내) `../../../core/discovery/services/X.js` | `../../discovery/services/X.js` |
| (graphs/ 내) `./diagnostic-collector.js` | `../diagnostic-collector.js` |

### 외부 callers (→ core/agent/services/)

| 호출 위치 | 기존 | 신규 |
|---------|------|------|
| services/adapters/*.ts | `../../services/agent/X.js` | `../../core/agent/services/X.js` |
| __tests__/*.test.ts | `../services/agent/X.js` | `../core/agent/services/X.js` |
| core/discovery/* | `../../../services/agent/X.js` | `../agent/services/X.js` |
| core/harness/routes/* | `../../../services/agent/X.js` | `../../../core/agent/services/X.js` |
| core/shaping/services/* | `../../../services/agent/X.js` | `../../agent/services/X.js` |
| modules/auth/routes/* | `../../../services/agent/X.js` | `../../../core/agent/services/X.js` |
| core/collection/routes/* | `../../../services/agent/X.js` | `../../agent/services/X.js` |

## §5 파일 매핑 (TDD Red Target)

| 작업 | 파일 |
|------|------|
| git mv 14 files | packages/api/src/services/agent/{14 files} → packages/api/src/core/agent/services/ |
| 내부 import 수정 (4 files) | agent-adapter-factory, diagnostic-collector, mcp-runner, graphs/discovery-graph |
| 외부 caller 수정 (19 files) | §3 목록 전체 |

## §6 PASS 조건 (Plan §3 OBSERVED)

- P-a: `find packages/api/src/services/agent -type f -name "*.ts" | wc -l` = **2** (agent-runner + execution-types)
- P-b: `[ -f packages/api/src/core/agent/services/agent-collection.ts ] && [ -f packages/api/src/core/agent/services/model-metrics.ts ]`
- P-c: 잔존 import 0건
- P-d: turbo typecheck + turbo test GREEN
