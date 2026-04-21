// core/discovery — Discovery module (Phase 20-A: F397, Sprint 184)
// 발굴 도메인 (S2): BizItems, Discovery Pipeline, Reports, Stages
// ⚠️ 수집 관련 4 routes는 F401에서 core/collection으로 분리됨
// F560: bizItemsRoute/discoveryPipelineRoute/discoveryStagesRoute → fx-discovery 이관 완결
// F560: discoveryRoute/discoveryReportRoute/discoveryReportsRoute → F538에서 이관, export 제거
// 잔존 MAIN_API dep: discoveryShapePipelineRoute(F562), discoveryStageRunnerRoute(F571)
export { axBdDiscoveryRoute } from "./routes/ax-bd-discovery.js";
export { axBdArtifactsRoute } from "./routes/ax-bd-artifacts.js";
export { bizItemsRoute } from "./routes/biz-items.js";
export { discoveryShapePipelineRoute } from "./routes/discovery-shape-pipeline.js";
export { discoveryStageRunnerRoute } from "./routes/discovery-stage-runner.js";
