import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { ProjectOverviewService } from "../services/project-overview.js";
import { ErrorSchema, validationHook } from "../schemas/common.js";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";

export const projectOverviewRoute = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>({
  defaultHook: validationHook as any,
});

const OrgIdParam = z.object({ orgId: z.string() }).openapi("ProjectOverviewOrgParams");

function getService(env: Env): ProjectOverviewService {
  return new ProjectOverviewService(env.DB);
}

// ─── GET /orgs/:orgId/projects/overview ───

const getOverviewRoute = createRoute({
  method: "get",
  path: "/orgs/{orgId}/projects/overview",
  tags: ["Projects"],
  summary: "Cross-project health overview",
  request: { params: OrgIdParam },
  responses: {
    200: { content: { "application/json": { schema: z.any() } }, description: "Overview" },
  },
});

projectOverviewRoute.openapi(getOverviewRoute, async (c) => {
  const { orgId } = c.req.valid("param");
  const overview = await getService(c.env).getOverview(orgId);
  return c.json(overview, 200);
});

// ─── GET /orgs/:orgId/projects/health ───

const getHealthRoute = createRoute({
  method: "get",
  path: "/orgs/{orgId}/projects/health",
  tags: ["Projects"],
  summary: "Per-project SDD Triangle scores",
  request: { params: OrgIdParam },
  responses: {
    200: { content: { "application/json": { schema: z.any() } }, description: "Health scores" },
  },
});

projectOverviewRoute.openapi(getHealthRoute, async (c) => {
  const { orgId } = c.req.valid("param");
  const health = await getService(c.env).getHealth(orgId);
  return c.json(health, 200);
});

// ─── GET /orgs/:orgId/projects/activity ───

const getActivityRoute = createRoute({
  method: "get",
  path: "/orgs/{orgId}/projects/activity",
  tags: ["Projects"],
  summary: "Recent agent activity summary",
  request: { params: OrgIdParam },
  responses: {
    200: { content: { "application/json": { schema: z.any() } }, description: "Activity" },
  },
});

projectOverviewRoute.openapi(getActivityRoute, async (c) => {
  const { orgId } = c.req.valid("param");
  const activity = await getService(c.env).getActivity(orgId);
  return c.json(activity, 200);
});
