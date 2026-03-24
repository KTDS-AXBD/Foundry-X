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
import { collectionRoute, ideaPortalWebhookRoute } from "./routes/collection.js";
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

// Sprint 57: Collection — 수집 채널 통합 (auth + tenant required)
app.route("/api", collectionRoute);

// Sprint 47: PII masker middleware — AI API 경로에만 적용
app.use("/api/agents/*", piiMaskerMiddleware);
app.use("/api/spec/generate", piiMaskerMiddleware);
app.use("/api/mcp/*", piiMaskerMiddleware);

// Cron Trigger scheduled handler
export { handleScheduled };
