import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { Toucan } from "toucan-js";
import { profileRoute } from "./routes/profile.js";
import { integrityRoute } from "./routes/integrity.js";
import { healthRoute } from "./routes/health.js";
import { freshnessRoute } from "./routes/freshness.js";
import { wikiRoute } from "./routes/wiki.js";
import { requirementsRoute } from "./routes/requirements.js";
import { agentRoute } from "./routes/agent.js";
import { tokenRoute } from "./routes/token.js";
import { authRoute } from "./routes/auth.js";
import { specRoute } from "./routes/spec.js";
import { webhookRoute } from "./routes/webhook.js";
import { githubRoute } from "./routes/github.js";
import mcpRoute from "./routes/mcp.js";
import { inboxRoute } from "./routes/inbox.js";
import { slackRoute } from "./routes/slack.js";
import { orgRoute } from "./routes/org.js";
import { projectOverviewRoute } from "./routes/project-overview.js";
import { webhookRegistryRoute, webhookInboundRoute } from "./routes/webhook-registry.js";
import { jiraRoute } from "./routes/jira.js";
import { workflowRoute } from "./routes/workflow.js";
import { ssoRoute } from "./routes/sso.js";
import { proxyRoute } from "./routes/proxy.js";
import { entitiesRoute } from "./routes/entities.js";
import { kpiRoute } from "./routes/kpi.js";
import { reconciliationRoute } from "./routes/reconciliation.js";
import { feedbackRoute } from "./routes/feedback.js";
import { onboardingRoute } from "./routes/onboarding.js";
import { automationQualityRoute } from "./routes/automation-quality.js";
import { srRoute } from "./routes/sr.js";
import { auditRoute } from "./routes/audit.js";
import { governanceRoute } from "./routes/governance.js";
import { bizItemsRoute } from "./routes/biz-items.js";
import { discoveryStagesRoute } from "./routes/discovery-stages.js";
import { collectionRoute, ideaPortalWebhookRoute } from "./routes/collection.js";
import { discoveryRoute } from "./routes/discovery.js";
import { methodologyRoute } from "./routes/methodology.js";
import { axBdBmcRoute } from "./routes/ax-bd-bmc.js";
import { axBdIdeasRoute } from "./routes/ax-bd-ideas.js";
import { axBdAgentRoute } from "./routes/ax-bd-agent.js";
import { axBdHistoryRoute } from "./routes/ax-bd-history.js";
import { axBdLinksRoute } from "./routes/ax-bd-links.js";
import { axBdCommentsRoute } from "./routes/ax-bd-comments.js";
import { axBdDiscoveryRoute } from "./routes/ax-bd-discovery.js";
import { axBdInsightsRoute } from "./routes/ax-bd-insights.js";
import { axBdEvaluationsRoute } from "./routes/ax-bd-evaluations.js";
import { axBdPrototypesRoute } from "./routes/ax-bd-prototypes.js";
import { axBdViabilityRoute } from "./routes/ax-bd-viability.js";
import { agentDefinitionRoute } from "./routes/agent-definition.js";
import { shardDocRoute } from "./routes/shard-doc.js";
import { contextPassthroughRoute } from "./routes/context-passthrough.js";
import { commandRegistryRoute } from "./routes/command-registry.js";
import { partySessionRoute } from "./routes/party-session.js";
import { specLibraryRoute } from "./routes/spec-library.js";
import { expansionPackRoute } from "./routes/expansion-pack.js";
// Sprint 79: BD Pipeline E2E (F232, F233, F239)
import { pipelineRoute } from "./routes/pipeline.js";
import { shareLinksRoute } from "./routes/share-links.js";
import { notificationsRoute } from "./routes/notifications.js";
import { decisionsRoute } from "./routes/decisions.js";
// Sprint 80: BDP + Gate Package (F234, F235, F237)
import { bdpRoute } from "./routes/bdp.js";
import { gatePackageRoute } from "./routes/gate-package.js";
// Sprint 81: Offering Pack + MVP Tracking + IR Bottom-up (F236, F238, F240)
import { offeringPacksRoute } from "./routes/offering-packs.js";
import { mvpTrackingRoute } from "./routes/mvp-tracking.js";
import { irProposalsRoute } from "./routes/ir-proposals.js";
// Sprint 87: Admin bulk operations (F251)
import { adminRoute } from "./routes/admin.js";
// Sprint 88: Org shared data + NPS (F253, F254)
import { orgSharedRoute } from "./routes/org-shared.js";
import { npsRoute } from "./routes/nps.js";
// Sprint 90: BD 스킬 실행 + 산출물 (F260, F261)
import { axBdSkillsRoute } from "./routes/ax-bd-skills.js";
import { axBdArtifactsRoute } from "./routes/ax-bd-artifacts.js";
// Sprint 91: BD 프로세스 진행 추적 (F262)
import { axBdProgressRoute } from "./routes/ax-bd-progress.js";
// Sprint 92: KG Ontology (F255)
import { axBdKgRoute } from "./routes/ax-bd-kg.js";
// Sprint 95: Help Agent 챗봇 (F264)
import { helpAgentRoute } from "./routes/help-agent.js";
// Sprint 96: HITL 인터랙션 패널 (F266)
import { hitlReviewRoute } from "./routes/hitl-review.js";
// Sprint 103: 스킬 실행 메트릭 (F274)
import { skillMetricsRoute } from "./routes/skill-metrics.js";
import { skillRegistryRoute } from "./routes/skill-registry.js";
// Sprint 105: DERIVED 엔진 (F276)
import { derivedEngineRoute } from "./routes/derived-engine.js";
// Sprint 106: CAPTURED 엔진 (F277)
import { capturedEngineRoute } from "./routes/captured-engine.js";
// Sprint 107: BD ROI 벤치마크 (F278)
import { roiBenchmarkRoute } from "./routes/roi-benchmark.js";
// Sprint 112: BD 형상화 Phase F (F286, F287)
import { shapingRoute } from "./routes/shaping.js";
// Sprint 116: 2-tier 검증 + 미팅 관리 (F294, F295)
import { validationTierRoute } from "./routes/validation-tier.js";
import { validationMeetingsRoute } from "./routes/validation-meetings.js";
// Sprint 117: 통합 평가 결과서 (F296)
import { evaluationReportRoute } from "./routes/evaluation-report.js";
// Sprint 120: PoC 관리 분리 (F298)
import { pocRoute } from "./routes/poc.js";
import { gtmCustomersRoute } from "./routes/gtm-customers.js";
import { gtmOutreachRoute } from "./routes/gtm-outreach.js";
// Sprint 132: Discovery Pipeline 오케스트레이션 (F312, F313)
import { discoveryPipelineRoute } from "./routes/discovery-pipeline.js";
// Sprint 134: Pipeline Monitoring + Permissions (F315)
import { pipelineMonitoringRoute } from "./routes/pipeline-monitoring.js";
// Sprint 136: Backup/Restore (F317)
import { backupRestoreRoute } from "./routes/backup-restore.js";
// Sprint 137: Marker.io Feedback Queue (F319, F320)
import { feedbackQueueRoute } from "./routes/feedback-queue.js";
// Sprint 148: TaskState Machine (F333, Phase 14)
import { taskStateRoute } from "./routes/task-state.js";
// Sprint 149: Execution Events (F334, Phase 14)
import { executionEventsRoute } from "./routes/execution-events.js";
// Sprint 150: Orchestration Loop (F335, Phase 14)
import { orchestrationRoute } from "./routes/orchestration.js";
// Sprint 151: Agent Adapter Registry (F336, Phase 14)
import { agentAdaptersRoute } from "./routes/agent-adapters.js";
// Sprint 154: Discovery UI/UX v2 — 페르소나 설정/평가 + 리포트 + 팀 검토 (F342)
import { personaConfigsRoute } from "./routes/persona-configs.js";
import { personaEvalsRoute } from "./routes/persona-evals.js";
import { discoveryReportsRoute } from "./routes/discovery-reports.js";
import { teamReviewsRoute } from "./routes/team-reviews.js";
// Sprint 155: 멀티 페르소나 평가 (F344, F345, Phase 15)
import { axBdPersonaEvalRoute } from "./routes/ax-bd-persona-eval.js";
// Sprint 156: Discovery Report (F346, Phase 15)
import { discoveryReportRoute } from "./routes/discovery-report.js";
// Sprint 159: Prototype Auto-Gen (F353, F354, Phase 16)
import { prototypeJobsRoute } from "./routes/prototype-jobs.js";
import { prototypeUsageRoute } from "./routes/prototype-usage.js";
// Builder Server 전용 API (Webhook Secret 인증)
import { builderRoute } from "./routes/builder.js";
// Sprint 167: Offerings Data Layer (F369, F370, F371, Phase 18)
import { offeringsRoute } from "./routes/offerings.js";
import { offeringSectionsRoute } from "./routes/offering-sections.js";
// Sprint 168: Offering Export + Validate (F372, F373, Phase 18)
import { offeringExportRoute } from "./routes/offering-export.js";
import { offeringValidateRoute } from "./routes/offering-validate.js";
// Sprint 160: O-G-D Quality + Feedback (F355, F356, Phase 16)
import { ogdQualityRoute } from "./routes/ogd-quality.js";
import { prototypeFeedbackRoute } from "./routes/prototype-feedback.js";
// Sprint 161: Guard Rail — 데이터 진단 + 패턴 감지 + Rule 생성 (F357, F358, Phase 17)
import { guardRailRoute } from "./routes/guard-rail.js";
// Sprint 163: O-G-D Generic Interface (F360, Phase 17)
import { ogdGenericRoute } from "./routes/ogd-generic.js";
// Sprint 164: 운영 지표 — 활용률 + 재사용률 + Rule 효과 (F361, F362, Phase 17)
import { metricsRoute } from "./routes/metrics.js";
// Sprint 178: Builder Quality Dashboard + User Evaluations (F390, F391, Phase 19)
import { qualityDashboardRoute } from "./routes/quality-dashboard.js";
import { userEvaluationsRoute } from "./routes/user-evaluations.js";
// Sprint 171: Content Adapter + Discovery→Shape Pipeline (F378, F379, Phase 18)
import { contentAdapterRoute } from "./routes/content-adapter.js";
import { discoveryShapePipelineRoute } from "./routes/discovery-shape-pipeline.js";
// Sprint 173: Design Token Editor + Offering→Prototype (F381, F382, Phase 18)
import { designTokensRoute } from "./routes/design-tokens.js";
import { offeringPrototypeRoute } from "./routes/offering-prototype.js";
// Sprint 174: Offering Metrics + BD ROI 연동 (F383, Phase 18)
import { offeringMetricsRoute } from "./routes/offering-metrics.js";
import { handleScheduled } from "./scheduled.js";
import { authMiddleware } from "./middleware/auth.js";
import { piiMaskerMiddleware } from "./middleware/pii-masker.middleware.js";
import { tenantGuard, type TenantVariables } from "./middleware/tenant.js";
import type { Env } from "./env.js";

