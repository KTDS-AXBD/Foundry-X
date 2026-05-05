// F609: cross-domain contract re-exports
// External callers must import from this file, not from internal services/

export { StageRunnerService } from "./services/stage-runner-service.js";
export type { DiscoveryType } from "./services/analysis-path-v82.js";
export { SignalValuationService } from "./services/signal-valuation.js";
export type { DiscoveryCriterion } from "./services/discovery-criteria.js";
export type { AnalysisContext } from "./services/analysis-context.js";
export type { BizItem, EvaluationWithScores } from "./services/biz-item-service.js";
export type { StartingPointType } from "./services/analysis-paths.js";

// F612: Pass 5 — multi-domain caller re-exports
export { AgentCollector, CollectorError } from "./services/agent-collector.js";
export { DiscoveryPipelineService } from "./services/discovery-pipeline-service.js";
export { DiscoveryStageService } from "./services/discovery-stage-service.js";

// F611: discovery D1 API — cross-domain callers import from here
export {
  queryPipelineRunsByBizItem,
  queryPipelineRunsByTenant,
  queryPipelineCheckpointsByTenant,
  queryPipelineEventsByTenant,
  updatePipelineRunCurrentStep,
  linkShapingRunToPipeline,
} from "./services/discovery-d1-api.js";
