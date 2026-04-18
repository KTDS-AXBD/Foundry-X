// fx-shaping app (F540: FX-REQ-579)
// F560: ax-bd-artifacts + ax-bd-discovery 이전 (api/core/discovery → fx-shaping)
// Shaping 도메인 독립 Worker — 15 routes, 23 services
import { Hono } from "hono";
import type { ShapingEnv } from "./env.js";
import { authMiddleware } from "./middleware/auth.js";
import { tenantGuard, type TenantVariables } from "./middleware/tenant.js";
import { shapingRoute } from "./routes/shaping.js";
import { axBdBmcRoute } from "./routes/ax-bd-bmc.js";
import { axBdAgentRoute } from "./routes/ax-bd-agent.js";
import { axBdCommentsRoute } from "./routes/ax-bd-comments.js";
import { axBdHistoryRoute } from "./routes/ax-bd-history.js";
import { axBdLinksRoute } from "./routes/ax-bd-links.js";
import { axBdViabilityRoute } from "./routes/ax-bd-viability.js";
import { axBdPrototypesRoute } from "./routes/ax-bd-prototypes.js";
import { axBdSkillsRoute } from "./routes/ax-bd-skills.js";
import { axBdPersonaEvalRoute } from "./routes/ax-bd-persona-eval.js";
import { axBdProgressRoute } from "./routes/ax-bd-progress.js";
import { personaConfigsRoute } from "./routes/persona-configs.js";
import { personaEvalsRoute } from "./routes/persona-evals.js";
import { axBdArtifactsRoute } from "./routes/ax-bd-artifacts.js";
import { axBdDiscoveryRoute } from "./routes/ax-bd-discovery.js";

const app = new Hono<{ Bindings: ShapingEnv }>();

// Health endpoint (public)
app.get("/api/shaping/health", (c) => {
  return c.json({ domain: "shaping", status: "ok" });
});

// JWT 인증 미들웨어
app.use("/api/*", authMiddleware);

// Authenticated routes with tenant guard
const authenticated = new Hono<{ Bindings: ShapingEnv; Variables: TenantVariables }>();
authenticated.use("*", tenantGuard);

// Shaping runs
authenticated.route("/api", shapingRoute);
// BMC
authenticated.route("/api", axBdBmcRoute);
authenticated.route("/api", axBdAgentRoute);
authenticated.route("/api", axBdCommentsRoute);
authenticated.route("/api", axBdHistoryRoute);
authenticated.route("/api", axBdLinksRoute);
// Viability
authenticated.route("/api", axBdViabilityRoute);
// Prototypes
authenticated.route("/api", axBdPrototypesRoute);
// Skills
authenticated.route("/api", axBdSkillsRoute);
// Persona evaluation
authenticated.route("/api", axBdPersonaEvalRoute);
authenticated.route("/api", personaConfigsRoute);
authenticated.route("/api", personaEvalsRoute);
// BD process progress
authenticated.route("/api", axBdProgressRoute);
// F560: BD artifacts + Discovery-X ingest (이전: api/core/discovery)
authenticated.route("/api", axBdArtifactsRoute);
authenticated.route("/api", axBdDiscoveryRoute);

app.route("/", authenticated);

export default app;
