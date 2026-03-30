/**
 * Sprint 79: Notifications Routes — 인앱 알림 (F233)
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { NotificationService } from "../services/notification-service.js";
import { NotificationFilterSchema } from "../schemas/notification.schema.js";

export const notificationsRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// GET /notifications — 내 알림 목록
notificationsRoute.get("/notifications", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const query = c.req.query();
  const parsed = NotificationFilterSchema.safeParse(query);
  if (!parsed.success) {
    return c.json({ error: "Invalid filters", details: parsed.error.flatten() }, 400);
  }

  const svc = new NotificationService(c.env.DB);
  const notifications = await svc.listByRecipient(userId, orgId, {
    unreadOnly: parsed.data.unreadOnly,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });
  const unreadCount = await svc.countUnread(userId, orgId);

  return c.json({ notifications, unreadCount });
});

// PATCH /notifications/:id/read — 읽음 처리
notificationsRoute.patch("/notifications/:id/read", async (c) => {
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const id = c.req.param("id");

  const svc = new NotificationService(c.env.DB);
  const success = await svc.markAsRead(id, userId);

  if (!success) {
    return c.json({ error: "Notification not found or already read" }, 404);
  }

  return c.json({ ok: true });
});
