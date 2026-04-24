/**
 * Sprint 81: MVP Tracking Routes — MVP 상태 추적 + 자동화 (F238)
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { MvpTrackingService } from "../services/mvp-tracking-service.js";
import {
  CreateMvpSchema,
  UpdateMvpStatusSchema,
  MvpFilterSchema,
} from "../schemas/mvp-tracking.schema.js";

export const mvpTrackingRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// POST /mvp-tracking — MVP 등록
mvpTrackingRoute.post("/mvp-tracking", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json();
  const parsed = CreateMvpSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new MvpTrackingService(c.env.DB);
  const mvp = await svc.create({ ...parsed.data, orgId, createdBy: userId });

  return c.json(mvp, 201);
});

// GET /mvp-tracking — 목록
mvpTrackingRoute.get("/mvp-tracking", async (c) => {
  const orgId = c.get("orgId");
  const query = c.req.query();
  const parsed = MvpFilterSchema.safeParse(query);
  if (!parsed.success) {
    return c.json({ error: "Invalid filters", details: parsed.error.flatten() }, 400);
  }

  const svc = new MvpTrackingService(c.env.DB);
  const mvps = await svc.list(orgId, parsed.data);
  return c.json(mvps);
});

// GET /mvp-tracking/:id — 상세
mvpTrackingRoute.get("/mvp-tracking/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const svc = new MvpTrackingService(c.env.DB);
  const mvp = await svc.getById(id, orgId);
  if (!mvp) {
    return c.json({ error: "MVP not found" }, 404);
  }

  return c.json(mvp);
});

// PATCH /mvp-tracking/:id/status — 상태 변경
mvpTrackingRoute.patch("/mvp-tracking/:id/status", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const id = c.req.param("id");

  const body = await c.req.json();
  const parsed = UpdateMvpStatusSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new MvpTrackingService(c.env.DB);
  try {
    const mvp = await svc.updateStatus(id, orgId, { status: parsed.data.status, changedBy: userId, reason: parsed.data.reason });
    return c.json(mvp);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("not found")) return c.json({ error: msg }, 404);
    return c.json({ error: msg }, 400);
  }
});

// GET /mvp-tracking/:id/history — 이력
mvpTrackingRoute.get("/mvp-tracking/:id/history", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const svc = new MvpTrackingService(c.env.DB);
  try {
    const history = await svc.getHistory(id, orgId);
    return c.json(history);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("not found")) return c.json({ error: msg }, 404);
    return c.json({ error: msg }, 400);
  }
});
