import { Hono } from "hono";
import type { GateEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { MeetingService } from "../services/meeting-service.js";
import { CreateMeetingSchema, UpdateMeetingSchema, MeetingFilterSchema } from "../schemas/validation.schema.js";

export const validationMeetingsRoute = new Hono<{ Bindings: GateEnv; Variables: TenantVariables }>();

validationMeetingsRoute.post("/validation/meetings", async (c) => {
  const body = await c.req.json();
  const parsed = CreateMeetingSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  return c.json(await new MeetingService(c.env.DB).create(parsed.data, c.get("orgId"), c.get("userId")), 201);
});

validationMeetingsRoute.get("/validation/meetings", async (c) => {
  const parsed = MeetingFilterSchema.safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: "Invalid filters", details: parsed.error.flatten() }, 400);
  return c.json(await new MeetingService(c.env.DB).list(c.get("orgId"), parsed.data));
});

validationMeetingsRoute.get("/validation/meetings/:id", async (c) => {
  const meeting = await new MeetingService(c.env.DB).getById(c.req.param("id"), c.get("orgId"));
  if (!meeting) return c.json({ error: "Meeting not found" }, 404);
  return c.json(meeting);
});

validationMeetingsRoute.patch("/validation/meetings/:id", async (c) => {
  const body = await c.req.json();
  const parsed = UpdateMeetingSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  const updated = await new MeetingService(c.env.DB).update(c.req.param("id"), c.get("orgId"), parsed.data);
  if (!updated) return c.json({ error: "Meeting not found" }, 404);
  return c.json(updated);
});

validationMeetingsRoute.delete("/validation/meetings/:id", async (c) => {
  const deleted = await new MeetingService(c.env.DB).delete(c.req.param("id"), c.get("orgId"));
  if (!deleted) return c.json({ error: "Meeting not found" }, 404);
  return c.json({ success: true });
});
