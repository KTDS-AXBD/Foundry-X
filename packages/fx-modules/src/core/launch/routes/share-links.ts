/**
 * Sprint 79: ShareLinks Routes — 산출물 공유 (F233)
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { ShareLinkService } from "../services/share-link-service.js";
import { NotificationService } from "../../../services/notification-service.js";
import { CreateShareLinkSchema, ReviewRequestSchema } from "../schemas/share-link.schema.js";

export const shareLinksRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// POST /share-links — 공유 링크 생성
shareLinksRoute.post("/share-links", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json();
  const parsed = CreateShareLinkSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new ShareLinkService(c.env.DB);
  const link = await svc.create({
    bizItemId: parsed.data.bizItemId,
    orgId,
    accessLevel: parsed.data.accessLevel,
    expiresInDays: parsed.data.expiresInDays,
    createdBy: userId,
  });

  return c.json(link, 201);
});

// GET /share-links — 내 공유 링크 목록
shareLinksRoute.get("/share-links", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const svc = new ShareLinkService(c.env.DB);
  const links = await svc.listByUser(orgId, userId);
  return c.json(links);
});

// DELETE /share-links/:id — 공유 링크 무효화
shareLinksRoute.delete("/share-links/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const svc = new ShareLinkService(c.env.DB);
  const success = await svc.revoke(id, orgId);

  if (!success) {
    return c.json({ error: "Share link not found or already revoked" }, 404);
  }

  return c.json({ ok: true });
});

// POST /share-links/:id/review-request — 리뷰 요청
shareLinksRoute.post("/share-links/:id/review-request", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const linkId = c.req.param("id");

  const body = await c.req.json();
  const parsed = ReviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  // Verify share link exists
  const shareSvc = new ShareLinkService(c.env.DB);
  const links = await shareSvc.listByUser(orgId, userId);
  const link = links.find((l) => l.id === linkId);
  if (!link) {
    return c.json({ error: "Share link not found" }, 404);
  }

  // Send notifications to recipients
  const notifSvc = new NotificationService(c.env.DB);
  const inputs = parsed.data.recipientIds.map((recipientId) => ({
    orgId,
    recipientId,
    type: "review_request" as const,
    bizItemId: link.bizItemId,
    title: "리뷰 요청",
    body: parsed.data.message ?? "산출물 리뷰를 요청합니다.",
    actorId: userId,
  }));

  await notifSvc.createBatch(inputs);

  return c.json({ ok: true, notified: parsed.data.recipientIds.length });
});
