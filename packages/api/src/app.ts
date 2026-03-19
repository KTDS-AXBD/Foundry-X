import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
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
import mcpRoute from "./routes/mcp.js";
import { inboxRoute } from "./routes/inbox.js";
import { slackRoute } from "./routes/slack.js";
import { authMiddleware } from "./middleware/auth.js";
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
  ],
});
app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }));

// Auth routes (public)
app.route("/api", authRoute);

// Webhook (public — HMAC-SHA256 서명으로 보호)
app.route("/api", webhookRoute);

// Slack (public — Slack 자체 서명으로 보호)
app.route("/api", slackRoute);

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
