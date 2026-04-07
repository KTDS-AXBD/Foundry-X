import { Hono } from "hono";
import {
  createAuthMiddleware,
  createCorsMiddleware,
  errorHandler,
} from "@foundry-x/harness-kit";
import type { HarnessConfig } from "@foundry-x/harness-kit";
import type { GateEnv } from "./env.js";
import type { TenantVariables } from "./middleware/tenant.js";
import { tenantGuard } from "./middleware/tenant.js";
import {
  axBdEvaluationsRoute,
  decisionsRoute,
  evaluationReportRoute,
  gatePackageRoute,
  teamReviewsRoute,
  validationMeetingsRoute,
  validationTierRoute,
} from "./routes/index.js";

const config: HarnessConfig = {
  serviceName: "gate-x",
  serviceId: "gate-x",
  corsOrigins: ["https://fx.minu.best", "http://localhost:3000"],
  publicPaths: ["/api/health"],
};

export const app = new Hono<{ Bindings: GateEnv; Variables: TenantVariables }>();

// Middleware chain: CORS → Auth → TenantGuard → Routes
app.use("*", createCorsMiddleware(config));
app.onError(errorHandler);
app.use("/api/*", createAuthMiddleware(config));
app.use("/api/*", tenantGuard as Parameters<typeof app.use>[1]);

// Health check (public)
app.get("/api/health", (c) => {
  return c.json({ service: "gate-x", status: "ok", ts: new Date().toISOString() });
});

// Routes
app.route("/api/gate", axBdEvaluationsRoute);
app.route("/api/gate", decisionsRoute);
app.route("/api/gate", evaluationReportRoute);
app.route("/api/gate", gatePackageRoute);
app.route("/api/gate", teamReviewsRoute);
app.route("/api/gate", validationMeetingsRoute);
app.route("/api/gate", validationTierRoute);

export default app;
