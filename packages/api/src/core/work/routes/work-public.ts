// F518: Work KG 공개 API 라우터 — 인증 불필요
// app.ts에서 app.use("/api/*", authMiddleware) 이전에 등록해야 함
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import { WorkService } from "../services/work.service.js";
import { WorkKGService } from "../services/work-kg.service.js";

export const workPublicRoute = new Hono<{ Bindings: Env }>();

// ─── GET /api/work/public/roadmap ────────────────────────────────────────────

workPublicRoute.get("/work/public/roadmap", async (c) => {
  const svc = new WorkService(c.env);
  try {
    const data = await svc.getPhaseProgress();
    return c.json(data);
  } catch {
    return c.json({ error: "Failed to load roadmap" }, 500);
  }
});

// ─── GET /api/work/public/changelog ──────────────────────────────────────────

workPublicRoute.get("/work/public/changelog", async (c) => {
  const svc = new WorkService(c.env);
  try {
    const data = await svc.getChangelog();
    return c.json(data);
  } catch {
    return c.json({ error: "Failed to load changelog" }, 500);
  }
});

// ─── GET /api/work/public/kg/trace ───────────────────────────────────────────

workPublicRoute.get("/work/public/kg/trace", async (c) => {
  const id = c.req.query("id");
  const depthParam = c.req.query("depth");

  if (!id) {
    return c.json({ error: "id query parameter required" }, 400);
  }

  const depth = Math.min(Math.max(parseInt(depthParam ?? "2", 10) || 2, 0), 5);

  const kgSvc = new WorkKGService(c.env);
  const graph = await kgSvc.traceGraph(id, depth);

  if (!graph) {
    return c.json({ error: `Node not found: ${id}` }, 404);
  }

  return c.json(graph);
});
