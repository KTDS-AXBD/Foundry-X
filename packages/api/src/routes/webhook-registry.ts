import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { WebhookRegistryService, WebhookError } from "../services/webhook-registry.js";
import { webhookCreateSchema, webhookResponseSchema } from "../schemas/webhook.js";
import { ErrorSchema, validationHook } from "../schemas/common.js";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";

export const webhookRegistryRoute = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>({
  defaultHook: validationHook as any,
});

const OrgIdParam = z.object({ orgId: z.string() }).openapi("WebhookRegistryOrgParams");
const WebhookIdParam = z.object({ orgId: z.string(), id: z.string() }).openapi("WebhookIdParams");

function getService(env: Env): WebhookRegistryService {
  return new WebhookRegistryService(env.DB);
}

// ─── GET /orgs/:orgId/webhooks ───

const listRoute = createRoute({
  method: "get",
  path: "/orgs/{orgId}/webhooks",
  tags: ["Webhooks"],
  summary: "List registered webhooks",
  request: { params: OrgIdParam },
  responses: {
    200: { content: { "application/json": { schema: z.object({ webhooks: z.array(webhookResponseSchema) }) } }, description: "Webhook list" },
  },
});

webhookRegistryRoute.openapi(listRoute, async (c) => {
  const { orgId } = c.req.valid("param");
  const webhooks = await getService(c.env).list(orgId);
  return c.json({ webhooks }, 200);
});

// ─── POST /orgs/:orgId/webhooks ───

const createWebhookRoute = createRoute({
  method: "post",
  path: "/orgs/{orgId}/webhooks",
  tags: ["Webhooks"],
  summary: "Register a webhook (admin+)",
  request: {
    params: OrgIdParam,
    body: { content: { "application/json": { schema: webhookCreateSchema } } },
  },
  responses: {
    201: { content: { "application/json": { schema: webhookResponseSchema } }, description: "Created" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
  },
});

webhookRegistryRoute.openapi(createWebhookRoute, async (c) => {
  const orgRole = c.get("orgRole") as string;
  if (!orgRole || (orgRole !== "owner" && orgRole !== "admin")) {
    return c.json({ error: "Requires admin role or higher" }, 403);
  }

  const { orgId } = c.req.valid("param");
  const input = c.req.valid("json");
  const webhook = await getService(c.env).register(orgId, input);
  return c.json(webhook, 201);
});

// ─── GET /orgs/:orgId/webhooks/:id ───

const getWebhookRoute = createRoute({
  method: "get",
  path: "/orgs/{orgId}/webhooks/{id}",
  tags: ["Webhooks"],
  summary: "Get webhook details",
  request: { params: WebhookIdParam },
  responses: {
    200: { content: { "application/json": { schema: webhookResponseSchema } }, description: "Webhook detail" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
  },
});

webhookRegistryRoute.openapi(getWebhookRoute, async (c) => {
  const { orgId, id } = c.req.valid("param");
  const webhook = await getService(c.env).get(orgId, id);
  if (!webhook) return c.json({ error: "Webhook not found" }, 404);
  return c.json(webhook, 200);
});

// ─── DELETE /orgs/:orgId/webhooks/:id ───

const deleteWebhookRoute = createRoute({
  method: "delete",
  path: "/orgs/{orgId}/webhooks/{id}",
  tags: ["Webhooks"],
  summary: "Delete a webhook (admin+)",
  request: { params: WebhookIdParam },
  responses: {
    200: { content: { "application/json": { schema: z.object({ ok: z.boolean() }) } }, description: "Deleted" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
  },
});

webhookRegistryRoute.openapi(deleteWebhookRoute, async (c) => {
  const orgRole = c.get("orgRole") as string;
  if (!orgRole || (orgRole !== "owner" && orgRole !== "admin")) {
    return c.json({ error: "Requires admin role or higher" }, 403);
  }

  const { orgId, id } = c.req.valid("param");
  const deleted = await getService(c.env).delete(orgId, id);
  if (!deleted) return c.json({ error: "Webhook not found" }, 404);
  return c.json({ ok: true }, 200);
});

// ─── POST /orgs/:orgId/webhooks/:id/test ───

const testWebhookRoute = createRoute({
  method: "post",
  path: "/orgs/{orgId}/webhooks/{id}/test",
  tags: ["Webhooks"],
  summary: "Test webhook delivery (admin+)",
  request: { params: WebhookIdParam },
  responses: {
    200: { content: { "application/json": { schema: z.object({ sent: z.boolean(), status: z.number().optional() }) } }, description: "Test result" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
  },
});

webhookRegistryRoute.openapi(testWebhookRoute, async (c) => {
  const orgRole = c.get("orgRole") as string;
  if (!orgRole || (orgRole !== "owner" && orgRole !== "admin")) {
    return c.json({ error: "Requires admin role or higher" }, 403);
  }

  const { orgId, id } = c.req.valid("param");
  try {
    const result = await getService(c.env).testWebhook(orgId, id);
    return c.json(result, 200);
  } catch (e) {
    if (e instanceof Error && e.message === "Webhook not found") {
      return c.json({ error: "Webhook not found" }, 404);
    }
    throw e;
  }
});

// ─── POST /webhook/:provider — Inbound (public) ───

export const webhookInboundRoute = new OpenAPIHono<{ Bindings: Env }>({
  defaultHook: validationHook as any,
});

const inboundRoute = createRoute({
  method: "post",
  path: "/webhook/{provider}",
  tags: ["Webhooks"],
  summary: "Receive inbound webhook (public, signature-verified)",
  request: { params: z.object({ provider: z.string() }).openapi("WebhookInboundParams") },
  responses: {
    200: { content: { "application/json": { schema: z.object({ processed: z.boolean() }) } }, description: "Processed" },
    401: { content: { "application/json": { schema: ErrorSchema } }, description: "Signature invalid" },
  },
});

webhookInboundRoute.openapi(inboundRoute, async (c) => {
  const { provider } = c.req.valid("param");
  const body = await c.req.text();

  try {
    const service = new WebhookRegistryService(c.env.DB);
    const result = await service.handleInbound(provider, c.req.raw.headers, body);
    return c.json({ processed: result.processed }, 200);
  } catch (e) {
    if (e instanceof WebhookError) {
      return c.json({ error: e.message }, e.status as 401);
    }
    throw e;
  }
});
