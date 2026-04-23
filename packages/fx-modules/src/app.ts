// fx-modules app (F572: FX-REQ-615 — portal/gate/launch 통합 Worker)
// Stub for TDD Red phase — health endpoints only
import { Hono } from "hono";
import type { ModulesEnv } from "./env.js";

const app = new Hono<{ Bindings: ModulesEnv }>();

// Public health endpoints
app.get("/api/portal/health", (c) => c.json({ domain: "portal", status: "ok" }));
app.get("/api/gate/health", (c) => c.json({ domain: "gate", status: "ok" }));
app.get("/api/launch/health", (c) => c.json({ domain: "launch", status: "ok" }));

export default app;
