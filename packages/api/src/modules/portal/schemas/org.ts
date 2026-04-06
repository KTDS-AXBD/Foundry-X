import { z } from "@hono/zod-openapi";

// ─── Org CRUD ───

export const CreateOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
}).openapi("CreateOrg");

export const UpdateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  settings: z.record(z.unknown()).optional(),
}).openapi("UpdateOrg");

export const OrgParamsSchema = z.object({
  orgId: z.string().min(1),
}).openapi("OrgParams");

// ─── Members ───

export const MemberParamsSchema = z.object({
  orgId: z.string().min(1),
  userId: z.string().min(1),
}).openapi("MemberParams");

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member", "viewer"]),
}).openapi("UpdateMemberRole");

// ─── Invitations ───

export const CreateInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
}).openapi("CreateInvitation");

export const InvitationTokenSchema = z.object({
  token: z.string().min(1),
}).openapi("InvitationToken");

// ─── Org 전환 ───

export const SwitchOrgSchema = z.object({
  orgId: z.string().min(1),
}).openapi("SwitchOrg");

// ─── Response Schemas ───

export const OrgResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  plan: z.enum(["free", "pro", "enterprise"]),
  settings: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
}).openapi("OrgResponse");

export const OrgMemberResponseSchema = z.object({
  orgId: z.string(),
  userId: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(["owner", "admin", "member", "viewer"]),
  joinedAt: z.string(),
}).openapi("OrgMemberResponse");

export const OrgInvitationResponseSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  email: z.string(),
  role: z.enum(["admin", "member", "viewer"]),
  token: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
  acceptedAt: z.string().nullable(),
  invitedBy: z.string(),
}).openapi("OrgInvitationResponse");
