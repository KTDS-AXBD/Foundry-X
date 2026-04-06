// ─── F390: Quality Dashboard Routes (Sprint 178) ───

import { Hono } from "hono";
import { QualityDashboardService } from "../services/quality-dashboard-service.js";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";

export const qualityDashboardRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// GET /quality-dashboard/summary — 전체 통계 (점수카드용)
qualityDashboardRoute.get("/quality-dashboard/summary", async (c) => {
  const svc = new QualityDashboardService(c.env.DB);
  const summary = await svc.getSummary();
  return c.json({ summary });
});

// GET /quality-dashboard/dimensions — 5차원 평균 (레이더차트용)
qualityDashboardRoute.get("/quality-dashboard/dimensions", async (c) => {
  const svc = new QualityDashboardService(c.env.DB);
  const dimensions = await svc.getDimensionAverages();
  return c.json({ dimensions });
});

// GET /quality-dashboard/trend — 시간별 추이
qualityDashboardRoute.get("/quality-dashboard/trend", async (c) => {
  const days = Number(c.req.query("days") ?? 30);
  const svc = new QualityDashboardService(c.env.DB);
  const trend = await svc.getTrend(days);
  return c.json({ trend });
});
