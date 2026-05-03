/**
 * F225: Command Registry Routes — 네임스페이스 기반 커맨드 등록/실행
 */

import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  CommandCreateSchema,
  CommandResponseSchema,
  CommandExecuteSchema,
  CommandResultSchema,
} from "../schemas/command-registry.js";
import { CommandRegistryService } from "../services/command-registry.js";
import type { Env } from "../../env.js";
import type { TenantVariables } from "../../middleware/tenant.js";

export const commandRegistryRoute = new OpenAPIHono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// Singleton service (memory-based, per-worker instance)
const service = new CommandRegistryService();

// ─── GET /command-registry/namespaces ───
// NOTE: Must be registered before /:id or /:namespace/:name to avoid collision

const listNamespacesRoute = createRoute({
  method: "get",
  path: "/command-registry/namespaces",
  responses: {
    200: {
      description: "List unique namespaces",
      content: { "application/json": { schema: z.array(z.string()) } },
    },
  },
  tags: ["Command Registry"],
});

commandRegistryRoute.openapi(listNamespacesRoute, async (c) => {
  const orgId = c.get("orgId");
  const namespaces = service.listNamespaces(orgId);
  return c.json(namespaces, 200);
});

// ─── POST /command-registry ───

const registerRoute = createRoute({
  method: "post",
  path: "/command-registry",
  request: {
    body: { content: { "application/json": { schema: CommandCreateSchema } } },
  },
  responses: {
    201: {
      description: "Registered command",
      content: { "application/json": { schema: CommandResponseSchema } },
    },
    400: { description: "Invalid request" },
  },
  tags: ["Command Registry"],
});

commandRegistryRoute.openapi(registerRoute, async (c) => {
  const body = c.req.valid("json");
  const orgId = c.get("orgId");
  const entry = service.register(orgId, body);
  return c.json(entry, 201);
});

// ─── GET /command-registry ───

const listRoute = createRoute({
  method: "get",
  path: "/command-registry",
  request: {
    query: z.object({ namespace: z.string().optional() }),
  },
  responses: {
    200: {
      description: "List commands",
      content: { "application/json": { schema: z.array(CommandResponseSchema) } },
    },
  },
  tags: ["Command Registry"],
});

commandRegistryRoute.openapi(listRoute, async (c) => {
  const { namespace } = c.req.valid("query");
  const orgId = c.get("orgId");
  const list = service.listByNamespace(orgId, namespace);
  return c.json(list, 200);
});

// ─── POST /command-registry/:namespace/:name/execute ───

const executeRoute = createRoute({
  method: "post",
  path: "/command-registry/{namespace}/{name}/execute",
  request: {
    params: z.object({ namespace: z.string(), name: z.string() }),
    body: { content: { "application/json": { schema: CommandExecuteSchema } } },
  },
  responses: {
    200: {
      description: "Command execution result",
      content: { "application/json": { schema: CommandResultSchema } },
    },
    404: { description: "Command not found" },
  },
  tags: ["Command Registry"],
});

commandRegistryRoute.openapi(executeRoute, async (c) => {
  const { namespace, name } = c.req.valid("param");
  const { args } = c.req.valid("json");
  const orgId = c.get("orgId");
  const result = service.execute(orgId, namespace, name, args);
  if (!result.success && result.error?.includes("not found")) {
    return c.json(result, 404);
  }
  return c.json(result, 200);
});

// ─── GET /command-registry/:namespace/:name ───

const getByNameRoute = createRoute({
  method: "get",
  path: "/command-registry/{namespace}/{name}",
  request: {
    params: z.object({ namespace: z.string(), name: z.string() }),
  },
  responses: {
    200: {
      description: "Get command by namespace and name",
      content: { "application/json": { schema: CommandResponseSchema } },
    },
    404: { description: "Not found" },
  },
  tags: ["Command Registry"],
});

commandRegistryRoute.openapi(getByNameRoute, async (c) => {
  const { namespace, name } = c.req.valid("param");
  const orgId = c.get("orgId");
  const entry = service.getByName(orgId, namespace, name);
  if (!entry) return c.json({ error: "Not found" }, 404);
  return c.json(entry, 200);
});

// ─── PUT /command-registry/:id ───

const updateRoute = createRoute({
  method: "put",
  path: "/command-registry/{id}",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: CommandCreateSchema.partial() } } },
  },
  responses: {
    200: {
      description: "Updated command",
      content: { "application/json": { schema: CommandResponseSchema } },
    },
    404: { description: "Not found" },
  },
  tags: ["Command Registry"],
});

commandRegistryRoute.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const entry = service.update(id, body);
  if (!entry) return c.json({ error: "Not found" }, 404);
  return c.json(entry, 200);
});

// ─── DELETE /command-registry/:id ───

const deleteRoute = createRoute({
  method: "delete",
  path: "/command-registry/{id}",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found" },
  },
  tags: ["Command Registry"],
});

commandRegistryRoute.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const deleted = service.remove(id);
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.body(null, 204);
});

// Export service for testing
export { service as commandRegistryServiceInstance };
