import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { EntityRegistry } from "../services/entity-registry.js";
import {
  RegisterEntitySchema,
  SearchEntitiesSchema,
  LinkEntitiesSchema,
  EntityResponseSchema,
  EntityLinkResponseSchema,
  GraphResponseSchema,
} from "../schemas/entity.js";
import { ErrorSchema, validationHook } from "../../../schemas/common.js";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";

export const entitiesRoute = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>({
  defaultHook: validationHook as any,
});

function getRegistry(env: Env): EntityRegistry {
  return new EntityRegistry(env.DB);
}

// ─── GET /entities ───

const searchRoute = createRoute({
  method: "get",
  path: "/entities",
  tags: ["Entities"],
  summary: "Search cross-service entities",
  request: { query: SearchEntitiesSchema },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ items: z.array(EntityResponseSchema), total: z.number() }),
        },
      },
      description: "Entity search results",
    },
  },
});

entitiesRoute.openapi(searchRoute, async (c) => {
  const query = c.req.valid("query");
  const registry = getRegistry(c.env);
  const result = await registry.search(query);
  return c.json(result, 200);
});

// ─── POST /entities ───

const registerRoute = createRoute({
  method: "post",
  path: "/entities",
  tags: ["Entities"],
  summary: "Register an entity",
  request: { body: { content: { "application/json": { schema: RegisterEntitySchema } } } },
  responses: {
    201: {
      content: { "application/json": { schema: EntityResponseSchema } },
      description: "Entity registered",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
  },
});

entitiesRoute.openapi(registerRoute, async (c) => {
  const body = c.req.valid("json");
  const registry = getRegistry(c.env);
  const entity = await registry.register(body);
  return c.json(entity, 201);
});

// ─── GET /entities/:id/graph ───

const graphRoute = createRoute({
  method: "get",
  path: "/entities/{id}/graph",
  tags: ["Entities"],
  summary: "Get entity relationship graph",
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({ depth: z.coerce.number().int().min(1).max(5).default(2) }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: GraphResponseSchema } },
      description: "Relationship graph",
    },
  },
});

entitiesRoute.openapi(graphRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { depth } = c.req.valid("query");
  const registry = getRegistry(c.env);
  const graph = await registry.getGraph(id, depth);
  return c.json(graph, 200);
});

// ─── POST /entities/link ───

const linkRoute = createRoute({
  method: "post",
  path: "/entities/link",
  tags: ["Entities"],
  summary: "Create a link between entities",
  request: { body: { content: { "application/json": { schema: LinkEntitiesSchema } } } },
  responses: {
    201: {
      content: { "application/json": { schema: EntityLinkResponseSchema } },
      description: "Link created",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
  },
});

entitiesRoute.openapi(linkRoute, async (c) => {
  const body = c.req.valid("json");
  const registry = getRegistry(c.env);
  const link = await registry.link(body);
  return c.json(link, 201);
});

// ─── POST /entities/sync ───

const BulkSyncSchema = z
  .object({
    serviceId: z.enum(["foundry-x", "discovery-x", "ai-foundry"]),
    orgId: z.string().min(1),
    entities: z.array(
      z.object({
        externalId: z.string().min(1),
        title: z.string().min(1),
        status: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      }),
    ),
  })
  .openapi("BulkSyncRequest");

const syncRoute = createRoute({
  method: "post",
  path: "/entities/sync",
  tags: ["Entities"],
  summary: "Bulk sync entities from a service",
  request: { body: { content: { "application/json": { schema: BulkSyncSchema } } } },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ created: z.number(), updated: z.number() }),
        },
      },
      description: "Sync result",
    },
  },
});

entitiesRoute.openapi(syncRoute, async (c) => {
  const { serviceId, orgId, entities } = c.req.valid("json");
  const registry = getRegistry(c.env);
  const result = await registry.bulkSync(serviceId, entities, orgId);
  return c.json(result, 200);
});
