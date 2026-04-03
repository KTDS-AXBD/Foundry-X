/**
 * Sprint 116: Validation Meetings Routes — 인터뷰/미팅 관리 CRUD (F295)
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { MeetingService } from "../services/meeting-service.js";
import { CreateMeetingSchema, UpdateMeetingSchema, MeetingFilterSchema } from "../schemas/validation.schema.js";

export const validationMeetingsRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// POST /validation/meetings — 미팅 생성
validationMeetingsRoute.post("/validation/meetings", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json();
  const parsed = CreateMeetingSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new MeetingService(c.env.DB);
  const meeting = await svc.create(parsed.data, orgId, userId);
  return c.json(meeting, 201);
});

// GET /validation/meetings — 미팅 목록
validationMeetingsRoute.get("/validation/meetings", async (c) => {
  const orgId = c.get("orgId");
  const query = c.req.query();
  const parsed = MeetingFilterSchema.safeParse(query);
  if (!parsed.success) {
    return c.json({ error: "Invalid filters", details: parsed.error.flatten() }, 400);
  }

  const svc = new MeetingService(c.env.DB);
  const result = await svc.list(orgId, parsed.data);
  return c.json(result);
});

// GET /validation/meetings/:id — 미팅 상세
validationMeetingsRoute.get("/validation/meetings/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const svc = new MeetingService(c.env.DB);
  const meeting = await svc.getById(id, orgId);

  if (!meeting) {
    return c.json({ error: "Meeting not found" }, 404);
  }

  return c.json(meeting);
});

// PATCH /validation/meetings/:id — 미팅 수정
validationMeetingsRoute.patch("/validation/meetings/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const body = await c.req.json();
  const parsed = UpdateMeetingSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new MeetingService(c.env.DB);
  const updated = await svc.update(id, orgId, parsed.data);

  if (!updated) {
    return c.json({ error: "Meeting not found" }, 404);
  }

  return c.json(updated);
});

// DELETE /validation/meetings/:id — 미팅 삭제
validationMeetingsRoute.delete("/validation/meetings/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const svc = new MeetingService(c.env.DB);
  const deleted = await svc.delete(id, orgId);

  if (!deleted) {
    return c.json({ error: "Meeting not found" }, 404);
  }

  return c.json({ success: true });
});
