/**
 * F224: Context Passthrough Routes — 에이전트 간 컨텍스트 전달
 */

import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  ContextPassthroughCreateSchema,
  ContextPassthroughResponseSchema,
} from "../schemas/context-passthrough.js";
import { ContextPassthroughService } from "../services/context-passthrough.js";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";

export const contextPassthroughRoute = new OpenAPIHono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// Singleton service (memory-based, per-worker instance)
const service = new ContextPassthroughService();

// ─── POST /context-passthroughs ───

const createPassthroughRoute = createRoute({
  method: "post",
  path: "/context-passthroughs",
  request: {
    body: { content: { "application/json": { schema: ContextPassthroughCreateSchema } } },
  },
  responses: {
    201: {
      description: "Created context passthrough",
      content: { "application/json": { schema: ContextPassthroughResponseSchema } },
    },
    400: { description: "Invalid request" },
  },
  tags: ["Context Passthrough"],
});

contextPassthroughRoute.openapi(createPassthroughRoute, async (c) => {
  const body = c.req.valid("json");
  const orgId = c.get("orgId");
  const entry = service.create(orgId, body);
  return c.json(entry, 201);
});

// ─── GET /context-passthroughs ───

const listByTargetRoute = createRoute({
  method: "get",
  path: "/context-passthroughs",
  request: {
    query: z.object({ targetRole: z.string().min(1) }),
  },
  responses: {
    200: {
      description: "List passthroughs by target role",
      content: { "application/json": { schema: z.array(ContextPassthroughResponseSchema) } },
    },
  },
  tags: ["Context Passthrough"],
});

contextPassthroughRoute.openapi(listByTargetRoute, async (c) => {
  const { targetRole } = c.req.valid("query");
  const orgId = c.get("orgId");
  const list = service.listByTarget(orgId, targetRole);
  return c.json(list, 200);
});

// ─── GET /context-passthroughs/workflow/:executionId ───
// NOTE: Must be registered before /:id to avoid path collision

const listByWorkflowRoute = createRoute({
  method: "get",
  path: "/context-passthroughs/workflow/{executionId}",
  request: {
    params: z.object({ executionId: z.string() }),
  },
  responses: {
    200: {
      description: "List passthroughs by workflow execution",
      content: { "application/json": { schema: z.array(ContextPassthroughResponseSchema) } },
    },
  },
  tags: ["Context Passthrough"],
});

contextPassthroughRoute.openapi(listByWorkflowRoute, async (c) => {
  const { executionId } = c.req.valid("param");
  const list = service.listByWorkflow(executionId);
  return c.json(list, 200);
});

// ─── GET /context-passthroughs/:id ───

const getByIdRoute = createRoute({
  method: "get",
  path: "/context-passthroughs/{id}",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Get passthrough by id",
      content: { "application/json": { schema: ContextPassthroughResponseSchema } },
    },
    404: { description: "Not found" },
  },
  tags: ["Context Passthrough"],
});

contextPassthroughRoute.openapi(getByIdRoute, async (c) => {
  const { id } = c.req.valid("param");
  const entry = service.getById(id);
  if (!entry) return c.json({ error: "Not found" }, 404);
  return c.json(entry, 200);
});

// ─── PATCH /context-passthroughs/:id/deliver ───

const deliverRoute = createRoute({
  method: "patch",
  path: "/context-passthroughs/{id}/deliver",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Delivered passthrough",
      content: { "application/json": { schema: ContextPassthroughResponseSchema } },
    },
    404: { description: "Not found" },
  },
  tags: ["Context Passthrough"],
});

contextPassthroughRoute.openapi(deliverRoute, async (c) => {
  const { id } = c.req.valid("param");
  const entry = service.deliver(id);
  if (!entry) return c.json({ error: "Not found" }, 404);
  return c.json(entry, 200);
});

// ─── PATCH /context-passthroughs/:id/acknowledge ───

const acknowledgeRoute = createRoute({
  method: "patch",
  path: "/context-passthroughs/{id}/acknowledge",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Acknowledged passthrough",
      content: { "application/json": { schema: ContextPassthroughResponseSchema } },
    },
    404: { description: "Not found" },
  },
  tags: ["Context Passthrough"],
});

contextPassthroughRoute.openapi(acknowledgeRoute, async (c) => {
  const { id } = c.req.valid("param");
  const entry = service.acknowledge(id);
  if (!entry) return c.json({ error: "Not found" }, 404);
  return c.json(entry, 200);
});

// Export service for testing
export { service as contextPassthroughServiceInstance };