export const app = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>();

// CORS — allow fx.minu.best and local dev
app.use("*", cors({
  origin: ["https://fx.minu.best", "https://foundry-x-web.pages.dev", "http://localhost:3000"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 86400,
}));

// Sentry error tracking (F100 — toucan-js for Workers)
app.use("*", async (c, next) => {
  if (c.env?.SENTRY_DSN && c.executionCtx) {
    const sentry = new Toucan({
      dsn: c.env.SENTRY_DSN,
      context: c.executionCtx,
      request: c.req.raw,
    });
    try {
      await next();
    } catch (e) {
      sentry.captureException(e);
      throw e;
    }
  } else {
    await next();
  }
});

// Health check (public)
app.get("/", (c) => c.json({ status: "ok", service: "foundry-x-api" }));

// OpenAPI spec + Swagger UI (public)
app.doc("/api/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "Foundry-X API",
    version: "0.8.0",
    description:
      "Foundry-X — 사람과 AI 에이전트가 동등한 팀원으로 협업하는 조직 협업 플랫폼 API",
  },
  tags: [
    { name: "Auth", description: "Authentication (signup, login, refresh)" },
    { name: "Health", description: "SDD Triangle Health Score" },
    { name: "Profile", description: "Repository profile" },
    { name: "Integrity", description: "Harness integrity check" },
    { name: "Freshness", description: "Harness freshness report" },
    { name: "Wiki", description: "Wiki page CRUD" },
    { name: "Requirements", description: "SPEC.md F-item management" },
    { name: "Agents", description: "Agent profiles and activity" },
    { name: "Tokens", description: "Token usage and cost tracking" },
    { name: "Spec", description: "NL→Spec 변환" },
    { name: "Webhook", description: "외부 Webhook 수신" },
    { name: "MCP", description: "MCP Server management" },
    { name: "Org", description: "Organization management (CRUD, members, invitations)" },
    { name: "GitHub", description: "GitHub PR review and sync" },
    { name: "Projects", description: "Multi-project overview and health" },
    { name: "Webhooks", description: "Webhook registry and delivery" },
    { name: "Jira", description: "Jira integration and sync" },
    { name: "Workflows", description: "Workflow engine CRUD and execution" },
    { name: "SSO", description: "Cross-service SSO Hub Token management" },
    { name: "Entities", description: "Cross-service entity registry and links" },
    { name: "KPI", description: "KPI event tracking and analytics" },
    { name: "Reconciliation", description: "Git↔D1 reconciliation" },
    { name: "Feedback", description: "NPS feedback collection" },
    { name: "Onboarding", description: "Onboarding progress tracking" },
    { name: "Audit", description: "AI generation audit logs" },
    { name: "Governance", description: "Data classification and governance rules" },
    { name: "NPS", description: "NPS survey scheduling and team analytics" },
  ],
});
app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }));

