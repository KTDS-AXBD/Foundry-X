// fx-gateway app (F517: FX-REQ-545)
import { Hono } from "hono";
import type { GatewayEnv } from "./env.js";

const app = new Hono<{ Bindings: GatewayEnv }>();

// /api/discovery/* — DISCOVERY_ENABLED=true 이면 DISCOVERY binding으로 전송,
// 아니면 MAIN_API로 폴백 (스위치 기반 점진적 전환)
app.all("/api/discovery/*", async (c) => {
  const discoveryEnabled = c.env.DISCOVERY_ENABLED === "true";
  const target = discoveryEnabled && c.env.DISCOVERY ? c.env.DISCOVERY : c.env.MAIN_API;
  return target.fetch(c.req.raw);
});

// 그 외 모든 /api/* 요청은 MAIN_API로
app.all("/api/*", async (c) => {
  return c.env.MAIN_API.fetch(c.req.raw);
});

export default app;
