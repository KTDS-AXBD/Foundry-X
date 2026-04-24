import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  OrgSharedBmcsResponseSchema,
  OrgActivityFeedResponseSchema,
} from "../schemas/org-shared.js";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { OrgSharedService } from "../services/org-shared-service.js";
import { ErrorSchema } from "../../../schemas/common.js";

export const orgSharedRoute = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>();

// ─── GET /orgs/:orgId/shared/bmcs ───

const getSharedBmcs = createRoute({
  method: "get",
  path: "/orgs/{orgId}/shared/bmcs",
  tags: ["Org"],
  summary: "팀 전체 BMC 목록 (Org-scope)",
  request: {
    params: z.object({ orgId: z.string() }),
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: OrgSharedBmcsResponseSchema } },
      description: "팀 BMC 목록",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "권한 없음",
    },
  },
});

orgSharedRoute.openapi(getSharedBmcs, async (c) => {
  const orgId = c.get("orgId");
  const { page, limit } = c.req.valid("query");
  const service = new OrgSharedService(c.env.DB);

  const result = await service.getSharedBmcs(orgId, { page, limit });
  return c.json(result);
});

// ─── GET /orgs/:orgId/shared/activity ───

const getActivityFeed = createRoute({
  method: "get",
  path: "/orgs/{orgId}/shared/activity",
  tags: ["Org"],
  summary: "팀 활동 피드",
  request: {
    params: z.object({ orgId: z.string() }),
    query: z.object({
      limit: z.coerce.number().int().min(1).max(50).default(20),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: OrgActivityFeedResponseSchema } },
      description: "팀 활동 피드",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "권한 없음",
    },
  },
});

orgSharedRoute.openapi(getActivityFeed, async (c) => {
  const orgId = c.get("orgId");
  const { limit } = c.req.valid("query");
  const service = new OrgSharedService(c.env.DB);

  const items = await service.getActivityFeed(orgId, limit);
  return c.json({ items });
});
