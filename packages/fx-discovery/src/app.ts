// fx-discovery app (F518: FX-REQ-546)
import { Hono } from "hono";
import type { DiscoveryEnv } from "./env.js";

const app = new Hono<{ Bindings: DiscoveryEnv }>();

app.get("/api/discovery/health", (c) => {
  return c.json({ domain: "discovery", status: "ok" });
});

export default app;
