import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";
import { profileRoute } from "./routes/profile.js";
import { integrityRoute } from "./routes/integrity.js";
import { healthRoute } from "./routes/health.js";
import { freshnessRoute } from "./routes/freshness.js";
import { wikiRoute } from "./routes/wiki.js";
import { requirementsRoute } from "./routes/requirements.js";
import { agentRoute } from "./routes/agent.js";
import { tokenRoute } from "./routes/token.js";
import { authRoute } from "./routes/auth.js";
import { authMiddleware } from "./middleware/auth.js";
import type { Env } from "./index.js";

export const app = new Hono<{ Bindings: Env }>();

// Health check (public)
app.get("/", (c) => c.json({ status: "ok", service: "foundry-x-api" }));

// OpenAPI docs (public)
app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }));
app.get("/api/openapi.json", (c) =>
  c.json({
    openapi: "3.1.0",
    info: { title: "Foundry-X API", version: "0.6.0" },
    tags: [
      { name: "Auth" },
      { name: "Health" },
      { name: "Profile" },
      { name: "Integrity" },
      { name: "Freshness" },
      { name: "Wiki" },
      { name: "Requirements" },
      { name: "Agents" },
      { name: "Tokens" },
    ],
  }),
);

// Auth routes (public)
app.route("/api", authRoute);

// Protected API routes — JWT required
app.use("/api/*", authMiddleware);
app.route("/api", profileRoute);
app.route("/api", integrityRoute);
app.route("/api", healthRoute);
app.route("/api", freshnessRoute);
app.route("/api", wikiRoute);
app.route("/api", requirementsRoute);
app.route("/api", agentRoute);
app.route("/api", tokenRoute);
