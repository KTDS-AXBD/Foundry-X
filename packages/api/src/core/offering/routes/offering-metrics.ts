/**
 * F383: Offering Metrics Routes — 3 endpoints (Sprint 174)
 */

import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { OfferingMetricsService } from "../services/offering-metrics-service.js";
import {
  RecordOfferingEventSchema,
  OfferingMetricsQuerySchema,
  OfferingEventHistoryQuerySchema,
} from "../schemas/offering-metrics.schema.js";

export const offeringMetricsRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /offerings/metrics/record — Offering 이벤트 기록
offeringMetricsRoute.post("/offerings/metrics/record", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = RecordOfferingEventSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new OfferingMetricsService(c.env.DB);
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const result = await svc.recordEvent(c.get("orgId"), parsed.data, userId);
  return c.json(result, 201);
});

// GET /offerings/metrics — 집계 요약
offeringMetricsRoute.get("/offerings/metrics", async (c) => {
  const parsed = OfferingMetricsQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const svc = new OfferingMetricsService(c.env.DB);
  const summary = await svc.getSummary(c.get("orgId"), parsed.data);
  return c.json(summary);
});

// GET /offerings/:id/metrics/events — 특정 Offering 이벤트 이력
offeringMetricsRoute.get("/offerings/:id/metrics/events", async (c) => {
  const offeringId = c.req.param("id");
  const parsed = OfferingEventHistoryQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const svc = new OfferingMetricsService(c.env.DB);
  const events = await svc.getEventHistory(
    c.get("orgId"),
    offeringId,
    parsed.data.limit,
    parsed.data.offset,
  );
  return c.json({ events, total: events.length });
});
