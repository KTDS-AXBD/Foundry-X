// fx-gateway app (F523: FX-REQ-551 — DISCOVERY 하드와이어 활성화)
// F538: ax-bd/discovery-report* 라우트도 fx-discovery로 이전
// F539b: CORS 미들웨어 추가 — 브라우저 직접 접점 (FX-REQ-577)
// F540: ax-bd/*, shaping/* → fx-shaping Worker
// F541: offerings/*, bdp/*, methodologies/*, biz-items/*/business-plan*, biz-items/*/methodology* → fx-offering
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

// F541: /api/biz-items/:id/business-plan* → fx-offering
// 주의: /api/biz-items/:id catch-all보다 먼저 등록 필수 (D1 체크리스트)
app.all("/api/biz-items/:id/business-plan", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});
app.all("/api/biz-items/:id/business-plan/*", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});

// F541: /api/biz-items/:id/methodology* → fx-offering
app.all("/api/biz-items/:id/methodology", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});
app.all("/api/biz-items/:id/methodology/*", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});

// F539c Group B: discovery-stages (/:id/discovery-progress, /:id/discovery-stage)
// 주의: /:id/discovery-* 패턴을 /:id 단순 패턴보다 먼저 등록
app.get("/api/biz-items/:id/discovery-progress", async (c) => {
  return c.env.DISCOVERY.fetch(c.req.raw);
});
app.post("/api/biz-items/:id/discovery-stage", async (c) => {
  return c.env.DISCOVERY.fetch(c.req.raw);
});

// F539c Group A: biz-items 3 라우트
app.get("/api/biz-items", async (c) => {
  return c.env.DISCOVERY.fetch(c.req.raw);
});
app.post("/api/biz-items", async (c) => {
  return c.env.DISCOVERY.fetch(c.req.raw);
});
app.get("/api/biz-items/:id", async (c) => {
  return c.env.DISCOVERY.fetch(c.req.raw);
});

// F539c Group B: discovery-pipeline GET 2 라우트
app.get("/api/discovery-pipeline/runs", async (c) => {
  return c.env.DISCOVERY.fetch(c.req.raw);
});
app.get("/api/discovery-pipeline/runs/:id", async (c) => {
  return c.env.DISCOVERY.fetch(c.req.raw);
});

// F540: /api/shaping/* → fx-shaping Worker
app.all("/api/shaping/*", async (c) => {
  return c.env.SHAPING.fetch(c.req.raw);
});

// F540: /api/ax-bd/* → fx-shaping Worker
// 주의: /api/ax-bd/discovery-report* 는 위에서 DISCOVERY로 먼저 처리됨
app.all("/api/ax-bd/*", async (c) => {
  return c.env.SHAPING.fetch(c.req.raw);
});

// F540: /api/ideas/:id/bmc — shaping이 소유 (BMC 생성 연동)
app.all("/api/ideas/:id/bmc", async (c) => {
  return c.env.SHAPING.fetch(c.req.raw);
});
app.all("/api/ideas/:id/bmc/*", async (c) => {
  return c.env.SHAPING.fetch(c.req.raw);
});

// F541: /api/offerings/* → fx-offering
app.all("/api/offerings", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});
app.all("/api/offerings/*", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});

// F541: /api/bdp/* → fx-offering
app.all("/api/bdp", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});
app.all("/api/bdp/*", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});

// F541: /api/methodologies → fx-offering
app.all("/api/methodologies", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});
app.all("/api/methodologies/*", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});

// 그 외 모든 /api/* 요청은 MAIN_API로
app.all("/api/*", async (c) => {
  return c.env.MAIN_API.fetch(c.req.raw);
});

export default app;
