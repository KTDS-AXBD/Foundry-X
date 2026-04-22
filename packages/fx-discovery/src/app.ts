// fx-discovery app (F518: FX-REQ-546, F523: FX-REQ-551)
// F538: 3개 clean route 추가 (discovery, discovery-report, discovery-reports)
// F539c: 7 라우트 추가 (biz-items 3 + discovery-stages 2 + discovery-pipeline GET 2)
import "hono/jwt"; // side-effect: augment ContextVariableMap with jwtPayload
import { Hono } from "hono";
import type { DiscoveryEnv } from "./env.js";
import { authMiddleware } from "./middleware/auth.js";
import { tenantGuard, type TenantVariables } from "./middleware/tenant.js";
import items from "./routes/items.js";
import { discoveryRoute } from "./routes/discovery.js";
import { discoveryReportRoute } from "./routes/discovery-report.js";
import { discoveryReportsRoute } from "./routes/discovery-reports.js";
import { bizItemsRoute } from "./routes/biz-items.js";
import { discoveryStagesRoute } from "./routes/discovery-stages.js";
import { discoveryPipelineRoute } from "./routes/discovery-pipeline.js";

const app = new Hono<{ Bindings: DiscoveryEnv }>();

// Health endpoint (public)
app.get("/api/discovery/health", (c) => {
  return c.json({ domain: "discovery", status: "ok" });
});

// Walking Skeleton: GET /api/discovery/items (F523, public for now)
app.route("/", items);

// F538: JWT + tenant 미들웨어 적용 (authenticated routes)
app.use("/api/*", authMiddleware);

// F538+F539c: authenticated routes
const authenticated = new Hono<{ Bindings: DiscoveryEnv; Variables: TenantVariables }>();
authenticated.use("*", tenantGuard);
// F538: 3개 clean discovery routes
authenticated.route("/api", discoveryRoute);
authenticated.route("/api", discoveryReportRoute);
authenticated.route("/api", discoveryReportsRoute);
// F539c Group A: biz-items 3 라우트
authenticated.route("/api", bizItemsRoute);
// F539c Group B: discovery-stages 2 라우트 + pipeline GET 2 라우트
authenticated.route("/api", discoveryStagesRoute);
authenticated.route("/api", discoveryPipelineRoute);

app.route("/", authenticated);

export default app;
