import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { WorkflowEngine, WorkflowError, WORKFLOW_TEMPLATES } from "../services/workflow-engine.js";
import { workflowCreateSchema, workflowExecuteSchema, sprintTemplateResponseSchema } from "../schemas/workflow.js";
import { ErrorSchema, validationHook } from "../schemas/common.js";
import type { AgentEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import type { JwtPayload } from "../middleware/auth.js";

export const workflowRoute = new OpenAPIHono<{ Bindings: AgentEnv; Variables: TenantVariables }>({
  defaultHook: validationHook as any,
});

const OrgIdParam = z.object({ orgId: z.string() }).openapi("WorkflowOrgParams");
const WorkflowIdParam = z.object({ orgId: z.string(), id: z.string() }).openapi("WorkflowIdParams");

function getEngine(env: AgentEnv): WorkflowEngine {
  return new WorkflowEngine(env.DB);
}

function getPayload(c: any): JwtPayload {
  return c.get("jwtPayload") as JwtPayload;
}

// ─── GET /orgs/:orgId/workflows ───

const listRoute = createRoute({
  method: "get",
  path: "/orgs/{orgId}/workflows",
  tags: ["Workflows"],
  summary: "List workflows",
  request: { params: OrgIdParam },
  responses: {
    200: { content: { "application/json": { schema: z.object({ workflows: z.array(z.any()), templates: z.array(z.any()) }) } }, description: "Workflow list" },
  },
});

workflowRoute.openapi(listRoute, async (c) => {
  const { orgId } = c.req.valid("param");
  const workflows = await getEngine(c.env).list(orgId);
  // Parse definitions for response
  const parsed = workflows.map((w) => ({
    ...w,
    definition: JSON.parse(w.definition),
    enabled: w.enabled,
  }));
  return c.json({ workflows: parsed, templates: WORKFLOW_TEMPLATES }, 200);
});

// ─── POST /orgs/:orgId/workflows ───

const createWorkflowRoute = createRoute({
  method: "post",
  path: "/orgs/{orgId}/workflows",
  tags: ["Workflows"],
  summary: "Create workflow (admin+)",
  request: {
    params: OrgIdParam,
    body: { content: { "application/json": { schema: workflowCreateSchema } } },
  },
  responses: {
    201: { content: { "application/json": { schema: z.any() } }, description: "Created" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
  },
});

workflowRoute.openapi(createWorkflowRoute, async (c) => {
  const orgRole = c.get("orgRole") as string;
  if (!orgRole || (orgRole !== "owner" && orgRole !== "admin")) {
    return c.json({ error: "Requires admin role or higher" }, 403);
  }

  const { orgId } = c.req.valid("param");
  const payload = getPayload(c);
  const input = c.req.valid("json");
  const workflow = await getEngine(c.env).create(orgId, payload.sub, input);
  return c.json({ ...workflow, definition: JSON.parse(workflow.definition), enabled: workflow.enabled }, 201);
});

// ─── GET /orgs/:orgId/workflows/sprint-templates ───

const sprintTemplatesRoute = createRoute({
  method: "get",
  path: "/orgs/{orgId}/workflows/sprint-templates",
  tags: ["Workflows"],
  summary: "List sprint workflow templates",
  request: { params: OrgIdParam },
  responses: {
    200: { content: { "application/json": { schema: z.object({ templates: z.array(sprintTemplateResponseSchema) }) } }, description: "Sprint templates" },
  },
});

workflowRoute.openapi(sprintTemplatesRoute, async (c) => {
  const templates = getEngine(c.env).getSprintTemplates();
  return c.json({ templates }, 200);
});

// ─── GET /orgs/:orgId/workflows/:id ───

const getWorkflowRoute = createRoute({
  method: "get",
  path: "/orgs/{orgId}/workflows/{id}",
  tags: ["Workflows"],
  summary: "Get workflow details",
  request: { params: WorkflowIdParam },
  responses: {
    200: { content: { "application/json": { schema: z.any() } }, description: "Workflow detail" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
  },
});

workflowRoute.openapi(getWorkflowRoute, async (c) => {
  const { orgId, id } = c.req.valid("param");
  const workflow = await getEngine(c.env).get(orgId, id);
  if (!workflow) return c.json({ error: "Workflow not found" }, 404);
  return c.json({ ...workflow, definition: JSON.parse(workflow.definition), enabled: workflow.enabled }, 200);
});

// ─── PUT /orgs/:orgId/workflows/:id ───

const updateWorkflowRoute = createRoute({
  method: "put",
  path: "/orgs/{orgId}/workflows/{id}",
  tags: ["Workflows"],
  summary: "Update workflow (admin+)",
  request: {
    params: WorkflowIdParam,
    body: { content: { "application/json": { schema: workflowCreateSchema.partial() } } },
  },
  responses: {
    200: { content: { "application/json": { schema: z.any() } }, description: "Updated" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
  },
});

workflowRoute.openapi(updateWorkflowRoute, async (c) => {
  const orgRole = c.get("orgRole") as string;
  if (!orgRole || (orgRole !== "owner" && orgRole !== "admin")) {
    return c.json({ error: "Requires admin role or higher" }, 403);
  }

  const { orgId, id } = c.req.valid("param");
  const patch = c.req.valid("json");
  const workflow = await getEngine(c.env).update(orgId, id, patch);
  if (!workflow) return c.json({ error: "Workflow not found" }, 404);
  return c.json({ ...workflow, definition: JSON.parse(workflow.definition), enabled: workflow.enabled }, 200);
});

// ─── DELETE /orgs/:orgId/workflows/:id ───

const deleteWorkflowRoute = createRoute({
  method: "delete",
  path: "/orgs/{orgId}/workflows/{id}",
  tags: ["Workflows"],
  summary: "Delete workflow (admin+)",
  request: { params: WorkflowIdParam },
  responses: {
    200: { content: { "application/json": { schema: z.object({ ok: z.boolean() }) } }, description: "Deleted" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
  },
});

workflowRoute.openapi(deleteWorkflowRoute, async (c) => {
  const orgRole = c.get("orgRole") as string;
  if (!orgRole || (orgRole !== "owner" && orgRole !== "admin")) {
    return c.json({ error: "Requires admin role or higher" }, 403);
  }

  const { orgId, id } = c.req.valid("param");
  const deleted = await getEngine(c.env).delete(orgId, id);
  if (!deleted) return c.json({ error: "Workflow not found" }, 404);
  return c.json({ ok: true }, 200);
});

// ─── POST /orgs/:orgId/workflows/:id/execute ───

const executeRoute = createRoute({
  method: "post",
  path: "/orgs/{orgId}/workflows/{id}/execute",
  tags: ["Workflows"],
  summary: "Execute workflow (admin+)",
  request: {
    params: WorkflowIdParam,
    body: { content: { "application/json": { schema: workflowExecuteSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: z.any() } }, description: "Execution result" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
  },
});

workflowRoute.openapi(executeRoute, async (c) => {
  const orgRole = c.get("orgRole") as string;
  if (!orgRole || (orgRole !== "owner" && orgRole !== "admin")) {
    return c.json({ error: "Requires admin role or higher" }, 403);
  }

  const { orgId, id } = c.req.valid("param");
  const { context } = c.req.valid("json");
  try {
    const execution = await getEngine(c.env).execute(orgId, id, context);
    return c.json(execution, 200);
  } catch (e) {
    if (e instanceof WorkflowError) return c.json({ error: e.message }, e.status as any);
    throw e;
  }
});
