import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { profileRoute } from "./routes/profile.js";
import { integrityRoute } from "./routes/integrity.js";
import { healthRoute } from "./routes/health.js";
import { freshnessRoute } from "./routes/freshness.js";
import { wikiRoute } from "./routes/wiki.js";
import { requirementsRoute } from "./routes/requirements.js";
import { agentRoute } from "./routes/agent.js";
import { tokenRoute } from "./routes/token.js";

const app = new Hono();

// Health check
app.get("/", (c) => c.json({ status: "ok", service: "foundry-x-api" }));

// API routes
app.route("/api", profileRoute);
app.route("/api", integrityRoute);
app.route("/api", healthRoute);
app.route("/api", freshnessRoute);
app.route("/api", wikiRoute);
app.route("/api", requirementsRoute);
app.route("/api", agentRoute);
app.route("/api", tokenRoute);

const port = 3001;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Foundry-X API running on http://localhost:${info.port}`);
});

export { app };
