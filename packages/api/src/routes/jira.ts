import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { JiraAdapter, JiraApiError } from "../services/jira-adapter.js";
import { JiraSyncService } from "../services/jira-sync.js";
import { jiraConfigSchema, jiraProjectSchema } from "../schemas/jira.js";
import { ErrorSchema, validationHook } from "../schemas/common.js";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";

export const jiraRoute = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>({
  defaultHook: validationHook as any,
});

const OrgIdParam = z.object({ orgId: z.string() }).openapi("JiraOrgParams");

async function getJiraConfig(db: D1Database, orgId: string): Promise<{ api_url: string; email: string; api_token: string; project_key?: string } | null> {
  const org = await db.prepare("SELECT settings FROM organizations WHERE id = ?").bind(orgId).first<{ settings: string }>();
  if (!org) return null;
  const settings = JSON.parse(org.settings || "{}");
  return settings.jira ?? null;
}

function createAdapter(config: { api_url: string; email: string; api_token: string }): JiraAdapter {
  return new JiraAdapter(config.api_url, config.email, config.api_token);
}

// ─── GET /orgs/:orgId/jira/projects ───

const listProjectsRoute = createRoute({
  method: "get",
  path: "/orgs/{orgId}/jira/projects",
  tags: ["Jira"],
  summary: "List Jira projects",
  request: { params: OrgIdParam },
  responses: {
    200: { content: { "application/json": { schema: z.object({ projects: z.array(jiraProjectSchema) }) } }, description: "Project list" },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not configured" },
  },
});

jiraRoute.openapi(listProjectsRoute, async (c) => {
  const { orgId } = c.req.valid("param");
  const config = await getJiraConfig(c.env.DB, orgId);
  if (!config) return c.json({ error: "Jira not configured" }, 400);

  try {
    const adapter = createAdapter(config);
    const projects = await adapter.getProjects();
    return c.json({ projects }, 200);
  } catch (e) {
    if (e instanceof JiraApiError) return c.json({ error: e.message }, e.status as any);
    throw e;
  }
});

// ─── PUT /orgs/:orgId/jira/config ───

const upsertConfigRoute = createRoute({
  method: "put",
  path: "/orgs/{orgId}/jira/config",
  tags: ["Jira"],
  summary: "Configure Jira connection (admin+)",
  request: {
    params: OrgIdParam,
    body: { content: { "application/json": { schema: jiraConfigSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: z.object({ ok: z.boolean() }) } }, description: "Configured" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
  },
});

jiraRoute.openapi(upsertConfigRoute, async (c) => {
  const orgRole = c.get("orgRole") as string;
  if (!orgRole || (orgRole !== "owner" && orgRole !== "admin")) {
    return c.json({ error: "Requires admin role or higher" }, 403);
  }

  const { orgId } = c.req.valid("param");
  const jiraConfig = c.req.valid("json");

  // Merge into org settings
  const org = await c.env.DB.prepare("SELECT settings FROM organizations WHERE id = ?").bind(orgId).first<{ settings: string }>();
  const settings = JSON.parse(org?.settings || "{}");
  settings.jira = jiraConfig;

  await c.env.DB
    .prepare("UPDATE organizations SET settings = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(JSON.stringify(settings), orgId)
    .run();

  return c.json({ ok: true }, 200);
});

// ─── POST /orgs/:orgId/jira/sync ───

const syncRoute = createRoute({
  method: "post",
  path: "/orgs/{orgId}/jira/sync",
  tags: ["Jira"],
  summary: "Trigger Jira sync (admin+)",
  request: { params: OrgIdParam },
  responses: {
    200: { content: { "application/json": { schema: z.any() } }, description: "Sync result" },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not configured" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
  },
});

jiraRoute.openapi(syncRoute, async (c) => {
  const orgRole = c.get("orgRole") as string;
  if (!orgRole || (orgRole !== "owner" && orgRole !== "admin")) {
    return c.json({ error: "Requires admin role or higher" }, 403);
  }

  const { orgId } = c.req.valid("param");
  const config = await getJiraConfig(c.env.DB, orgId);
  if (!config) return c.json({ error: "Jira not configured" }, 400);

  const adapter = createAdapter(config);
  const syncService = new JiraSyncService(adapter, c.env.DB, orgId);
  const result = await syncService.fullSync();
  return c.json(result, 200);
});
