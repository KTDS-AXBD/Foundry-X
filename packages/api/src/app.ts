import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { Toucan } from "toucan-js";
// Modules: auth (S181), portal (S182), gate+launch (S183) — Phase 20-A
import {
  // auth (Sprint 181)
  authRoute, ssoRoute, tokenRoute, profileRoute, adminRoute,
  // portal (Sprint 182)
  orgRoute, orgSharedRoute, kpiRoute, metricsRoute, wikiRoute,
  onboardingRoute, inboxRoute, notificationsRoute, npsRoute,
  feedbackRoute, feedbackQueueRoute, slackRoute, githubRoute,
  jiraRoute, webhookRoute, webhookRegistryRoute, webhookInboundRoute,
  projectOverviewRoute, partySessionRoute, reconciliationRoute,
  // gate (Sprint 183)
  axBdEvaluationsRoute, decisionsRoute, evaluationReportRoute,
  gatePackageRoute, teamReviewsRoute, validationMeetingsRoute,
  validationTierRoute,
  // launch (Sprint 183)
  gtmCustomersRoute, gtmOutreachRoute, mvpTrackingRoute,
  offeringPacksRoute, pipelineRoute, pipelineMonitoringRoute,
  pocRoute, shareLinksRoute,
} from "./modules/index.js";
// Core: discovery (S184), shaping (S184), offering (S184), agent (S184), harness (S184) — Phase 20-A
import {
  // files (1 route) — F441+F442, Sprint 213
  filesRoute,
  // decode-bridge (8 routes) — F546, Sprint 298
  decodeBridgeRoute,
  // collection (5 routes) — F401, Sprint 188
  axBdIdeasRoute, collectionRoute, ideaPortalWebhookRoute,
  irProposalsRoute, axBdInsightsRoute,
  // discovery (9 routes — discoveryRoute/discoveryReportRoute/discoveryReportsRoute → fx-discovery F538)
  axBdDiscoveryRoute, axBdArtifactsRoute,
  bizItemsRoute,
  discoveryPipelineRoute,
  discoveryStagesRoute, discoveryShapePipelineRoute, discoveryStageRunnerRoute,
  // shaping — F540: 전체 fx-shaping Worker로 이전 (routes 제거됨)
  // offering (12 routes — Sprint 216: businessPlanExportRoute 추가)
  offeringsRoute, offeringSectionsRoute, offeringExportRoute,
  offeringValidateRoute, offeringMetricsRoute, offeringPrototypeRoute,
  designTokensRoute, contentAdapterRoute, bdpRoute, methodologyRoute,
  businessPlanRoute, businessPlanExportRoute,
  // agent (13 routes + F529 streaming)
  agentRoute, agentAdaptersRoute, agentDefinitionRoute,
  orchestrationRoute, executionEventsRoute, taskStateRoute,
  commandRegistryRoute, contextPassthroughRoute, workflowRoute,
  capturedEngineRoute, derivedEngineRoute, skillRegistryRoute,
  skillMetricsRoute, streamingRoute, metaRoute,
  // harness (22 routes)
  harnessRoute, governanceRoute, guardRailRoute, auditRoute,
  backupRestoreRoute, ogdGenericRoute, ogdQualityRoute,
  automationQualityRoute, qualityDashboardRoute, integrityRoute,
  freshnessRoute, healthRoute, roiBenchmarkRoute, prototypeFeedbackRoute,
  prototypeJobsRoute, prototypeUsageRoute, hitlReviewRoute,
  userEvaluationsRoute, builderRoute, mcpRoute, expansionPackRoute,
  axBdKgRoute,
} from "./core/index.js";
// Flat routes (shared infrastructure — 8 routes)
import { requirementsRoute } from "./routes/requirements.js";
import { specRoute } from "./routes/spec.js";
import { proxyRoute } from "./routes/proxy.js";
import { entitiesRoute } from "./routes/entities.js";
import { srRoute } from "./routes/sr.js";
import { shardDocRoute } from "./routes/shard-doc.js";
import { specLibraryRoute } from "./routes/spec-library.js";
import { helpAgentRoute } from "./routes/help-agent.js";
import { eventStatusRoute } from "./routes/event-status.js";
import { workRoute } from "./routes/work.js";
import { workPublicRoute } from "./routes/work-public.js";
import { handleScheduled } from "./scheduled.js";
import { authMiddleware } from "./middleware/auth.js";
import { piiMaskerMiddleware } from "./middleware/pii-masker.middleware.js";
import { tenantGuard, type TenantVariables } from "./middleware/tenant.js";
import { usageLimiter } from "./middleware/usage-limiter.js";
import { billingRoute } from "./modules/billing/index.js";
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

// F518: Work KG public routes (인증 불필요 — Roadmap/Changelog/KG 공개 조회)
app.route("/api", workPublicRoute);

// Org routes — auth middleware applied internally, tenantGuard selective per-route
app.use("/api/orgs", authMiddleware);
app.use("/api/orgs/*", authMiddleware);
app.route("/api", orgRoute);

// GitHub API (auth + tenant required)
app.use("/api/github/*", authMiddleware);
app.use("/api/github/*", tenantGuard);
app.route("/api", githubRoute);

