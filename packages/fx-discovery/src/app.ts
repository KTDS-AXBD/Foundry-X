// fx-discovery app (F518: FX-REQ-546, F523: FX-REQ-551)
// F538: 3개 clean route 추가 (discovery, discovery-report, discovery-reports)
import { Hono } from "hono";
import type { DiscoveryEnv } from "./env.js";
import { authMiddleware } from "./middleware/auth.js";
import { tenantGuard, type TenantVariables } from "./middleware/tenant.js";
import items from "./routes/items.js";
import { discoveryRoute } from "./routes/discovery.js";
import { discoveryReportRoute } from "./routes/discovery-report.js";
import { discoveryReportsRoute } from "./routes/discovery-reports.js";

const app = new Hono<{ Bindings: DiscoveryEnv }>();

// Health endpoint (public)
app.get("/api/discovery/health", (c) => {
  return c.json({ domain: "discovery", status: "ok" });
});

// Walking Skeleton: GET /api/discovery/items (F523, public for now)
app.route("/", items);

// F538: JWT + tenant 미들웨어 적용 (authenticated routes)
app.use("/api/*", authMiddleware);

// F538: 3개 clean discovery routes
const authenticated = new Hono<{ Bindings: DiscoveryEnv; Variables: TenantVariables }>();
authenticated.use("*", tenantGuard);
authenticated.route("/api", discoveryRoute);
authenticated.route("/api", discoveryReportRoute);
authenticated.route("/api", discoveryReportsRoute);

app.route("/", authenticated);

export default app;
