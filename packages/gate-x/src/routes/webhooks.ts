import { Hono } from "hono";
import type { GateEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { requireTenantAdmin } from "../middleware/tenant.js";
import { webhookService } from "../services/webhook-service.js";
import { CreateWebhookSchema, UpdateWebhookSchema } from "../schemas/webhook-schema.js";

export const webhooksRoute = new Hono<{ Bindings: GateEnv; Variables: TenantVariables }>();

// GET /api/gate/webhooks — 구독 목록
webhooksRoute.get("/webhooks", async (c) => {
  const orgId = c.get("orgId");
  const list = await webhookService.list(orgId, c.env.DB);
  return c.json({ webhooks: list });
});

// POST /api/gate/webhooks — 구독 생성 (tenant_admin)
webhooksRoute.post("/webhooks", requireTenantAdmin, async (c) => {
  const body = await c.req.json();
  const parsed = CreateWebhookSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const webhook = await webhookService.create(orgId, parsed.data, userId, c.env.DB);
  return c.json({ webhook }, 201);
});

// GET /api/gate/webhooks/:id — 단건 조회
webhooksRoute.get("/webhooks/:id", async (c) => {
  const orgId = c.get("orgId");
  const webhook = await webhookService.get(c.req.param("id"), orgId, c.env.DB);
  if (!webhook) return c.json({ error: "Webhook not found" }, 404);
  return c.json({ webhook });
});

// PUT /api/gate/webhooks/:id — 업데이트 (tenant_admin)
webhooksRoute.put("/webhooks/:id", requireTenantAdmin, async (c) => {
  const body = await c.req.json();
  const parsed = UpdateWebhookSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  const orgId = c.get("orgId");
  const webhook = await webhookService.update(c.req.param("id") ?? "", orgId, parsed.data, c.env.DB);
  if (!webhook) return c.json({ error: "Webhook not found" }, 404);
  return c.json({ webhook });
});

// DELETE /api/gate/webhooks/:id — 삭제 (tenant_admin)
webhooksRoute.delete("/webhooks/:id", requireTenantAdmin, async (c) => {
  const orgId = c.get("orgId");
  const deleted = await webhookService.delete(c.req.param("id") ?? "", orgId, c.env.DB);
  if (!deleted) return c.json({ error: "Webhook not found" }, 404);
  return c.json({ success: true });
});
