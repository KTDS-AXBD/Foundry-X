// core/ — Foundry-X 핵심 도메인 (Phase 20-A: F397, Sprint 184)
// 5개 도메인: Discovery(S1-S2), Shaping(S3), Offering, Agent, Harness

// Discovery (S1-S2 발굴) — 12 routes
export {
  axBdDiscoveryRoute, axBdIdeasRoute, axBdArtifactsRoute,
  bizItemsRoute, collectionRoute, ideaPortalWebhookRoute,
  discoveryRoute, discoveryPipelineRoute, discoveryReportRoute,
  discoveryReportsRoute, discoveryStagesRoute, discoveryShapePipelineRoute,
  irProposalsRoute,
} from "./discovery/index.js";

// Shaping (S3 형상화) — 14 routes
export {
  shapingRoute, axBdBmcRoute, axBdAgentRoute, axBdCommentsRoute,
  axBdHistoryRoute, axBdInsightsRoute, axBdLinksRoute, axBdViabilityRoute,
  axBdPrototypesRoute, axBdSkillsRoute, axBdPersonaEvalRoute,
  axBdProgressRoute, personaConfigsRoute, personaEvalsRoute,
} from "./shaping/index.js";

// Offering Pipeline — 10 routes
export {
  offeringsRoute, offeringSectionsRoute, offeringExportRoute,
  offeringValidateRoute, offeringMetricsRoute, offeringPrototypeRoute,
  designTokensRoute, contentAdapterRoute, bdpRoute, methodologyRoute,
} from "./offering/index.js";

// Agent/Orchestration — 13 routes
export {
  agentRoute, agentAdaptersRoute, agentDefinitionRoute,
  orchestrationRoute, executionEventsRoute, taskStateRoute,
  commandRegistryRoute, contextPassthroughRoute, workflowRoute,
  capturedEngineRoute, derivedEngineRoute, skillRegistryRoute,
  skillMetricsRoute,
} from "./agent/index.js";

// Harness/SDD/Governance — 22 routes
export {
  harnessRoute, governanceRoute, guardRailRoute, auditRoute,
  backupRestoreRoute, ogdGenericRoute, ogdQualityRoute,
  automationQualityRoute, qualityDashboardRoute, integrityRoute,
  freshnessRoute, healthRoute, roiBenchmarkRoute, prototypeFeedbackRoute,
  prototypeJobsRoute, prototypeUsageRoute, hitlReviewRoute,
  userEvaluationsRoute, builderRoute, mcpRoute, expansionPackRoute,
  axBdKgRoute,
} from "./harness/index.js";
