// fx-discovery app (F518: FX-REQ-546, F523: FX-REQ-551)
import { Hono } from "hono";
import type { DiscoveryEnv } from "./env.js";
import items from "./routes/items.js";

const app = new Hono<{ Bindings: DiscoveryEnv }>();

app.get("/api/discovery/health", (c) => {
  return c.json({ domain: "discovery", status: "ok" });
});

app.route("/", items);

export default app;
