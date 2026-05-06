import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { Toucan } from "toucan-js";
// Modules: auth (S181) — portal/gate/launch moved to fx-modules (F572, Sprint 319)
import {
  // auth (Sprint 181)
  authRoute, ssoRoute, tokenRoute, profileRoute, adminRoute,
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
  // discovery — F560: Pipeline/Stages → fx-discovery 이관 완결. bizItemsRoute는 복합 MAIN_API 라우트 유지 (ax-bd/shapePipeline/stageRunner 잔존)
  axBdDiscoveryRoute, axBdArtifactsRoute,
  bizItemsRoute,
  discoveryShapePipelineRoute, discoveryStageRunnerRoute,
  // shaping — F540: 전체 fx-shaping Worker로 이전 (routes 제거됨)
  // offering — F541: 전체 fx-offering Worker로 이전 (routes 제거됨)
  // agent — F576: 8 remaining routes removed from app.ts (fx-gateway handles all agent paths → fx-agent Worker)
  // harness (22 routes)
  harnessRoute, governanceRoute, guardRailRoute, auditRoute,
  backupRestoreRoute, ogdGenericRoute, ogdQualityRoute,
  automationQualityRoute, qualityDashboardRoute, integrityRoute,
  freshnessRoute, healthRoute, roiBenchmarkRoute, prototypeFeedbackRoute,
  prototypeJobsRoute, prototypeUsageRoute, hitlReviewRoute,
  userEvaluationsRoute, builderRoute, mcpRoute, expansionPackRoute,
  axBdKgRoute,
} from "./core/index.js";
import { internalPrototypeJobsRoute } from "./core/harness/routes/internal-prototype-jobs.js";
// Flat routes (shared infrastructure — 8 routes)
import { requirementsRoute } from "./routes/requirements.js";
import { specRoute } from "./core/spec/routes/spec.js";
import { proxyRoute } from "./routes/proxy.js";
import { entitiesRoute } from "./core/entity/routes/entities.js";
import { srRoute } from "./core/sr/routes/sr.js";
import { shardDocRoute } from "./core/docs/routes/shard-doc.js";
import { specLibraryRoute } from "./core/spec/routes/spec-library.js";
import { helpAgentRoute } from "./routes/help-agent.js";
import { eventStatusRoute } from "./routes/event-status.js";
import { workRoute } from "./core/work/routes/work.js";
import { workPublicRoute } from "./core/work/routes/work-public.js";
import { verificationRoute } from "./core/verification/routes/index.js";
import { docsApp } from "./core/docs/routes/index.js";
import { assetApp } from "./core/asset/routes/index.js";
import { policyApp } from "./core/policy/routes/index.js";
import { cqApp } from "./core/cq/routes/index.js";
import { ethicsApp } from "./core/ethics/routes/index.js";
import { diagnosticApp } from "./core/diagnostic/routes/index.js";
import { handleScheduled } from "./scheduled.js";
import { authMiddleware } from "./middleware/auth.js";
import { piiMaskerMiddleware } from "./middleware/pii-masker.middleware.js";
import { tenantGuard, type TenantVariables } from "./middleware/tenant.js";
import { usageLimiter } from "./middleware/usage-limiter.js";
import { billingRoute } from "./modules/billing/index.js";
import { traceContextMiddleware } from "./core/infra/middleware/trace-context.middleware.js";
import type { Env } from "./env.js";

export const app = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>();

// F606: W3C Trace Context — outermost middleware (trace_id 전파, 응답 header echo)
app.use("*", traceContextMiddleware);

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
app.route("/api/docs", docsApp);
app.route("/api/cq", cqApp);

// Auth routes (public — /auth/sso/verify is public, /auth/sso/token needs auth via JWT)
app.route("/api", authRoute);
app.route("/api", ssoRoute);

// BFF Proxy routes (self-authenticated via Hub Token)
app.route("/api", proxyRoute);

// Idea Portal Webhook (public — HMAC-SHA256 서명으로 보호)
app.route("/api", ideaPortalWebhookRoute);

// F518: Work KG public routes (인증 불필요 — Roadmap/Changelog/KG 공개 조회)
app.route("/api", workPublicRoute);

// F572: webhook/slack/kpi/org/github → fx-modules (moved)

// F572: feedbackQueueRoute → fx-modules (moved)