// Auth routes (public — /auth/sso/verify is public, /auth/sso/token needs auth via JWT)
app.route("/api", authRoute);
app.route("/api", ssoRoute);

// BFF Proxy routes (self-authenticated via Hub Token)
app.route("/api", proxyRoute);

// Webhook (public — HMAC-SHA256 서명으로 보호)
app.route("/api", webhookRoute);

// Webhook inbound (public — signature-verified)
app.route("/api", webhookInboundRoute);

// Slack (public — Slack 자체 서명으로 보호)
app.route("/api", slackRoute);

// Idea Portal Webhook (public — HMAC-SHA256 서명으로 보호)
app.route("/api", ideaPortalWebhookRoute);

// KPI track (public — 인증 선택적, 비로그인 사용자도 page_view 기록 가능)
app.route("/api", kpiRoute);

// Org routes — auth middleware applied internally, tenantGuard selective per-route
app.use("/api/orgs", authMiddleware);
app.use("/api/orgs/*", authMiddleware);
app.route("/api", orgRoute);

// GitHub API (auth + tenant required)
app.use("/api/github/*", authMiddleware);
app.use("/api/github/*", tenantGuard);
app.route("/api", githubRoute);

// F340: Feedback Queue — Webhook Secret 인증 (JWT 면제, consumer용)
app.use("/api/feedback-queue/*", async (c, next) => {
  const secret = c.req.header("X-Webhook-Secret");
  if (secret && c.env.WEBHOOK_SECRET && secret === c.env.WEBHOOK_SECRET) {
    return next();
  }
  return c.json({ error: "Unauthorized — X-Webhook-Secret required" }, 401);
});
app.route("/api", feedbackQueueRoute);

