import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { OrgService, OrgError } from "../services/org.js";
import { tenantGuard } from "../../../middleware/tenant.js";
import type { JwtPayload } from "../../../middleware/auth.js";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import {
  CreateOrgSchema,
  UpdateOrgSchema,
  OrgParamsSchema,
  MemberParamsSchema,
  UpdateMemberRoleSchema,
  CreateInvitationSchema,
  OrgResponseSchema,
  OrgMemberResponseSchema,
  OrgInvitationResponseSchema,
} from "../schemas/org.js";
import { ErrorSchema, validationHook } from "../../../schemas/common.js";

export const orgRoute = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>({
  defaultHook: validationHook as any,
});

function getService(env: Env): OrgService {
  return new OrgService(env.DB);
}

function getPayload(c: any): JwtPayload {
  return c.get("jwtPayload") as JwtPayload;
}

// ─── POST /orgs — Create org (auth only, no tenantGuard) ───

const createOrgRoute = createRoute({
  method: "post",
  path: "/orgs",
  tags: ["Org"],
  summary: "Create a new organization",
  request: {
    body: { content: { "application/json": { schema: CreateOrgSchema } } },
  },
  responses: {
    201: { content: { "application/json": { schema: OrgResponseSchema } }, description: "Organization created" },
    409: { content: { "application/json": { schema: ErrorSchema } }, description: "Slug already exists" },
  },
});

orgRoute.openapi(createOrgRoute, async (c) => {
  const payload = getPayload(c);
  const { name, slug } = c.req.valid("json");
  try {
    const org = await getService(c.env).createOrg(payload.sub, { name, slug });
    return c.json(org, 201);
  } catch (e) {
    if (e instanceof OrgError) return c.json({ error: e.message }, e.status as any);
    throw e;
  }
});

// ─── GET /orgs — List my orgs (auth only) ───

const listOrgsRoute = createRoute({
  method: "get",
  path: "/orgs",
  tags: ["Org"],
  summary: "List my organizations",
  responses: {
    200: { content: { "application/json": { schema: z.array(OrgResponseSchema) } }, description: "Organization list" },
  },
});

orgRoute.openapi(listOrgsRoute, async (c) => {
  const payload = getPayload(c);
  const orgs = await getService(c.env).listMyOrgs(payload.sub);
  return c.json(orgs, 200);
});

// ─── GET /orgs/:orgId — Get org detail (tenantGuard) ───

