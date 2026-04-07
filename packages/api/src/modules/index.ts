// modules/ — Phase 20-A 모듈화 (이관 대상, 향후 별도 서비스로)
// Sprint 181: auth 모듈
export { authRoute, ssoRoute, tokenRoute, profileRoute, adminRoute } from "./auth/index.js";

// Sprint 182: portal 모듈
export {
  orgRoute, orgSharedRoute, kpiRoute, metricsRoute, wikiRoute,
  onboardingRoute, inboxRoute, notificationsRoute, npsRoute,
  feedbackRoute, feedbackQueueRoute, slackRoute, githubRoute,
  jiraRoute, webhookRoute, webhookRegistryRoute, webhookInboundRoute,
  projectOverviewRoute, partySessionRoute, reconciliationRoute,
} from "./portal/index.js";

// Sprint 183: gate 모듈 (검증 → Gate-X)
export {
  axBdEvaluationsRoute, decisionsRoute, evaluationReportRoute,
  gatePackageRoute, teamReviewsRoute, validationMeetingsRoute,
  validationTierRoute,
} from "./gate/index.js";

// Sprint 183: launch 모듈 (제품화/GTM → Launch-X)
export {
  gtmCustomersRoute, gtmOutreachRoute, mvpTrackingRoute,
  offeringPacksRoute, pipelineRoute, pipelineMonitoringRoute,
  pocRoute, shareLinksRoute,
} from "./launch/index.js";

// Sprint 195: billing 모듈 (F411 과금 체계)
export { billingRoute } from "./billing/index.js";

// Sprint 184: infra 모듈 (예정)
