---
id: FX-DESIGN-343
sprint: 343
feature: F609
req: FX-REQ-673
status: approved
date: 2026-05-05
---

# Sprint 343 Design — F609: types.ts 12 도메인 신설 + single-domain 44 fix (Pass 2)

## 실측 (ESLint 스캔 결과)

| 구분 | 파일 수 | violations |
|------|---------|-----------|
| single-domain callers | **44** | **84** |
| multi-domain callers (F610 deferred) | 9 | 45 |
| 합계 | 53 | 129 |

## §5 파일 매핑

### 신설: 7 도메인 types.ts (외부 caller 존재)

#### core/agent/types.ts (NEW)
re-exports from:
- `./services/prompt-gateway.js`: `PromptGatewayService`
- `./services/model-router.js`: `ModelRouter`
- `./services/execution-types.js`: `AgentTaskType` (type), `AgentExecutionResult` (type), `AgentExecutionRequest` (type)
- `./services/agent-runner.js`: `AgentRunner` (type), `createAgentRunner`, `createRoutedRunner`
- `./services/diagnostic-collector.js`: `DiagnosticCollector`
- `./services/meta-agent.js`: `MetaAgent`
- `./services/meta-approval.js`: `MetaApprovalService`
- `./services/proposal-rubric.js`: `ProposalRubric`
- `./services/graph-engine.js`: `GraphEngine`
- `./services/graphs/discovery-graph.js`: `createDiscoveryGraph`, `GraphStageInput` (type)
- `./services/mcp-registry.js`: `McpServerRegistry`
- `./services/mcp-transport.js`: `createTransport`
- `./services/mcp-runner.js`: `McpRunner`
- `./services/mcp-sampling.js`: `McpSamplingHandler`
- `./services/mcp-resources.js`: `McpResourcesClient`
- `./services/agent-inbox.js`: `AgentInbox` (type)
- `./services/agent-definition-loader.js`: `parseAgentDefinition`, `exportToYaml`, `MenuItem` (type)
- `./services/task-state-service.js`: `TaskStateService` (type)
- `./services/external-ai-reviewer.js`: `AiReviewProvider` (type), `AiReviewResponse` (type), `ChatGptProvider`, `GeminiProvider`, `DeepSeekProvider`
- `./services/skill-metrics.js`: `SkillMetricsService`

#### core/harness/types.ts (NEW)
re-exports from:
- `./services/evaluator-optimizer.js`: `EvaluatorOptimizer` (type)
- `./services/worktree-manager.js`: `WorktreeManager` (type)
- `./services/auto-fix.js`: `AutoFixService` (type)
- `./services/custom-role-manager.js`: `CustomRoleManager`
- `./services/audit-logger.js`: `AuditLogService`
- `./services/transition-guard.js`: `TransitionGuard`, `createDefaultGuard`
- `./schemas/roi-benchmark.js`: `UpdateSignalValuationsInput` (type)

#### core/discovery/types.ts (NEW)
re-exports from:
- `./services/stage-runner-service.js`: `StageRunnerService`
- `./services/analysis-path-v82.js`: `DiscoveryType` (type)
- `./services/signal-valuation.js`: `SignalValuationService`
- `./services/discovery-criteria.js`: `DiscoveryCriterion` (type)
- `./services/analysis-context.js`: `AnalysisContext` (type)
- `./services/biz-item-service.js`: `BizItem` (type), `EvaluationWithScores` (type)
- `./services/analysis-paths.js`: `StartingPointType` (type)

#### core/collection/types.ts (NEW)
re-exports from:
- `./services/discovery-x-ingest-service.js`: `DiscoveryXIngestService`
- `./schemas/discovery-x.schema.js`: `discoveryIngestPayloadSchema`
- `./services/idea-service.js`: `IdeaService`, `Idea` (type)

#### core/shaping/types.ts (NEW)
re-exports from:
- `./schemas/bmc-insight.schema.js`: `GenerateInsightSchema`
- `./services/bmc-insight-service.js`: `BmcInsightService`
- `./services/bmc-service.js`: `BMC_BLOCK_TYPES`
- `./services/bd-artifact-service.js`: `BdArtifactService`
- `./schemas/hitl-section.schema.js`: `SectionReviewInput` (type)

#### core/offering/types.ts (NEW)
re-exports from:
- `./schemas/content-adapter.schema.js`: `AdaptToneEnum`, `AdaptTone` (type)
- `./services/offering-service.js`: `OfferingService`
- `./services/content-adapter-service.js`: `ContentAdapterService`

#### core/spec/types.ts (NEW)
re-exports from:
- `./services/spec-parser.js`: `parseSpecRequirements`

### 신설: 6 도메인 types.ts (placeholder)

- `core/decode-bridge/types.ts` — `// future contract exports`
- `core/events/types.ts` — `// future contract exports`
- `core/files/types.ts` — `// future contract exports`
- `core/sr/types.ts` — `// future contract exports`
- `core/entity/types.ts` — `// future contract exports`
- `core/work/types.ts` — `// future contract exports`

### 수정: 44 단일-도메인 caller 파일

> import path 교체만. 실행 로직 변경 없음.

**→ agent/types**: 25 파일 (collection 3, discovery 13, harness 9, offering 6, shaping 5 중 single-domain)

**→ harness/types**: 7 파일 (agent 9 중 harness만 import)

**→ discovery/types**: 7 파일 (agent 2, offering 5 중 discovery만 import)

**→ collection/types**: 3 파일 (discovery 2, shaping 1)

**→ shaping/types**: 5 파일 (collection 3, discovery 1, harness 1)

**→ offering/types**: 3 파일 (discovery 3)

**→ spec/types**: 1 파일 (harness 1)

### 수정: 기존 파일

- `packages/api/.eslint-baseline.json` — fingerprints 재생성 (~161→~77)

### 신규: 테스트

- `packages/api/src/__tests__/types-contract.test.ts` — TDD Red target

## import depth 규칙

| caller 위치 | target 도메인 path |
|------------|-------------------|
| `core/{d}/services/*.ts` | `../../{target}/types` |
| `core/{d}/routes/*.ts` | `../../{target}/types` |
| `core/{d}/schemas/*.ts` | `../../{target}/types` |
| `core/{d}/services/graphs/*.ts` | `../../../{target}/types` |

## Phase Exit P-a~P-i

| # | 항목 | 목표 |
|---|------|------|
| P-a | `core/{domain}/types.ts` 존재 수 | 14 (verification + 13 신설) |
| P-b | single-domain cross-domain violations | 0 |
| P-c | baseline fingerprints | ~77 |
| P-d | baseline check | exit 0 |
| P-e | typecheck + tests | GREEN |
| P-f | dual_ai_reviews sprint 343 | ≥1건 |
| P-g | F560/F582 회귀 | 0 |
| P-h | multi-domain 잔존 확인 | ~45 viol |
| P-i | Match | ≥90% |
