// fx-agent app (F571: FX-REQ-614)
// Agent 도메인 독립 Worker — 8 routes Walking Skeleton (Phase 45 Batch 6)
import "hono/jwt"; // side-effect: augment ContextVariableMap with jwtPayload
import { Hono } from "hono";
import type { AgentEnv } from "./env.js";
import { authMiddleware } from "./middleware/auth.js";
import { tenantGuard, type TenantVariables } from "./middleware/tenant.js";
import { agentAdaptersRoute } from "./routes/agent-adapters.js";
import { agentDefinitionRoute } from "./routes/agent-definition.js";
import { commandRegistryRoute } from "./routes/command-registry.js";
import { contextPassthroughRoute } from "./routes/context-passthrough.js";
import { executionEventsRoute } from "./routes/execution-events.js";
import { metaRoute } from "./routes/meta.js";
import { taskStateRoute } from "./routes/task-state.js";
import { workflowRoute } from "./routes/workflow.js";

const app = new Hono<{ Bindings: AgentEnv }>();

// Health endpoint (public)
app.get("/api/agent/health", (c) => {
  return c.json({ domain: "agent", status: "ok" });
});

// JWT 인증 미들웨어
app.use("/api/*", authMiddleware);

// Authenticated routes with tenant guard
const authenticated = new Hono<{ Bindings: AgentEnv; Variables: TenantVariables }>();
authenticated.use("*", tenantGuard);

// 8 routes Walking Skeleton (F571)
authenticated.route("/api", agentAdaptersRoute);
authenticated.route("/api", agentDefinitionRoute);
authenticated.route("/api", commandRegistryRoute);
authenticated.route("/api", contextPassthroughRoute);
authenticated.route("/api", executionEventsRoute);
authenticated.route("/", metaRoute);
authenticated.route("/api", taskStateRoute);
authenticated.route("/", workflowRoute);

app.route("/", authenticated);

export default app;