// Constant-time string comparison to prevent timing attacks on secret comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// F340+F476: Feedback Queue — Webhook Secret 또는 JWT admin 인증
app.use("/api/feedback-queue/*", async (c, next) => {
  // 1) Webhook Secret 인증 (consumer.sh용) — constant-time 비교
  const secret = c.req.header("X-Webhook-Secret");
  if (secret && c.env.WEBHOOK_SECRET && timingSafeEqual(secret, c.env.WEBHOOK_SECRET)) {
    return next();
  }
  // 2) JWT admin fallback (대시보드용 — F476)
  try {
    await authMiddleware(c, async () => {});
    const payload = c.get("jwtPayload") as { role?: string } | undefined;
    if (payload?.role === "admin") {
      return next();
    }
  } catch {
    // JWT 검증 실패 — fallthrough to 401
  }
  return c.json({ error: "Unauthorized — Webhook Secret or Admin JWT required" }, 401);
});
app.route("/api", feedbackQueueRoute);

// F546 Sprint 298 hotfix: fx-decode-bridge public 접근 — 대표 보고 데모용
// `/api/decode/*`는 authMiddleware 이전에 mount하여 공개 read-only 접근 허용.
// 읽기 전용 + Decode-X로 단방향 프록시라 CSRF/변조 리스크 낮음.
app.route("/api", decodeBridgeRoute);

// Protected API routes — JWT required + tenant isolation
app.use("/api/*", authMiddleware);
app.use("/api/*", tenantGuard);
// Sprint 195: 사용량 추적 미들웨어 (F411 — tenantGuard 후에 위치)
app.use("/api/*", usageLimiter);
app.route("/api", profileRoute);
app.route("/api", integrityRoute);
app.route("/api", healthRoute);
app.route("/api", freshnessRoute);
app.route("/api", wikiRoute);
app.route("/api", requirementsRoute);
app.route("/api", agentRoute);
app.route("/api", streamingRoute);
app.route("/api", metaRoute);
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

// Sprint 234: Discovery Stage Runner — HITL 단계별 AI 분석 (F480)
app.route("/api", discoveryStageRunnerRoute);

// Sprint 57: Collection — 수집 채널 통합 (auth + tenant required)
app.route("/api", collectionRoute);

// Sprint 56: discoveryRoute → fx-discovery (F538)

// Sprint 59: Methodology registry + router (auth + tenant required)
app.route("/api", methodologyRoute);

// Sprint 61: AX BD Ideation — Ideas (auth + tenant required)
// axBdBmcRoute → F540: fx-shaping
app.route("/api", axBdIdeasRoute);

// Sprint 62: BMCAgent + Version History → F540: fx-shaping으로 이전

// Sprint 64: AX BD — 아이디어-BMC 연결 + BMC 댓글 → F540: fx-shaping으로 이전

// Sprint 65: AX BD — 인사이트 + 평가관리 (auth + tenant required)
app.route("/api", axBdInsightsRoute);
app.route("/api", axBdEvaluationsRoute);

// Sprint 66: Discovery-X API 인터페이스 계약 (auth + tenant required)
app.route("/api", axBdDiscoveryRoute);

// Sprint 67: F209 AI Foundry 흡수 — Prototype + PoC + TechReview → F540: fx-shaping으로 이전

// Sprint 69: F213 사업성 체크포인트 + Commit Gate → F540: fx-shaping으로 이전

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
// Sprint 215: 사업기획서 편집기 (F444)
app.route("/api", businessPlanRoute);
// Sprint 216: 사업기획서 내보내기 (F446)
app.route("/api", businessPlanExportRoute);
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
// Sprint 90: BD 스킬 실행 → F540: fx-shaping 이전 / 산출물 (F261)
app.route("/api", axBdArtifactsRoute);
// Sprint 91: BD 프로세스 진행 추적 → F540: fx-shaping 이전 / KG (F262)
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
// Sprint 112: BD 형상화 Phase F → F540: fx-shaping으로 이전
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

// Sprint 154: Discovery UI/UX v2 (F342) — personaConfigsRoute/personaEvalsRoute → F540: fx-shaping
// discoveryReportsRoute → fx-discovery (F538)
app.route("/api", teamReviewsRoute);
// Sprint 155: 멀티 페르소나 평가 → F540: fx-shaping으로 이전
// Sprint 156: discoveryReportRoute → fx-discovery (F538)
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

// Sprint 191: F406 이벤트 상태 폴링 + DLQ 관리 API
app.route("/api", eventStatusRoute);

// Sprint 195: 과금 체계 (F411)
app.route("/api", billingRoute);

// Sprint 213: 파일 업로드 + 문서 파싱 (F441, F442)
app.route("/api", filesRoute);

// Sprint 298: fx-ai-foundry-os Decode-X 연동 (F546) — public mount는 line 220 이전으로 이동됨

// Sprint 261: Work Observability Walking Skeleton (F509)
app.route("/api", workRoute);

// Sprint 47: PII masker middleware — AI API 경로에만 적용
app.use("/api/agents/*", piiMaskerMiddleware);
app.use("/api/spec/generate", piiMaskerMiddleware);
app.use("/api/mcp/*", piiMaskerMiddleware);

// Cron Trigger scheduled handler
export { handleScheduled };
