// core/collection — Collection module (Phase 20-B: F401, Sprint 188)
// 수집 도메인 (S1): Idea Portal, IR Proposals, Discovery-X Ingest, Insights
// → 향후 Discovery-X 외부 서비스로 이관 예정 (Phase 21+)
// 5 routes
export { axBdIdeasRoute } from "./routes/ax-bd-ideas.js";
export { collectionRoute, ideaPortalWebhookRoute } from "./routes/collection.js";
export { irProposalsRoute } from "./routes/ir-proposals.js";
export { axBdInsightsRoute } from "./routes/ax-bd-insights.js";