// Protected API routes — JWT required + tenant isolation
app.use("/api/*", authMiddleware);
app.use("/api/*", tenantGuard);
app.route("/api", profileRoute);
app.route("/api", integrityRoute);
app.route("/api", healthRoute);
app.route("/api", freshnessRoute);
app.route("/api", wikiRoute);
app.route("/api", requirementsRoute);
app.route("/api", agentRoute);
app.route("/api", tokenRoute);
app.route("/api", specRoute);
app.route("/api", mcpRoute);
app.route("/api/agents/inbox", inboxRoute);

// Sprint 24 routes (auth + tenant required — registered under /api/* middleware)
app.route("/api", projectOverviewRoute);
app.route("/api", webhookRegistryRoute);
app.route("/api", jiraRoute);
app.route("/api", workflowRoute);

// Sprint 26: Cross-service entity registry (auth + tenant required)
app.route("/api", entitiesRoute);

// Sprint 27: Reconciliation (auth + tenant required)
app.route("/api", reconciliationRoute);

// Sprint 29: Onboarding feedback + progress (auth + tenant required)
app.route("/api", feedbackRoute);
app.route("/api", onboardingRoute);

// Sprint 42: Automation quality reporting (auth + tenant required)
app.route("/api", automationQualityRoute);

// Sprint 44: SR management (auth + tenant required)
app.route("/api", srRoute);

