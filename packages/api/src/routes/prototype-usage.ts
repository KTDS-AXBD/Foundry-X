// ─── F354: Prototype Usage REST API (Sprint 159) ───

import { Hono } from "hono";
import { PrototypeUsageService } from "../services/prototype-usage-service.js";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";

export const prototypeUsageRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// GET /prototype-usage — 월별 사용량 요약
prototypeUsageRoute.get("/prototype-usage", async (c) => {
  const orgId = c.get("orgId");
  const { year, month } = c.req.query();
  const now = new Date();
  const svc = new PrototypeUsageService(c.env.DB);
  const summary = await svc.getMonthlySummary(
    orgId,
    Number(year) || now.getFullYear(),
    Number(month) || now.getMonth() + 1,
  );
  return c.json(summary);
});

// GET /prototype-usage/budget — 예산 상태
prototypeUsageRoute.get("/prototype-usage/budget", async (c) => {
  const orgId = c.get("orgId");
  const { limitUsd } = c.req.query();
  const svc = new PrototypeUsageService(c.env.DB);
  const status = await svc.getBudgetStatus(orgId, Number(limitUsd) || 100);
  return c.json(status);
});

// GET /prototype-usage/daily — 일별 차트 데이터
prototypeUsageRoute.get("/prototype-usage/daily", async (c) => {
  const orgId = c.get("orgId");
  const { days } = c.req.query();
  const svc = new PrototypeUsageService(c.env.DB);
  const items = await svc.getDailyBreakdown(orgId, Number(days) || 30);
  return c.json({ items });
});
