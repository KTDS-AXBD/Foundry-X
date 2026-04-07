---
code: FX-DSGN-S184
title: "Sprint 184 Design — F397 Foundry-X 코어 정리 (core/ 5개 도메인)"
version: 1.0
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
planning_doc: "[[FX-PLAN-S184]]"
---

# Sprint 184 Design — Foundry-X 코어 정리

## 1. Overview

flat routes/ 79개, services/ 204개, schemas/ 96개를 core/ 5개 도메인으로 분류하고,
공유 인프라는 flat 잔류시킨다. Sprint 181~183 모듈화 패턴(git mv + re-export + app.ts 리팩토링)을 동일 적용.

최종 구조:
```
packages/api/src/
├── modules/           # 이관 대상 (auth, portal, gate, launch)
├── core/              # Foundry-X 핵심 (잔류)
│   ├── discovery/     # S1-S2 발굴 (12 routes, 25 services, 13 schemas)
│   ├── shaping/       # S3 형상화 (14 routes, 23 services, 16 schemas)
│   ├── offering/      # Offering pipeline (10 routes, 21 services, 15 schemas)
│   ├── agent/         # Agent/orchestration (13 routes, 58 services, 14 schemas)
│   ├── harness/       # Harness/SDD/governance (21 routes, 59 services, 24 schemas)
│   └── index.ts       # 전체 core route re-export
├── routes/            # 공유 인프라 (9개 잔류)
├── services/          # 공유 서비스 (24개 잔류)
└── schemas/           # 공유 스키마 (14개 잔류)
```

---

## 2. Core Discovery Module (12 routes)

### 2.1 Routes
| # | File | Export Name |
|---|------|-------------|
| 1 | ax-bd-discovery.ts | axBdDiscoveryRoute |
| 2 | ax-bd-ideas.ts | axBdIdeasRoute |
| 3 | ax-bd-artifacts.ts | axBdArtifactsRoute |
| 4 | biz-items.ts | bizItemsRoute |
| 5 | collection.ts | collectionRoute, ideaPortalWebhookRoute |
| 6 | discovery.ts | discoveryRoute |
| 7 | discovery-pipeline.ts | discoveryPipelineRoute |
| 8 | discovery-report.ts | discoveryReportRoute |
| 9 | discovery-reports.ts | discoveryReportsRoute |
| 10 | discovery-stages.ts | discoveryStagesRoute |
| 11 | discovery-shape-pipeline.ts | discoveryShapePipelineRoute |
| 12 | ir-proposals.ts | irProposalsRoute |

### 2.2 Services (25)
agent-collector.ts, agent-collector-prompts.ts, analysis-context.ts, analysis-path-v82.ts, analysis-paths.ts, biz-item-service.ts, collection-pipeline.ts, competitor-scanner.ts, competitor-scanner-prompts.ts, discovery-criteria.ts, discovery-pipeline-service.ts, discovery-progress.ts, discovery-report-service.ts, discovery-shape-pipeline-service.ts, discovery-stage-service.ts, discovery-x-ingest-service.ts, idea-service.ts, ir-proposal-service.ts, item-classification-prompts.ts, item-classifier.ts, pm-skills-criteria.ts, signal-valuation.ts, starting-point-classifier.ts, starting-point-prompts.ts, trend-data-service.ts, trend-data-prompts.ts

### 2.3 Schemas (13)
bd-artifact.ts, biz-item.ts, collection.ts, discovery-criteria.ts, discovery-pipeline.ts, discovery-progress.ts, discovery-report-schema.ts, discovery-report.ts, discovery-shape-pipeline.schema.ts, discovery-stage.ts, discovery-x.schema.ts, idea.schema.ts, ir-proposal.schema.ts

### 2.4 core/discovery/index.ts
```typescript
// core/discovery — Discovery module (Phase 20-A: F397, Sprint 184)
// 발굴 도메인 (S1-S2): BizItems, Collection, Discovery Pipeline, Reports, Stages
export { axBdDiscoveryRoute } from "./routes/ax-bd-discovery.js";
export { axBdIdeasRoute } from "./routes/ax-bd-ideas.js";
export { axBdArtifactsRoute } from "./routes/ax-bd-artifacts.js";
export { bizItemsRoute } from "./routes/biz-items.js";
export { collectionRoute, ideaPortalWebhookRoute } from "./routes/collection.js";
export { discoveryRoute } from "./routes/discovery.js";
export { discoveryPipelineRoute } from "./routes/discovery-pipeline.js";
export { discoveryReportRoute } from "./routes/discovery-report.js";
export { discoveryReportsRoute } from "./routes/discovery-reports.js";
export { discoveryStagesRoute } from "./routes/discovery-stages.js";
export { discoveryShapePipelineRoute } from "./routes/discovery-shape-pipeline.js";
export { irProposalsRoute } from "./routes/ir-proposals.js";
```

