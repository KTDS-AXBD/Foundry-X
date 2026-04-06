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

// Sprint 183: gate + launch 모듈 (예정)
// Sprint 184: infra 모듈 (예정)