// F546 Sprint 298 hotfix: fx-decode-bridge public 접근 — 대표 보고 데모용
// `/api/decode/*`는 authMiddleware 이전에 mount하여 공개 read-only 접근 허용.
// 읽기 전용 + Decode-X로 단방향 프록시라 CSRF/변조 리스크 낮음.
app.route("/api", decodeBridgeRoute);

// F355b Sprint 219: Decode-X handoff internal endpoint — X-Internal-Secret 전용, JWT 우회
// authMiddleware 이전에 배치하여 JWT 없이 접근 가능
app.route("/api", internalPrototypeJobsRoute);

// C103 (i) Sprint 323 (S315): Dual AI Review (F552) — autopilot CI 시스템 호출 endpoint.
// authMiddleware 이전 mount + 라우트 내부에서 X-Webhook-Secret 검증으로 abuse 방어.
// scripts/autopilot/save-dual-review.sh가 task-daemon C103 (a) hook을 통해 호출.
app.route("/api", verificationRoute);

// Protected API routes — JWT required + tenant isolation
app.use("/api/*", authMiddleware);
app.use("/api/*", tenantGuard);
// Sprint 195: 사용량 추적 미들웨어 (F411 — tenantGuard 후에 위치)
app.use("/api/*", usageLimiter);
app.route("/api", profileRoute);
app.route("/api", integrityRoute);
app.route("/api", healthRoute);
app.route("/api", freshnessRoute);
app.route("/api", requirementsRoute);
// F576: metaRoute → removed (fx-gateway → fx-agent)
app.route("/api", tokenRoute);
app.route("/api", specRoute);
app.route("/api", mcpRoute);
// F572: inboxRoute/projectOverviewRoute/webhookRegistryRoute/jiraRoute → fx-modules (moved)

// Sprint 24 routes (auth + tenant required — registered under /api/* middleware)
// F576: workflowRoute → removed (fx-gateway → fx-agent)

// Sprint 26: Cross-service entity registry (auth + tenant required)
app.route("/api", entitiesRoute);

// F572: reconciliationRoute/feedbackRoute/onboardingRoute → fx-modules (moved)

// Sprint 42: Automation quality reporting (auth + tenant required)
app.route("/api", automationQualityRoute);

// Sprint 44: SR management (auth + tenant required)
app.route("/api", srRoute);

// Sprint 47: Audit log + Governance (auth + tenant required)
app.route("/api", auditRoute);
app.route("/api", governanceRoute);

// Sprint 51: BizItems — 복합 MAIN_API 라우트 유지 (CRUD 3개는 fx-discovery, 그 외는 MAIN_API)
app.route("/api", bizItemsRoute);

// Sprint 94: Discovery Stages → F560: fx-discovery 이관 완결 (등록 제거)

// Sprint 234: Discovery Stage Runner — HITL 단계별 AI 분석 (F480)
app.route("/api", discoveryStageRunnerRoute);

// Sprint 57: Collection — 수집 채널 통합 (auth + tenant required)
app.route("/api", collectionRoute);

// Sprint 56: discoveryRoute → fx-discovery (F538)

// Sprint 59: Methodology registry + router → F541: fx-offering으로 이전

// Sprint 61: AX BD Ideation — Ideas (auth + tenant required)
// axBdBmcRoute → F540: fx-shaping
app.route("/api", axBdIdeasRoute);

// Sprint 62: BMCAgent + Version History → F540: fx-shaping으로 이전

// Sprint 64: AX BD — 아이디어-BMC 연결 + BMC 댓글 → F540: fx-shaping으로 이전

// Sprint 65: AX BD — 인사이트 + 평가관리 (auth + tenant required)
app.route("/api", axBdInsightsRoute);
// F572: axBdEvaluationsRoute → fx-modules (moved)

// Sprint 66: Discovery-X API 인터페이스 계약 (auth + tenant required)
app.route("/api", axBdDiscoveryRoute);

// Sprint 67: F209 AI Foundry 흡수 — Prototype + PoC + TechReview → F540: fx-shaping으로 이전

// Sprint 69: F213 사업성 체크포인트 + Commit Gate → F540: fx-shaping으로 이전

// Sprint 76: F221 Agent-as-Code + F223 Doc Sharding (auth + tenant required)
// F576: agentDefinitionRoute → removed (fx-gateway → fx-agent)
app.route("/api", shardDocRoute);