---

## 3. Core Shaping Module (14 routes)

### 3.1 Routes
| # | File | Export Name |
|---|------|-------------|
| 1 | shaping.ts | shapingRoute |
| 2 | ax-bd-bmc.ts | axBdBmcRoute |
| 3 | ax-bd-agent.ts | axBdAgentRoute |
| 4 | ax-bd-comments.ts | axBdCommentsRoute |
| 5 | ax-bd-history.ts | axBdHistoryRoute |
| 6 | ax-bd-insights.ts | axBdInsightsRoute |
| 7 | ax-bd-links.ts | axBdLinksRoute |
| 8 | ax-bd-viability.ts | axBdViabilityRoute |
| 9 | ax-bd-prototypes.ts | axBdPrototypesRoute |
| 10 | ax-bd-skills.ts | axBdSkillsRoute |
| 11 | ax-bd-persona-eval.ts | axBdPersonaEvalRoute |
| 12 | ax-bd-progress.ts | axBdProgressRoute |
| 13 | persona-configs.ts | personaConfigsRoute |
| 14 | persona-evals.ts | personaEvalsRoute |

### 3.2 Services (23)
bd-artifact-service.ts, bd-process-tracker.ts, bd-skill-executor.ts, bd-skill-prompts.ts, biz-persona-evaluator.ts, biz-persona-prompts.ts, bmc-agent.ts, bmc-comment-service.ts, bmc-history.ts, bmc-insight-service.ts, bmc-service.ts, commit-gate-service.ts, idea-bmc-link-service.ts, insight-agent-service.ts, persona-config-service.ts, persona-eval-demo.ts, persona-eval-service.ts, shaping-orchestrator-service.ts, shaping-review-service.ts, shaping-service.ts, sixhats-debate.ts, sixhats-prompts.ts, viability-checkpoint-service.ts

### 3.3 Schemas (16)
bd-progress.schema.ts, bmc-agent.schema.ts, bmc-comment.schema.ts, bmc-history.schema.ts, bmc-insight.schema.ts, bmc.schema.ts, commit-gate.schema.ts, hitl-section.schema.ts, idea-bmc-link.schema.ts, insight-job.schema.ts, persona-config-schema.ts, persona-config.ts, persona-eval-schema.ts, persona-eval.ts, shaping.ts, viability-checkpoint.schema.ts

---

## 4. Core Offering Module (10 routes)

### 4.1 Routes
| # | File | Export Name |
|---|------|-------------|
| 1 | offerings.ts | offeringsRoute |
| 2 | offering-sections.ts | offeringSectionsRoute |
| 3 | offering-export.ts | offeringExportRoute |
| 4 | offering-validate.ts | offeringValidateRoute |
| 5 | offering-metrics.ts | offeringMetricsRoute |
| 6 | offering-prototype.ts | offeringPrototypeRoute |
| 7 | design-tokens.ts | designTokensRoute |
| 8 | content-adapter.ts | contentAdapterRoute |
| 9 | bdp.ts | bdpRoute |
| 10 | methodology.ts | methodologyRoute |

### 4.2 Services (21)
bdp-methodology-module.ts, bdp-review-service.ts, bdp-service.ts, business-plan-generator.ts, business-plan-template.ts, content-adapter-service.ts, design-token-service.ts, methodology-module.ts, methodology-registry.ts, methodology-types.ts, offering-brief-service.ts, offering-export-service.ts, offering-metrics-service.ts, offering-prototype-service.ts, offering-section-service.ts, offering-service.ts, offering-validate-service.ts, pptx-renderer.ts, pptx-slide-types.ts, prd-generator.ts, prd-review-pipeline.ts, prd-template.ts

### 4.3 Schemas (15)
bdp.schema.ts, business-plan.ts, content-adapter.schema.ts, design-token.schema.ts, methodology.ts, offering-brief.schema.ts, offering-export.schema.ts, offering-metrics.schema.ts, offering-section.schema.ts, offering-validate.schema.ts, offering.schema.ts, plan.ts, prd-persona.ts, prd-review.ts, prd.ts

---

## 5. Core Agent Module (13 routes)

