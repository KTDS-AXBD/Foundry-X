// fx-modules app (F572: FX-REQ-615 — portal/gate/launch 통합 Worker)
import { Hono } from "hono";
import type { ModulesEnv } from "./env.js";
import { authMiddleware } from "./middleware/auth.js";
import { tenantGuard } from "./middleware/tenant.js";

// portal routes
import {
  orgRoute, orgSharedRoute, kpiRoute, metricsRoute, wikiRoute,
  onboardingRoute, inboxRoute, notificationsRoute, npsRoute,
  feedbackRoute, feedbackQueueRoute, slackRoute, githubRoute,
  jiraRoute, webhookRoute, webhookRegistryRoute, webhookInboundRoute,
  projectOverviewRoute, partySessionRoute, reconciliationRoute,
} from "./core/portal/index.js";

// gate routes
import {
  axBdEvaluationsRoute, decisionsRoute, evaluationReportRoute,
  gatePackageRoute, teamReviewsRoute, validationMeetingsRoute,
  validationTierRoute,
} from "./core/gate/index.js";

// launch routes
import {
  gtmCustomersRoute, gtmOutreachRoute, mvpTrackingRoute,
  offeringPacksRoute, pipelineRoute, pipelineMonitoringRoute,
  pocRoute, shareLinksRoute,
} from "./core/launch/index.js";

const app = new Hono<{ Bindings: ModulesEnv }>();

// Health endpoints (public, no auth)
app.get("/api/portal/health", (c) => c.json({ domain: "portal", status: "ok" }));
app.get("/api/gate/health", (c) => c.json({ domain: "gate", status: "ok" }));
app.get("/api/launch/health", (c) => c.json({ domain: "launch", status: "ok" }));

// Auth middleware for all other routes
app.use("*", authMiddleware);
app.use("*", tenantGuard);

// ── Portal domain (prefix: /api/portal/*) ──────────────────────
app.route("/api", orgRoute);
app.route("/api", orgSharedRoute);
app.route("/api", kpiRoute);
app.route("/api", metricsRoute);
app.route("/api", wikiRoute);
app.route("/api", onboardingRoute);
app.route("/api/agents/inbox", inboxRoute);
app.route("/api", notificationsRoute);
app.route("/api", npsRoute);
app.route("/api", feedbackRoute);
app.route("/api", feedbackQueueRoute);
app.route("/api", slackRoute);
app.route("/api", githubRoute);
app.route("/api", jiraRoute);
app.route("/api", webhookRoute);
app.route("/api", webhookInboundRoute);
app.route("/api", projectOverviewRoute);
app.route("/api", partySessionRoute);
app.route("/api", reconciliationRoute);
app.route("/api", webhookRegistryRoute);

// ── Gate domain (prefix: /api/gate/*) ──────────────────────────
app.route("/api", axBdEvaluationsRoute);
app.route("/api", decisionsRoute);
app.route("/api", evaluationReportRoute);
app.route("/api", gatePackageRoute);
app.route("/api", teamReviewsRoute);
app.route("/api", validationMeetingsRoute);
app.route("/api", validationTierRoute);

// ── Launch domain (prefix: /api/launch/*) ──────────────────────
app.route("/api", gtmCustomersRoute);
app.route("/api", gtmOutreachRoute);
app.route("/api", mvpTrackingRoute);
app.route("/api", offeringPacksRoute);
app.route("/api", pipelineRoute);
app.route("/api", pipelineMonitoringRoute);
app.route("/api", pocRoute);
app.route("/api", shareLinksRoute);

export default app;
