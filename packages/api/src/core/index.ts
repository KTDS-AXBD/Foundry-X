// core/ — Foundry-X 핵심 도메인 (Phase 20-A: F397, Sprint 184)
// 5개 도메인: Discovery(S1-S2), Shaping(S3), Offering, Agent, Harness

// Discovery (S1-S2 발굴) — F560: Pipeline/Stages → fx-discovery 이관 완결
// 잔존: axBdRoute(ax-bd), bizItemsRoute(복합 MAIN_API 라우트), shapePipeline(F562), stageRunner(F571)
export {
  axBdDiscoveryRoute, axBdArtifactsRoute,
  bizItemsRoute,
  discoveryShapePipelineRoute,
  discoveryStageRunnerRoute,
} from "./discovery/index.js";

// Shaping — F540: fx-shaping Worker로 이전 (exports 제거됨)

// Offering Pipeline — 12 routes (Sprint 216: businessPlanExportRoute 추가)
export {
  offeringsRoute, offeringSectionsRoute, offeringExportRoute,
  offeringValidateRoute, offeringMetricsRoute, offeringPrototypeRoute,
  designTokensRoute, contentAdapterRoute, bdpRoute, methodologyRoute,
  businessPlanRoute, businessPlanExportRoute,
} from "./offering/index.js";

// Agent/Orchestration — 13 routes + F529 streaming
export {
  agentRoute, agentAdaptersRoute, agentDefinitionRoute,
  orchestrationRoute, executionEventsRoute, taskStateRoute,
  commandRegistryRoute, contextPassthroughRoute, workflowRoute,
  capturedEngineRoute, derivedEngineRoute, skillRegistryRoute,
  skillMetricsRoute, streamingRoute, metaRoute,
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

// collection (5 routes) — F401, Sprint 188
export {
  axBdIdeasRoute,
  collectionRoute,
  ideaPortalWebhookRoute,
  irProposalsRoute,
  axBdInsightsRoute,
} from "./collection/index.js";

// Files: 업로드 + 파싱 (2 routes) — F441+F442, Sprint 213
export { filesRoute } from "./files/index.js";

// Decode-Bridge: fx-ai-foundry-os Decode-X 연동 (8 routes) — F546, Sprint 298
export { decodeBridgeRoute } from "./decode-bridge/routes/index.js";
