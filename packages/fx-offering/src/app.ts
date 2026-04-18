// fx-offering app stub (F541: FX-REQ-580) — TDD Red Phase
import { Hono } from "hono";
import type { OfferingEnv } from "./env.js";

const app = new Hono<{ Bindings: OfferingEnv }>();

// Health endpoint (public)
app.get("/api/offering/health", (c) => {
  return c.json({ domain: "offering", status: "ok" });
});

// TODO: F541 Green Phase — 12 routes 추가

export default app;