### 5.1 Routes
| # | File | Export Name |
|---|------|-------------|
| 1 | agent.ts | agentRoute |
| 2 | agent-adapters.ts | agentAdaptersRoute |
| 3 | agent-definition.ts | agentDefinitionRoute |
| 4 | orchestration.ts | orchestrationRoute |
| 5 | execution-events.ts | executionEventsRoute |
| 6 | task-state.ts | taskStateRoute |
| 7 | command-registry.ts | commandRegistryRoute |
| 8 | context-passthrough.ts | contextPassthroughRoute |
| 9 | workflow.ts | workflowRoute |
| 10 | captured-engine.ts | capturedEngineRoute |
| 11 | derived-engine.ts | derivedEngineRoute |
| 12 | skill-registry.ts | skillRegistryRoute |
| 13 | skill-metrics.ts | skillMetricsRoute |

### 5.2 Services (58)
agent-adapter-factory.ts, agent-adapter-registry.ts, agent-collection.ts, agent-definition-loader.ts, agent-feedback-loop.ts, agent-inbox.ts, agent-marketplace.ts, agent-orchestrator.ts, agent-runner.ts, agent-self-reflection.ts, architect-agent.ts, architect-prompts.ts, captured-review.ts, captured-skill-generator.ts, claude-api-runner.ts, command-registry.ts, context-passthrough.ts, derived-review.ts, derived-skill-generator.ts, ensemble-voting.ts, execution-event-service.ts, execution-types.ts, external-ai-reviewer.ts, fallback-chain.ts, help-agent-service.ts, infra-agent.ts, infra-agent-prompts.ts, mcp-adapter.ts, mcp-registry.ts, mcp-resources.ts, mcp-runner.ts, mcp-sampling.ts, mcp-transport.ts, model-metrics.ts, model-router.ts, openrouter-runner.ts, openrouter-service.ts, orchestration-loop.ts, planner-agent.ts, planner-prompts.ts, prompt-gateway.ts, prompt-utils.ts, proposal-generator.ts, qa-agent.ts, qa-agent-prompts.ts, reviewer-agent.ts, security-agent.ts, security-agent-prompts.ts, skill-guide.ts, skill-md-generator.ts, skill-metrics.ts, skill-pipeline-runner.ts, skill-registry.ts, skill-search.ts, task-state-service.ts, test-agent.ts, test-agent-prompts.ts, workflow-engine.ts, workflow-pattern-extractor.ts

### 5.3 Schemas (14)
agent-adapter.ts, agent-definition.ts, agent.ts, captured-engine.ts, command-registry.ts, context-passthrough.ts, derived-engine.ts, execution-event.ts, mcp.ts, orchestration.ts, skill-guide.ts, skill-metrics.ts, skill-registry.ts, task-state.ts, workflow.ts

---

## 6. Core Harness Module (21 routes)

### 6.1 Routes
| # | File | Export Name |
|---|------|-------------|
| 1 | harness.ts | harnessRoute (added: Sprint 164) |
| 2 | governance.ts | governanceRoute |
| 3 | guard-rail.ts | guardRailRoute |
| 4 | audit.ts | auditRoute |
| 5 | backup-restore.ts | backupRestoreRoute |
| 6 | ogd-generic.ts | ogdGenericRoute |
| 7 | ogd-quality.ts | ogdQualityRoute |
| 8 | automation-quality.ts | automationQualityRoute |
| 9 | quality-dashboard.ts | qualityDashboardRoute |
| 10 | integrity.ts | integrityRoute |
| 11 | freshness.ts | freshnessRoute |
| 12 | health.ts | healthRoute |
| 13 | roi-benchmark.ts | roiBenchmarkRoute |
| 14 | prototype-feedback.ts | prototypeFeedbackRoute |
| 15 | prototype-jobs.ts | prototypeJobsRoute |
| 16 | prototype-usage.ts | prototypeUsageRoute |
| 17 | hitl-review.ts | hitlReviewRoute |
| 18 | user-evaluations.ts | userEvaluationsRoute |
| 19 | builder.ts | builderRoute |
| 20 | mcp.ts | mcpRoute (default export) |
| 21 | expansion-pack.ts | expansionPackRoute |
| 22 | ax-bd-kg.ts | axBdKgRoute |

> Note: 22개로 수정 (ax-bd-kg 포함)