// Sprint 47: Audit log + Governance (auth + tenant required)
app.route("/api", auditRoute);
app.route("/api", governanceRoute);

// Sprint 51: BizItems — 사업 아이템 분류 + 멀티 페르소나 평가 (auth + tenant required)
app.route("/api", bizItemsRoute);

// Sprint 94: Discovery Stages — biz-item별 단계 진행 추적 (F263)
app.route("/api", discoveryStagesRoute);

// Sprint 57: Collection — 수집 채널 통합 (auth + tenant required)
app.route("/api", collectionRoute);

// Sprint 56: Discovery 진행률 대시보드 (auth + tenant required)
app.route("/api", discoveryRoute);

// Sprint 59: Methodology registry + router (auth + tenant required)
app.route("/api", methodologyRoute);

// Sprint 61: AX BD Ideation — BMC + Ideas (auth + tenant required)
app.route("/api", axBdBmcRoute);
app.route("/api", axBdIdeasRoute);

// Sprint 62: BMCAgent + Version History (auth + tenant required)
app.route("/api", axBdAgentRoute);
app.route("/api", axBdHistoryRoute);

// Sprint 64: AX BD — 아이디어-BMC 연결 + BMC 댓글 (auth + tenant required)
app.route("/api", axBdLinksRoute);
app.route("/api", axBdCommentsRoute);

// Sprint 65: AX BD — 인사이트 + 평가관리 (auth + tenant required)
app.route("/api", axBdInsightsRoute);
app.route("/api", axBdEvaluationsRoute);

// Sprint 66: Discovery-X API 인터페이스 계약 (auth + tenant required)
app.route("/api", axBdDiscoveryRoute);

// Sprint 67: F209 AI Foundry 흡수 — Prototype + PoC + TechReview (auth + tenant required)
app.route("/api", axBdPrototypesRoute);

// Sprint 69: F213 사업성 체크포인트 + Commit Gate (auth + tenant required)
app.route("/api", axBdViabilityRoute);

// Sprint 76: F221 Agent-as-Code + F223 Doc Sharding (auth + tenant required)
app.route("/api", agentDefinitionRoute);
app.route("/api", shardDocRoute);

// Sprint 77: F224~F228 Ecosystem Reference (auth + tenant required)
app.route("/api", contextPassthroughRoute);
app.route("/api", commandRegistryRoute);
app.route("/api", partySessionRoute);
app.route("/api", specLibraryRoute);
app.route("/api", expansionPackRoute);

// Sprint 79: BD Pipeline E2E (F232, F233, F239)
app.route("/api", pipelineRoute);
app.route("/api", shareLinksRoute);
app.route("/api", notificationsRoute);
app.route("/api", decisionsRoute);

// Sprint 80: BDP + Gate Package (F234, F235, F237)
app.route("/api", bdpRoute);
app.route("/api", gatePackageRoute);
// Sprint 81: Offering Pack + MVP Tracking + IR Bottom-up (F236, F238, F240)
app.route("/api", offeringPacksRoute);
app.route("/api", mvpTrackingRoute);
app.route("/api", irProposalsRoute);
// Sprint 87: Admin bulk operations (F251)
app.route("/api", adminRoute);
// Sprint 88: Org shared data + NPS (F253, F254)
app.route("/api", orgSharedRoute);
app.route("/api", npsRoute);
// Sprint 90: BD 스킬 실행 + 산출물 (F260, F261)
app.route("/api", axBdSkillsRoute);
app.route("/api", axBdArtifactsRoute);
// Sprint 91: BD 프로세스 진행 추적 (F262)
app.route("/api", axBdProgressRoute);
app.route("/api", axBdKgRoute);
// Sprint 95: Help Agent 챗봇 (F264)
app.route("/api", helpAgentRoute);
// Sprint 96: HITL 인터랙션 패널 (F266)
app.route("/api", hitlReviewRoute);
// Sprint 103: 스킬 실행 메트릭 (F274)
app.route("/api", skillMetricsRoute);
// Sprint 104: 스킬 레지스트리 (F275)
app.route("/api", skillRegistryRoute);
// Sprint 105: DERIVED 엔진 (F276)
app.route("/api", derivedEngineRoute);
// Sprint 106: CAPTURED 엔진 (F277)
app.route("/api", capturedEngineRoute);
// Sprint 107: BD ROI 벤치마크 (F278)
app.route("/api", roiBenchmarkRoute);
// Sprint 112: BD 형상화 Phase F (F286, F287)
app.route("/api", shapingRoute);
// Sprint 116: 2-tier 검증 + 미팅 관리 (F294, F295)
app.route("/api", validationTierRoute);
app.route("/api", validationMeetingsRoute);
// Sprint 117: 통합 평가 결과서 (F296)
app.route("/api", evaluationReportRoute);
// Sprint 120: PoC 관리 분리 (F298)
app.route("/api", pocRoute);

