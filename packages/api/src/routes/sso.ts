import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { verify } from "hono/jwt";
import { SsoService } from "../services/sso.js";
import type { JwtPayload } from "../middleware/auth.js";
import {
  HubTokenRequestSchema,
  HubTokenResponseSchema,
  VerifyRequestSchema,
  VerifyResponseSchema,
  OrgServiceSchema,
  OrgServiceUpdateSchema,
} from "../schemas/sso.js";
import { ErrorSchema, validationHook } from "../schemas/common.js";
import type { Env } from "../env.js";

export const ssoRoute = new OpenAPIHono<{ Bindings: Env }>({
  defaultHook: validationHook as any,
});

const ssoService = new SsoService();

// ─── POST /auth/sso/token ─── Hub Token 발급 (인증 필요)

const issueHubToken = createRoute({
  method: "post",
  path: "/auth/sso/token",
  tags: ["SSO"],
  summary: "Issue Hub Token for cross-service SSO",
  request: {
    body: {
      content: { "application/json": { schema: HubTokenRequestSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: HubTokenResponseSchema } },
      description: "Hub Token issued",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Unauthorized",
    },
  },
});

ssoRoute.openapi(issueHubToken, async (c) => {
  const { orgId } = c.req.valid("json");

  // Manual JWT verification (this path is under /api/auth/ which skips authMiddleware)
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  let jwtPayload: JwtPayload;
  try {
    const secret = c.env.JWT_SECRET ?? "dev-secret";
    jwtPayload = await verify(authHeader.slice(7), secret, "HS256") as unknown as JwtPayload;
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const result = await ssoService.createHubToken(
    jwtPayload.sub,
    jwtPayload.email,
    jwtPayload.role,
    orgId,
    jwtPayload.orgRole ?? "member",
    c.env.DB,
    c.env.JWT_SECRET,
  );

  return c.json(result, 200);
});

// ─── POST /auth/sso/verify ─── Hub Token 검증 (public)

const verifyHubToken = createRoute({
  method: "post",
  path: "/auth/sso/verify",
  tags: ["SSO"],
  summary: "Verify Hub Token",
  request: {
    body: {
      content: { "application/json": { schema: VerifyRequestSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: VerifyResponseSchema } },
      description: "Token verification result",
    },
  },
});

ssoRoute.openapi(verifyHubToken, async (c) => {
  const { token } = c.req.valid("json");
  const result = await ssoService.verifyHubToken(token, c.env.JWT_SECRET);
  return c.json(result, 200);
});

// ─── GET /orgs/:orgId/services ─── Org 서비스 목록

const listOrgServices = createRoute({
  method: "get",
  path: "/orgs/{orgId}/services",
  tags: ["SSO"],
  summary: "List organization services",
  request: {
    params: z.object({ orgId: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ services: z.array(OrgServiceSchema) }) } },
      description: "Service list",
    },
  },
});

ssoRoute.openapi(listOrgServices, async (c) => {
  const { orgId } = c.req.valid("param");
  const services = await ssoService.getOrgServices(orgId, c.env.DB);
  return c.json({ services }, 200);
});

// ─── PUT /orgs/:orgId/services/:serviceId ─── 서비스 활성화/비활성화

const updateOrgService = createRoute({
  method: "put",
  path: "/orgs/{orgId}/services/{serviceId}",
  tags: ["SSO"],
  summary: "Enable/disable organization service",
  request: {
    params: z.object({
      orgId: z.string(),
      serviceId: z.enum(["foundry-x", "discovery-x", "ai-foundry"]),
    }),
    body: {
      content: { "application/json": { schema: OrgServiceUpdateSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: OrgServiceSchema } },
      description: "Service updated",
    },
  },
});

ssoRoute.openapi(updateOrgService, async (c) => {
  const { orgId, serviceId } = c.req.valid("param");
  const { enabled, config } = c.req.valid("json");
  const result = await ssoService.updateOrgService(orgId, serviceId, enabled, config, c.env.DB);
  return c.json(result, 200);
});