### 6.2 Services (59)
audit-logger.ts, auto-fix.ts, auto-rebase.ts, automation-quality-reporter.ts, backup-restore-service.ts, bd-roi-calculator.ts, calibration-service.ts, custom-role-manager.ts, data-diagnostic-service.ts, evaluator-optimizer.ts, expansion-pack.ts, file-context-collector.ts, freshness-checker.ts, guard-rail-deploy-service.ts, harness-rules.ts, health-calc.ts, hitl-review-service.ts, hook-result-processor.ts, integrity-checker.ts, kg-edge.ts, kg-node.ts, kg-query.ts, kg-scenario.ts, kg-seed.ts, ogd-discriminator-service.ts, ogd-domain-registry.ts, ogd-generator-service.ts, ogd-generic-runner.ts, ogd-orchestrator-service.ts, pattern-detector-service.ts, pattern-extractor.ts, prototype-fallback.ts, prototype-feedback-service.ts, prototype-job-service.ts, prototype-quality-service.ts, prototype-review-service.ts, prototype-service.ts, prototype-usage-service.ts, quality-dashboard-service.ts, roi-benchmark.ts, rule-effectiveness-service.ts, rule-generator-service.ts, safety-checker.ts, tech-review-service.ts, transition-guard.ts, transition-trigger.ts, user-evaluation-service.ts

### 6.3 Schemas (24)
audit.ts, automation-quality.ts, backup-restore.ts, expansion-pack.ts, freshness.ts, governance.ts, guard-rail-schema.ts, harness.ts, health.ts, help-agent-schema.ts, hitl-review-schema.ts, integrity.ts, kg-ontology.schema.ts, ogd-generic-schema.ts, ogd-quality-schema.ts, prototype-ext.ts, prototype-feedback-schema.ts, prototype-job.ts, prototype-quality-schema.ts, prototype-usage.ts, prototype.ts, quality-dashboard-schema.ts, roi-benchmark.ts, user-evaluation-schema.ts

---

## 7. Flat 잔류 (Routes 9, Services ~24, Schemas ~14)

### 7.1 Routes (9)
proxy.ts, help-agent.ts, requirements.ts, spec.ts, spec-library.ts, shard-doc.ts, sr.ts, entities.ts

> Note: 8개 (discovery-shape-pipeline은 core/discovery로 이동)

### 7.2 Shared Services
event-bus.ts, entity-registry.ts, entity-sync.ts, kv-cache.ts, llm.ts, logger.ts, merge-queue.ts, monitoring.ts, pii-masker.ts, pm-skills-guide.ts, pm-skills-module.ts, pm-skills-pipeline.ts, service-proxy.ts, shard-doc.ts, spec-library.ts, spec-parser.ts, sse-manager.ts, telemetry-collector.ts, worktree-manager.ts, hybrid-sr-classifier.ts, sr-classifier.ts, sr-workflow-mapper.ts

### 7.3 Shared Schemas
analysis-context.ts, common.ts, entity.ts, error.ts, pm-skills.ts, requirements.ts, shard-doc.ts, sixhats.ts, spec-library.ts, spec.ts, sr.ts, starting-point.ts, trend.ts

---

## 8. core/index.ts

```typescript
// core/ — Foundry-X 핵심 도메인 (Phase 20-A: F397, Sprint 184)

// Discovery (S1-S2 발굴)
export {
  axBdDiscoveryRoute, axBdIdeasRoute, axBdArtifactsRoute,
  bizItemsRoute, collectionRoute, ideaPortalWebhookRoute,
  discoveryRoute, discoveryPipelineRoute, discoveryReportRoute,
  discoveryReportsRoute, discoveryStagesRoute, discoveryShapePipelineRoute,
  irProposalsRoute,
} from "./discovery/index.js";

// Shaping (S3 형상화)
export {
  shapingRoute, axBdBmcRoute, axBdAgentRoute, axBdCommentsRoute,
  axBdHistoryRoute, axBdInsightsRoute, axBdLinksRoute, axBdViabilityRoute,
  axBdPrototypesRoute, axBdSkillsRoute, axBdPersonaEvalRoute,
  axBdProgressRoute, personaConfigsRoute, personaEvalsRoute,
} from "./shaping/index.js";

// Offering Pipeline
export {
  offeringsRoute, offeringSectionsRoute, offeringExportRoute,
  offeringValidateRoute, offeringMetricsRoute, offeringPrototypeRoute,
  designTokensRoute, contentAdapterRoute, bdpRoute, methodologyRoute,
} from "./offering/index.js";

// Agent/Orchestration
export {
  agentRoute, agentAdaptersRoute, agentDefinitionRoute,
  orchestrationRoute, executionEventsRoute, taskStateRoute,
  commandRegistryRoute, contextPassthroughRoute, workflowRoute,
  capturedEngineRoute, derivedEngineRoute, skillRegistryRoute,
  skillMetricsRoute,
} from "./agent/index.js";

// Harness/SDD/Governance
export {
  harnessRoute, governanceRoute, guardRailRoute, auditRoute,
  backupRestoreRoute, ogdGenericRoute, ogdQualityRoute,
  automationQualityRoute, qualityDashboardRoute, integrityRoute,
  freshnessRoute, healthRoute, roiBenchmarkRoute, prototypeFeedbackRoute,
  prototypeJobsRoute, prototypeUsageRoute, hitlReviewRoute,
  userEvaluationsRoute, builderRoute, mcpRoute, expansionPackRoute,
  axBdKgRoute,
} from "./harness/index.js";
```