// Sprint 121: GTM Outreach (F299)
app.route("/api", gtmCustomersRoute);
app.route("/api", gtmOutreachRoute);

// Sprint 132: Discovery Pipeline 오케스트레이션 (F312, F313)
app.route("/api", discoveryPipelineRoute);
// Sprint 134: Pipeline Monitoring + Permissions (F315)
app.route("/api", pipelineMonitoringRoute);
// Sprint 136: Backup/Restore (F317)
app.route("/api", backupRestoreRoute);
// Sprint 137: Feedback Queue — moved above auth middleware (F340 JWT fix)
// Sprint 148: TaskState Machine (F333, Phase 14)
app.route("/api", taskStateRoute);
// Sprint 149: Execution Events (F334, Phase 14)
app.route("/api", executionEventsRoute);
// Sprint 150: Orchestration Loop (F335, Phase 14)
app.route("/api", orchestrationRoute);
// Sprint 151: Agent Adapter Registry (F336, Phase 14)
app.route("/api", agentAdaptersRoute);

// Sprint 154: Discovery UI/UX v2 (F342)
app.route("/api", personaConfigsRoute);
app.route("/api", personaEvalsRoute);
app.route("/api", discoveryReportsRoute);
app.route("/api", teamReviewsRoute);
// Sprint 155: 멀티 페르소나 평가 (F344, F345, Phase 15)
app.route("/api", axBdPersonaEvalRoute);
// Sprint 156: Discovery Report (F346, Phase 15)
app.route("/api", discoveryReportRoute);
// Sprint 159: Prototype Auto-Gen (F353, F354, Phase 16)
app.route("/api", prototypeJobsRoute);
app.route("/api", prototypeUsageRoute);
// Builder Server 전용 API (Webhook Secret 인증, auth bypass)
app.route("/api", builderRoute);
// Sprint 160: O-G-D Quality + Feedback (F355, F356, Phase 16)
app.route("/api", ogdQualityRoute);
app.route("/api", prototypeFeedbackRoute);
// Sprint 161: Guard Rail (F357, F358, Phase 17)
app.route("/api", guardRailRoute);
// Sprint 163: O-G-D Generic Interface (F360, Phase 17)
app.route("/api", ogdGenericRoute);

// Sprint 164: 운영 지표 라우트 (F362, Phase 17)
app.route("/api", metricsRoute);

// Sprint 167: Offerings Data Layer (F369, F370, F371, Phase 18)
app.route("/api", offeringsRoute);
app.route("/api", offeringSectionsRoute);

// Sprint 168: Offering Export + Validate (F372, F373, Phase 18)
app.route("/api", offeringExportRoute);
app.route("/api", offeringValidateRoute);

// Sprint 171: Content Adapter + Discovery→Shape Pipeline (F378, F379, Phase 18)
app.route("/api", contentAdapterRoute);
app.route("/api", discoveryShapePipelineRoute);
app.route("/api", designTokensRoute);
app.route("/api", offeringPrototypeRoute);
// Sprint 174: Offering Metrics (F383, Phase 18)
app.route("/api", offeringMetricsRoute);

// Sprint 178: Builder Quality Dashboard + User Evaluations (F390, F391, Phase 19)
app.route("/api", qualityDashboardRoute);
app.route("/api", userEvaluationsRoute);

// Sprint 47: PII masker middleware — AI API 경로에만 적용
app.use("/api/agents/*", piiMaskerMiddleware);
app.use("/api/spec/generate", piiMaskerMiddleware);
app.use("/api/mcp/*", piiMaskerMiddleware);

// Cron Trigger scheduled handler
export { handleScheduled };
