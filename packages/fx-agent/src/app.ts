// fx-agent app stub (F571 TDD Red Phase — routes not yet implemented)
import { Hono } from "hono";
import type { AgentEnv } from "./env.js";

const app = new Hono<{ Bindings: AgentEnv }>();

app.get("/api/agent/health", (c) => c.json({ domain: "agent", status: "ok" }));

export default app;