const getOrgRoute = createRoute({
  method: "get",
  path: "/orgs/{orgId}",
  tags: ["Org"],
  summary: "Get organization details",
  request: { params: OrgParamsSchema },
  responses: {
    200: { content: { "application/json": { schema: OrgResponseSchema } }, description: "Organization detail" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
  },
});

orgRoute.use("/orgs/:orgId", tenantGuard);
orgRoute.use("/orgs/:orgId/*", tenantGuard);

orgRoute.openapi(getOrgRoute, async (c) => {
  const { orgId } = c.req.valid("param");
  const org = await getService(c.env).getOrg(orgId);
  if (!org) return c.json({ error: "Organization not found" }, 404);
  return c.json(org, 200);
});

// ─── PATCH /orgs/:orgId — Update org (admin+) ───

const updateOrgRoute = createRoute({
  method: "patch",
  path: "/orgs/{orgId}",
  tags: ["Org"],
  summary: "Update organization",
  request: {
    params: OrgParamsSchema,
    body: { content: { "application/json": { schema: UpdateOrgSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: OrgResponseSchema } }, description: "Updated" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
  },
});

orgRoute.openapi(updateOrgRoute, async (c) => {
  // roleGuard inline check
  const orgRole = c.get("orgRole") as string;
  if (!orgRole || (orgRole !== "owner" && orgRole !== "admin")) {
    return c.json({ error: "Requires admin role or higher" }, 403);
  }

  const { orgId } = c.req.valid("param");
  const patch = c.req.valid("json");
  const org = await getService(c.env).updateOrg(orgId, patch);
  return c.json(org, 200);
});

// ─── GET /orgs/:orgId/members — List members ───

const listMembersRoute = createRoute({
  method: "get",
  path: "/orgs/{orgId}/members",
  tags: ["Org"],
  summary: "List organization members",
  request: { params: OrgParamsSchema },
  responses: {
    200: { content: { "application/json": { schema: z.array(OrgMemberResponseSchema) } }, description: "Members" },
  },
});

orgRoute.openapi(listMembersRoute, async (c) => {
  const { orgId } = c.req.valid("param");
  const members = await getService(c.env).listMembers(orgId);
  return c.json(members, 200);
});

// ─── PATCH /orgs/:orgId/members/:userId — Update role (owner only) ───

const updateMemberRoute = createRoute({
  method: "patch",
  path: "/orgs/{orgId}/members/{userId}",
  tags: ["Org"],
  summary: "Update member role (owner only)",
  request: {
    params: MemberParamsSchema,
    body: { content: { "application/json": { schema: UpdateMemberRoleSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: z.object({ ok: z.boolean() }) } }, description: "Updated" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
  },
});

orgRoute.openapi(updateMemberRoute, async (c) => {
  const orgRole = c.get("orgRole") as string;
  if (orgRole !== "owner") {
    return c.json({ error: "Requires owner role" }, 403);
  }

  const { orgId, userId } = c.req.valid("param");
  const { role } = c.req.valid("json");
  const payload = getPayload(c);

  try {
    await getService(c.env).updateMemberRole(orgId, userId, role, payload.sub);
    return c.json({ ok: true }, 200);
  } catch (e) {
    if (e instanceof OrgError) return c.json({ error: e.message }, e.status as any);
    throw e;
  }
});

// ─── DELETE /orgs/:orgId/members/:userId — Remove member (admin+) ───

const removeMemberRoute = createRoute({
  method: "delete",
  path: "/orgs/{orgId}/members/{userId}",
  tags: ["Org"],
  summary: "Remove member (admin+)",
  request: { params: MemberParamsSchema },
  responses: {
    200: { content: { "application/json": { schema: z.object({ ok: z.boolean() }) } }, description: "Removed" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
  },
});

orgRoute.openapi(removeMemberRoute, async (c) => {
  const orgRole = c.get("orgRole") as string;
  if (!orgRole || (orgRole !== "owner" && orgRole !== "admin")) {
    return c.json({ error: "Requires admin role or higher" }, 403);
  }

  const { orgId, userId } = c.req.valid("param");
  const payload = getPayload(c);

  try {
    await getService(c.env).removeMember(orgId, userId, payload.sub);
    return c.json({ ok: true }, 200);
  } catch (e) {
    if (e instanceof OrgError) return c.json({ error: e.message }, e.status as any);
    throw e;
  }
});

// ─── POST /orgs/:orgId/invitations — Create invitation (admin+) ───

const createInvitationRoute = createRoute({
  method: "post",
  path: "/orgs/{orgId}/invitations",
  tags: ["Org"],
  summary: "Invite user to organization (admin+)",
  request: {
    params: OrgParamsSchema,
    body: { content: { "application/json": { schema: CreateInvitationSchema } } },
  },
  responses: {
    201: { content: { "application/json": { schema: OrgInvitationResponseSchema } }, description: "Invitation created" },
    409: { content: { "application/json": { schema: ErrorSchema } }, description: "Already member or pending" },
  },
});

orgRoute.openapi(createInvitationRoute, async (c) => {
  const orgRole = c.get("orgRole") as string;
  if (!orgRole || (orgRole !== "owner" && orgRole !== "admin")) {
    return c.json({ error: "Requires admin role or higher" }, 403);
  }

  const { orgId } = c.req.valid("param");
  const { email, role } = c.req.valid("json");
  const payload = getPayload(c);

  try {
    const invitation = await getService(c.env).createInvitation(orgId, {
      email,
      role,
      invitedBy: payload.sub,
    });
    return c.json(invitation, 201);
  } catch (e) {
    if (e instanceof OrgError) return c.json({ error: e.message }, e.status as any);
    throw e;
  }
});

// ─── GET /orgs/:orgId/invitations — List invitations (admin+) ───

const listInvitationsRoute = createRoute({
  method: "get",
  path: "/orgs/{orgId}/invitations",
  tags: ["Org"],
  summary: "List pending invitations (admin+)",
  request: { params: OrgParamsSchema },
  responses: {
    200: { content: { "application/json": { schema: z.array(OrgInvitationResponseSchema) } }, description: "Invitations" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
  },
});

orgRoute.openapi(listInvitationsRoute, async (c) => {
  const orgRole = c.get("orgRole") as string;
  if (!orgRole || (orgRole !== "owner" && orgRole !== "admin")) {
    return c.json({ error: "Requires admin role or higher" }, 403);
  }

  const { orgId } = c.req.valid("param");
  const invitations = await getService(c.env).listInvitations(orgId);
  return c.json(invitations, 200);
});

// ─── DELETE /orgs/:orgId/invitations/:invitationId — Delete invitation (admin+) ───

const deleteInvitationRoute = createRoute({
  method: "delete",
  path: "/orgs/{orgId}/invitations/{invitationId}",
  tags: ["Org"],
  summary: "Cancel/delete invitation (admin+)",
  request: {
    params: z.object({ orgId: z.string(), invitationId: z.string() }).openapi("InvitationDeleteParams"),
  },
  responses: {
    200: { content: { "application/json": { schema: z.object({ ok: z.boolean() }) } }, description: "Deleted" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
  },
});

orgRoute.openapi(deleteInvitationRoute, async (c) => {
  const orgRole = c.get("orgRole") as string;
  if (!orgRole || (orgRole !== "owner" && orgRole !== "admin")) {
    return c.json({ error: "Requires admin role or higher" }, 403);
  }

  const { orgId, invitationId } = c.req.valid("param");
  try {
    await getService(c.env).deleteInvitation(invitationId, orgId);
    return c.json({ ok: true }, 200);
  } catch (e) {
    if (e instanceof OrgError) return c.json({ error: e.message }, e.status as any);
    throw e;
  }
});

// ─── Slack Notification Config CRUD (F94) ───

const VALID_CATEGORIES = ["agent", "pr", "plan", "queue", "message"] as const;
type SlackCategory = (typeof VALID_CATEGORIES)[number];

function isValidCategory(v: string): v is SlackCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(v);
}

function isValidWebhookUrl(url: string): boolean {
  return url.startsWith("https://hooks.slack.com/");
}

// ─── GET /orgs/:orgId/slack/configs ───

const listSlackConfigsRoute = createRoute({
  method: "get",
  path: "/orgs/{orgId}/slack/configs",
  tags: ["Org"],
  summary: "List Slack notification configs",
  request: { params: OrgParamsSchema },
  responses: {
    200: { content: { "application/json": { schema: z.object({ configs: z.array(z.any()) }) } }, description: "Config list" },
  },
});

orgRoute.openapi(listSlackConfigsRoute, async (c) => {
  const { orgId } = c.req.valid("param");
  const db = c.env.DB;
  const { results } = await db.prepare(
    "SELECT id, category, webhook_url, enabled, created_at, updated_at FROM slack_notification_configs WHERE org_id = ? ORDER BY category",
  ).bind(orgId).all();

  const configs = (results ?? []).map((r: any) => ({
    ...r,
    enabled: !!r.enabled,
  }));
  return c.json({ configs }, 200);
});

// ─── PUT /orgs/:orgId/slack/configs/:category ───

const upsertSlackConfigRoute = createRoute({
  method: "put",
  path: "/orgs/{orgId}/slack/configs/{category}",
  tags: ["Org"],
  summary: "Upsert Slack notification config (admin+)",
  request: {
    params: z.object({ orgId: z.string(), category: z.string() }).openapi("SlackConfigParams"),
    body: { content: { "application/json": { schema: z.object({ webhook_url: z.string(), enabled: z.boolean().default(true) }) } } },
  },
  responses: {
    200: { content: { "application/json": { schema: z.any() } }, description: "Config upserted" },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "Validation error" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
  },
});

orgRoute.openapi(upsertSlackConfigRoute, async (c) => {
  const orgRole = c.get("orgRole") as string;
  if (!orgRole || (orgRole !== "owner" && orgRole !== "admin")) {
    return c.json({ error: "Requires admin role or higher" }, 403);
  }

  const { orgId, category } = c.req.valid("param");
  if (!isValidCategory(category)) {
    return c.json({ error: `Invalid category: ${category}. Must be one of: ${VALID_CATEGORIES.join(", ")}` }, 400);
  }

  const { webhook_url, enabled } = c.req.valid("json");
  if (!isValidWebhookUrl(webhook_url)) {
    return c.json({ error: "webhook_url must start with https://hooks.slack.com/" }, 400);
  }

  const db = c.env.DB;
  const id = `snc_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO slack_notification_configs (id, org_id, category, webhook_url, enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(org_id, category) DO UPDATE SET webhook_url = excluded.webhook_url, enabled = excluded.enabled, updated_at = excluded.updated_at`,
  ).bind(id, orgId, category, webhook_url, enabled ? 1 : 0, now, now).run();

  const row = await db.prepare(
    "SELECT id, category, webhook_url, enabled, created_at, updated_at FROM slack_notification_configs WHERE org_id = ? AND category = ?",
  ).bind(orgId, category).first();

  return c.json({ ...(row as any), enabled: !!(row as any).enabled }, 200);
});

// ─── DELETE /orgs/:orgId/slack/configs/:category ───

const deleteSlackConfigRoute = createRoute({
  method: "delete",
  path: "/orgs/{orgId}/slack/configs/{category}",
  tags: ["Org"],
  summary: "Delete Slack notification config (admin+)",
  request: {
    params: z.object({ orgId: z.string(), category: z.string() }).openapi("SlackConfigDeleteParams"),
  },
  responses: {
    200: { content: { "application/json": { schema: z.object({ deleted: z.boolean() }) } }, description: "Deleted" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
  },
});

orgRoute.openapi(deleteSlackConfigRoute, async (c) => {
  const orgRole = c.get("orgRole") as string;
  if (!orgRole || (orgRole !== "owner" && orgRole !== "admin")) {
    return c.json({ error: "Requires admin role or higher" }, 403);
  }

  const { orgId, category } = c.req.valid("param");
  const db = c.env.DB;

  const result = await db.prepare(
    "DELETE FROM slack_notification_configs WHERE org_id = ? AND category = ?",
  ).bind(orgId, category).run();

  if (!result.meta.changes) {
    return c.json({ error: "Config not found" }, 404);
  }

  return c.json({ deleted: true }, 200);
});

// ─── POST /orgs/:orgId/slack/test ───

const testSlackRoute = createRoute({
  method: "post",
  path: "/orgs/{orgId}/slack/test",
  tags: ["Org"],
  summary: "Send test Slack notification (admin+)",
  request: {
    params: OrgParamsSchema,
    body: { content: { "application/json": { schema: z.object({ category: z.string().optional() }) } } },
  },
  responses: {
    200: { content: { "application/json": { schema: z.object({ sent: z.boolean() }) } }, description: "Test sent" },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "No webhook configured" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
  },
});

orgRoute.openapi(testSlackRoute, async (c) => {
  const orgRole = c.get("orgRole") as string;
  if (!orgRole || (orgRole !== "owner" && orgRole !== "admin")) {
    return c.json({ error: "Requires admin role or higher" }, 403);
  }

  const { orgId } = c.req.valid("param");
  const { category } = c.req.valid("json");
  const db = c.env.DB;

  let webhookUrl: string | null = null;
  const label = category ?? "default";

  if (category) {
    const config = await db.prepare(
      "SELECT webhook_url, enabled FROM slack_notification_configs WHERE org_id = ? AND category = ?",
    ).bind(orgId, category).first<{ webhook_url: string; enabled: number }>();

    if (config && config.enabled) {
      webhookUrl = config.webhook_url;
    }
  }

  if (!webhookUrl) {
    const org = await db.prepare(
      "SELECT settings FROM organizations WHERE id = ?",
    ).bind(orgId).first<{ settings: string }>();

    if (org) {
      const settings = JSON.parse(org.settings || "{}");
      webhookUrl = settings.slack_webhook_url || null;
    }
  }

  if (!webhookUrl) {
    return c.json({ error: `No webhook configured for category: ${label}` }, 400);
  }

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blocks: [
        { type: "header", text: { type: "plain_text", text: `🔔 Foundry-X 알림 테스트`, emoji: true } },
        { type: "section", text: { type: "mrkdwn", text: `*${label}* 채널 연결 확인 — 이 메시지가 보이면 정상이에요.` } },
      ],
    }),
  });

  return c.json({ sent: true }, 200);
});
