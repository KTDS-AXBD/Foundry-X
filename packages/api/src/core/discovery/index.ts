// core/discovery — Discovery module (Phase 20-A: F397, Sprint 184)
// 발굴 도메인 (S2): BizItems, Discovery Pipeline, Reports, Stages
// ⚠️ 수집 관련 4 routes는 F401에서 core/collection으로 분리됨
// 8 routes
export { axBdDiscoveryRoute } from "./routes/ax-bd-discovery.js";
export { axBdArtifactsRoute } from "./routes/ax-bd-artifacts.js";
export { bizItemsRoute } from "./routes/biz-items.js";
export { discoveryRoute } from "./routes/discovery.js";
export { discoveryPipelineRoute } from "./routes/discovery-pipeline.js";
export { discoveryReportRoute } from "./routes/discovery-report.js";
export { discoveryReportsRoute } from "./routes/discovery-reports.js";
export { discoveryStagesRoute } from "./routes/discovery-stages.js";
export { discoveryShapePipelineRoute } from "./routes/discovery-shape-pipeline.js";
export { discoveryStageRunnerRoute } from "./routes/discovery-stage-runner.js";
