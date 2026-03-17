import { Hono } from "hono";
import { profileRoute } from "./routes/profile.js";
import { integrityRoute } from "./routes/integrity.js";
import { healthRoute } from "./routes/health.js";
import { freshnessRoute } from "./routes/freshness.js";
import { wikiRoute } from "./routes/wiki.js";
import { requirementsRoute } from "./routes/requirements.js";
import { agentRoute } from "./routes/agent.js";
import { tokenRoute } from "./routes/token.js";
import { authRoute } from "./routes/auth.js";
import type { Env } from "./index.js";

export const app = new Hono<{ Bindings: Env }>();

// Health check (public)
app.get("/", (c) => c.json({ status: "ok", service: "foundry-x-api" }));

// Auth routes (public)
app.route("/api", authRoute);

// API routes
app.route("/api", profileRoute);
app.route("/api", integrityRoute);
app.route("/api", healthRoute);
app.route("/api", freshnessRoute);
app.route("/api", wikiRoute);
app.route("/api", requirementsRoute);
app.route("/api", agentRoute);
app.route("/api", tokenRoute);
