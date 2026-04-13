// fx-gateway app (F523: FX-REQ-551 — DISCOVERY 하드와이어 활성화)
import { Hono } from "hono";
import type { GatewayEnv } from "./env.js";

const app = new Hono<{ Bindings: GatewayEnv }>();

// /api/discovery/* → fx-discovery Worker (Service Binding 직접 연결)
app.all("/api/discovery/*", async (c) => {
  return c.env.DISCOVERY.fetch(c.req.raw);
});

// 그 외 모든 /api/* 요청은 MAIN_API로
app.all("/api/*", async (c) => {
  return c.env.MAIN_API.fetch(c.req.raw);
});

export default app;
