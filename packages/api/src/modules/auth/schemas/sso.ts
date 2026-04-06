import { z } from "@hono/zod-openapi";

const ServiceIdEnum = z.enum(["foundry-x", "discovery-x", "ai-foundry"]);
const RoleEnum = z.enum(["admin", "member", "viewer"]);

export const HubTokenRequestSchema = z.object({
  orgId: z.string().min(1),
});

export const HubTokenResponseSchema = z.object({
  hubToken: z.string(),
  expiresIn: z.number(),
});

export const VerifyRequestSchema = z.object({
  token: z.string().min(1),
});

export const VerifyResponseSchema = z.object({
  valid: z.boolean(),
  payload: z.object({
    sub: z.string(),
    email: z.string(),
    role: RoleEnum,
    orgId: z.string(),
    orgRole: z.enum(["owner", "admin", "member", "viewer"]),
    services: z.array(z.object({
      id: ServiceIdEnum,
      role: RoleEnum,
    })),
  }).optional(),
});

export const OrgServiceSchema = z.object({
  orgId: z.string(),
  serviceId: ServiceIdEnum,
  enabled: z.boolean(),
  config: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
});

export const OrgServiceUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});
