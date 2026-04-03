/**
 * Sprint 121: GTM Outreach Routes — 아웃리치 파이프라인 (F299)
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { GtmOutreachService } from "../services/gtm-outreach-service.js";
import { OutreachProposalService } from "../services/outreach-proposal-service.js";
import {
  CreateGtmOutreachSchema,
  UpdateOutreachStatusSchema,
  GtmOutreachFilterSchema,
} from "../schemas/gtm-outreach.schema.js";

export const gtmOutreachRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// GET /gtm/outreach/stats — 파이프라인 통계 (stats 먼저 등록해야 :id보다 우선)
gtmOutreachRoute.get("/gtm/outreach/stats", async (c) => {
  const orgId = c.get("orgId");
  const svc = new GtmOutreachService(c.env.DB);
  const stats = await svc.stats(orgId);
  return c.json(stats);
});

// POST /gtm/outreach — 아웃리치 생성
gtmOutreachRoute.post("/gtm/outreach", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json();
  const parsed = CreateGtmOutreachSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new GtmOutreachService(c.env.DB);
  const outreach = await svc.create({ ...parsed.data, orgId, createdBy: userId });
  return c.json(outreach, 201);
});

// GET /gtm/outreach — 아웃리치 목록
gtmOutreachRoute.get("/gtm/outreach", async (c) => {
  const orgId = c.get("orgId");
  const query = c.req.query();
  const parsed = GtmOutreachFilterSchema.safeParse(query);
  if (!parsed.success) {
    return c.json({ error: "Invalid filters", details: parsed.error.flatten() }, 400);
  }

  const svc = new GtmOutreachService(c.env.DB);
  const result = await svc.list(orgId, parsed.data);
  return c.json(result);
});

// GET /gtm/outreach/:id — 아웃리치 상세
gtmOutreachRoute.get("/gtm/outreach/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const svc = new GtmOutreachService(c.env.DB);
  const outreach = await svc.getById(id, orgId);
  if (!outreach) {
    return c.json({ error: "Outreach not found" }, 404);
  }
  return c.json(outreach);
});

// PATCH /gtm/outreach/:id/status — 상태 변경
gtmOutreachRoute.patch("/gtm/outreach/:id/status", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const body = await c.req.json();
  const parsed = UpdateOutreachStatusSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new GtmOutreachService(c.env.DB);
  try {
    const updated = await svc.updateStatus(id, orgId, parsed.data.status, parsed.data.responseNote);
    if (!updated) {
      return c.json({ error: "Outreach not found" }, 404);
    }
    return c.json(updated);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

// DELETE /gtm/outreach/:id — 삭제 (draft만)
gtmOutreachRoute.delete("/gtm/outreach/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const svc = new GtmOutreachService(c.env.DB);
  try {
    const deleted = await svc.delete(id, orgId);
    if (!deleted) {
      return c.json({ error: "Outreach not found" }, 404);
    }
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

// POST /gtm/outreach/:id/generate — 맞춤 제안서 생성
gtmOutreachRoute.post("/gtm/outreach/:id/generate", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const svc = new OutreachProposalService(c.env.DB, c.env.AI);
  try {
    const content = await svc.generate(id, orgId);
    return c.json({ content });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});
