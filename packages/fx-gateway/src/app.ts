// fx-gateway app (F523: FX-REQ-551 — DISCOVERY 하드와이어 활성화)
// F538: ax-bd/discovery-report* 라우트도 fx-discovery로 이전
// F539b: CORS 미들웨어 추가 — 브라우저 직접 접점 (FX-REQ-577)
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { GatewayEnv } from "./env.js";

const app = new Hono<{ Bindings: GatewayEnv }>();

// CORS — fx.minu.best, foundry-x-web.pages.dev, localhost:3000 허용
app.use("*", cors({
  origin: ["https://fx.minu.best", "https://foundry-x-web.pages.dev", "http://localhost:3000"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 86400,
}));

// /api/discovery/* → fx-discovery Worker (Service Binding 직접 연결)
app.all("/api/discovery/*", async (c) => {
  return c.env.DISCOVERY.fetch(c.req.raw);
});

// F538: /api/ax-bd/discovery-report(s)/* → fx-discovery
app.all("/api/ax-bd/discovery-reports/*", async (c) => {
  return c.env.DISCOVERY.fetch(c.req.raw);
});
app.all("/api/ax-bd/discovery-report/*", async (c) => {
  return c.env.DISCOVERY.fetch(c.req.raw);
});

// 그 외 모든 /api/* 요청은 MAIN_API로
app.all("/api/*", async (c) => {
  return c.env.MAIN_API.fetch(c.req.raw);
});

export default app;