// Sprint 77: F224~F228 Ecosystem Reference (auth + tenant required)
// F576: contextPassthroughRoute/commandRegistryRoute → removed (fx-gateway → fx-agent)
// F572: partySessionRoute → fx-modules (moved)
app.route("/api", specLibraryRoute);
app.route("/api", expansionPackRoute);

// F572: pipelineRoute/shareLinksRoute/notificationsRoute/decisionsRoute → fx-modules (moved)
// F572: gatePackageRoute/offeringPacksRoute/mvpTrackingRoute → fx-modules (moved)
// F572: orgSharedRoute/npsRoute → fx-modules (moved)
app.route("/api", irProposalsRoute);
// Sprint 87: Admin bulk operations (F251)
app.route("/api", adminRoute);
// Sprint 90: BD 스킬 실행 → F540: fx-shaping 이전 / 산출물 (F261)
app.route("/api", axBdArtifactsRoute);
// Sprint 91: BD 프로세스 진행 추적 → F540: fx-shaping 이전 / KG (F262)
app.route("/api", axBdKgRoute);
// Sprint 95: Help Agent 챗봇 (F264)
app.route("/api", helpAgentRoute);
// Sprint 96: HITL 인터랙션 패널 (F266)
app.route("/api", hitlReviewRoute);
// Sprint 103: 스킬 실행 메트릭 (F274) → F575: fx-agent로 이전
// Sprint 104: 스킬 레지스트리 (F275) → F575: fx-agent로 이전
// Sprint 105: DERIVED 엔진 (F276) → F575: fx-agent로 이전
// Sprint 106: CAPTURED 엔진 (F277) → F575: fx-agent로 이전
// Sprint 107: BD ROI 벤치마크 (F278)
app.route("/api", roiBenchmarkRoute);
// Sprint 112: BD 형상화 Phase F → F540: fx-shaping으로 이전
// F572: validationTierRoute/validationMeetingsRoute/evaluationReportRoute → fx-modules (moved)
// F572: pocRoute/gtmCustomersRoute/gtmOutreachRoute/pipelineMonitoringRoute → fx-modules (moved)

// Sprint 132: Discovery Pipeline → F560: fx-discovery 이관 완결 (등록 제거)
// Sprint 136: Backup/Restore (F317)
app.route("/api", backupRestoreRoute);
// Sprint 137: Feedback Queue — moved above auth middleware (F340 JWT fix)
// Sprint 148~151: taskStateRoute/executionEventsRoute/agentAdaptersRoute — F576: removed (fx-gateway → fx-agent)

// Sprint 154: Discovery UI/UX v2 (F342) — personaConfigsRoute/personaEvalsRoute → F540: fx-shaping
// discoveryReportsRoute → fx-discovery (F538)
// F572: teamReviewsRoute → fx-modules (moved)
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

// Sprint 164: 운영 지표 라우트 (F362, Phase 17) → F572: metricsRoute → fx-modules (moved)

// Sprint 167: Offerings Data Layer → F541: fx-offering 이전 (F369, F370, F371, Phase 18)
// Sprint 168: Offering Export + Validate → F541: fx-offering 이전 (F372, F373, Phase 18)
// Sprint 171: Content Adapter + Design Tokens + Prototype → F541: fx-offering 이전 (F378, F379, Phase 18)
app.route("/api", discoveryShapePipelineRoute);
// Sprint 174: Offering Metrics → F541: fx-offering 이전 (F383, Phase 18)

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

// Sprint 303: Dual AI Review (F552) — C103 (i) S315에서 authMiddleware 이전으로 이동됨

// Sprint 261: Work Observability Walking Skeleton (F509)
app.route("/api", workRoute);

// Sprint 353: F629 5-Asset Model — System Knowledge (T1 토대)
app.route("/api/asset", assetApp);

// Sprint 355: F631 자동화 정책 코드 강제 (whitelist + default-deny)
app.route("/api/policy", policyApp);

// Sprint 357: F602 4대 진단 PoC (Missing/Duplicate/Overspec/Inconsistency)
app.route("/api/diagnostic", diagnosticApp);

// Sprint 359: F607 AI 투명성 + 윤리 임계 (confidence threshold + FP + kill switch)
app.route("/api/ethics", ethicsApp);

// Sprint 47: PII masker middleware — AI API 경로에만 적용
app.use("/api/agents/*", piiMaskerMiddleware);
app.use("/api/spec/generate", piiMaskerMiddleware);
app.use("/api/mcp/*", piiMaskerMiddleware);

// Cron Trigger scheduled handler
export { handleScheduled };