---

## 9. app.ts 변경

### 9.1 Import 추가
기존 modules/ import 아래에 core/ import 추가:
```typescript
import {
  // discovery
  axBdDiscoveryRoute, axBdIdeasRoute, axBdArtifactsRoute,
  bizItemsRoute, collectionRoute, ideaPortalWebhookRoute,
  discoveryRoute, discoveryPipelineRoute, discoveryReportRoute,
  discoveryReportsRoute, discoveryStagesRoute, discoveryShapePipelineRoute,
  irProposalsRoute,
  // shaping
  shapingRoute, axBdBmcRoute, axBdAgentRoute, axBdCommentsRoute,
  axBdHistoryRoute, axBdInsightsRoute, axBdLinksRoute, axBdViabilityRoute,
  axBdPrototypesRoute, axBdSkillsRoute, axBdPersonaEvalRoute,
  axBdProgressRoute, personaConfigsRoute, personaEvalsRoute,
  // offering
  offeringsRoute, offeringSectionsRoute, offeringExportRoute,
  offeringValidateRoute, offeringMetricsRoute, offeringPrototypeRoute,
  designTokensRoute, contentAdapterRoute, bdpRoute, methodologyRoute,
  // agent
  agentRoute, agentAdaptersRoute, agentDefinitionRoute,
  orchestrationRoute, executionEventsRoute, taskStateRoute,
  commandRegistryRoute, contextPassthroughRoute, workflowRoute,
  capturedEngineRoute, derivedEngineRoute, skillRegistryRoute,
  skillMetricsRoute,
  // harness
  harnessRoute, governanceRoute, guardRailRoute, auditRoute,
  backupRestoreRoute, ogdGenericRoute, ogdQualityRoute,
  automationQualityRoute, qualityDashboardRoute, integrityRoute,
  freshnessRoute, healthRoute, roiBenchmarkRoute, prototypeFeedbackRoute,
  prototypeJobsRoute, prototypeUsageRoute, hitlReviewRoute,
  userEvaluationsRoute, builderRoute, mcpRoute, expansionPackRoute,
  axBdKgRoute,
} from "./core/index.js";
```

### 9.2 Import 제거
core/로 이동된 70개 라우트의 기존 `./routes/` import를 모두 제거.

### 9.3 app.route() 등록
변수명 동일 → 등록 코드 변경 없음.

---

## 10. Verification Checklist

- [ ] D-1: core/discovery/ 디렉토리 + 12 routes + 25 services + 13 schemas 이동
- [ ] D-2: core/discovery/index.ts 생성
- [ ] S-1: core/shaping/ 디렉토리 + 14 routes + 23 services + 16 schemas 이동
- [ ] S-2: core/shaping/index.ts 생성
- [ ] O-1: core/offering/ 디렉토리 + 10 routes + 21 services + 15 schemas 이동
- [ ] O-2: core/offering/index.ts 생성
- [ ] A-1: core/agent/ 디렉토리 + 13 routes + 58 services + 14 schemas 이동
- [ ] A-2: core/agent/index.ts 생성
- [ ] H-1: core/harness/ 디렉토리 + 22 routes + 59 services + 24 schemas 이동
- [ ] H-2: core/harness/index.ts 생성
- [ ] C-1: core/index.ts 생성 (전체 re-export)
- [ ] AP-1: app.ts import 리팩토링 (./routes/ → ./core/index.js)
- [ ] IP-1: 이동 파일 내부 import 경로 수정
- [ ] IP-2: 테스트 파일 import 경로 수정
- [ ] V-1: `turbo typecheck` 통과
- [ ] V-2: `pnpm test` (api) 통과
- [ ] V-3: `turbo lint` 통과
