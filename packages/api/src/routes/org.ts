import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { OrgService, OrgError } from "../services/org.js";
import { tenantGuard } from "../middleware/tenant.js";
import { roleGuard } from "../middleware/role-guard.js";
import type { JwtPayload } from "../middleware/auth.js";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
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
import { ErrorSchema, validationHook } from "../schemas/common.js";

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
