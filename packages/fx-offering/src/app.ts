// fx-offering app (F541: FX-REQ-580)
// Offering 도메인 독립 Worker — 12 routes, 29 services
import "hono/jwt"; // side-effect: augment ContextVariableMap with jwtPayload
import { Hono } from "hono";
import type { OfferingEnv } from "./env.js";
import { authMiddleware } from "./middleware/auth.js";
import { tenantGuard, type TenantVariables } from "./middleware/tenant.js";
import { offeringsRoute } from "./routes/offerings.js";
import { offeringSectionsRoute } from "./routes/offering-sections.js";
import { offeringExportRoute } from "./routes/offering-export.js";
import { offeringValidateRoute } from "./routes/offering-validate.js";
import { offeringMetricsRoute } from "./routes/offering-metrics.js";
import { offeringPrototypeRoute } from "./routes/offering-prototype.js";
import { contentAdapterRoute } from "./routes/content-adapter.js";
import { designTokensRoute } from "./routes/design-tokens.js";
import { bdpRoute } from "./routes/bdp.js";
import { methodologyRoute } from "./routes/methodology.js";
import { businessPlanRoute } from "./routes/business-plan.js";
import { businessPlanExportRoute } from "./routes/business-plan-export.js";

const app = new Hono<{ Bindings: OfferingEnv }>();

// Health endpoint (public)
app.get("/api/offering/health", (c) => {
  return c.json({ domain: "offering", status: "ok" });
});

// JWT 인증 미들웨어
app.use("/api/*", authMiddleware);

// Authenticated routes with tenant guard
const authenticated = new Hono<{ Bindings: OfferingEnv; Variables: TenantVariables }>();
authenticated.use("*", tenantGuard);

// Offerings CRUD + sections + export + validate + metrics + prototype
authenticated.route("/api", offeringsRoute);
authenticated.route("/api", offeringSectionsRoute);
authenticated.route("/api", offeringExportRoute);
authenticated.route("/api", offeringValidateRoute);
authenticated.route("/api", offeringMetricsRoute);
authenticated.route("/api", offeringPrototypeRoute);
// Content adapter + design tokens
authenticated.route("/api", contentAdapterRoute);
authenticated.route("/api", designTokensRoute);
// BDP (Business Development Plan)
authenticated.route("/api", bdpRoute);
// Methodology
authenticated.route("/api", methodologyRoute);
// Business plan
authenticated.route("/api", businessPlanRoute);
authenticated.route("/api", businessPlanExportRoute);

app.route("/", authenticated);

export default app;
