// fx-gateway app (F523: FX-REQ-551 — DISCOVERY 하드와이어 활성화)
// F538: ax-bd/discovery-report* 라우트도 fx-discovery로 이전
// F539b: CORS 미들웨어 추가 — 브라우저 직접 접점 (FX-REQ-577)
// F540: ax-bd/*, shaping/* → fx-shaping Worker
// F541: offerings/*, bdp/*, methodologies/*, biz-items/*/business-plan*, biz-items/*/methodology* → fx-offering
// F570: offering-packs/* → fx-offering (Sprint 318)
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

// F541+F570: /api/biz-items/:id/business-plan* → fx-offering
// 주의: /api/biz-items/:id catch-all보다 먼저 등록 필수 (D1 체크리스트)
app.all("/api/biz-items/:id/business-plan", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});
app.all("/api/biz-items/:id/business-plan/*", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});

// F541+F570: /api/biz-items/:id/methodology* → fx-offering
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

// F541+F570: /api/offerings/* → fx-offering
app.all("/api/offerings", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});
app.all("/api/offerings/*", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});

// F541+F570: /api/bdp/* → fx-offering
app.all("/api/bdp", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});
app.all("/api/bdp/*", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});

// F541+F570: /api/methodologies → fx-offering
app.all("/api/methodologies", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});
app.all("/api/methodologies/*", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});

// F570: /api/offering-packs → fx-offering (Sprint 318)
app.all("/api/offering-packs", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});
app.all("/api/offering-packs/*", async (c) => {
  return c.env.OFFERING.fetch(c.req.raw);
});

// F560: discovery-stage-runner/graph/shape-pipeline 명시 라우트 제거 (Sprint 311 scope drift 해소)
// stage-runner(F571)/graph/shape-pipeline(F562)는 catch-all → MAIN_API로 처리됨

// F572: portal/gate/launch → fx-modules Worker
app.all("/api/portal/*", async (c) => {
  return c.env.MODULES.fetch(c.req.raw);
});
app.all("/api/gate/*", async (c) => {
  return c.env.MODULES.fetch(c.req.raw);
});
app.all("/api/launch/*", async (c) => {
  return c.env.MODULES.fetch(c.req.raw);
});

// F571: agent domain routes → fx-agent Worker (catch-all보다 위쪽에 등록)
app.all("/api/agent-adapters/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/agent-definitions/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/command-registry/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/context-passthroughs/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/execution-events", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/execution-events/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/meta/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/task-states/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/orgs/:orgId/workflows", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/orgs/:orgId/workflows/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});

// F575: 잔여 7 routes → fx-agent (완전 분리)
app.all("/api/agents", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/agents/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/telemetry/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/skills/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/plan", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/plan/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/worktrees", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/routing-rules", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/routing-rules/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});

// 그 외 모든 /api/* 요청은 MAIN_API로
app.all("/api/*", async (c) => {
  return c.env.MAIN_API.fetch(c.req.raw);
});

export default app;
