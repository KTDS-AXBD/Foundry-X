import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  SpecLibraryCreateSchema,
  SpecLibraryResponseSchema,
  SpecLibraryUpdateSchema,
  SpecLibraryQuerySchema,
} from "../schemas/spec-library.js";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { SpecLibraryService } from "../services/spec-library.js";

export const specLibraryRoute = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>();

// ─── POST /api/spec-library ───

const createSpec = createRoute({
  method: "post",
  path: "/spec-library",
  tags: ["Spec Library"],
  summary: "Create a spec",
  request: {
    body: { content: { "application/json": { schema: SpecLibraryCreateSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SpecLibraryResponseSchema } },
      description: "Created spec",
    },
  },
});

specLibraryRoute.openapi(createSpec, async (c) => {
  const body = c.req.valid("json");
  const orgId = c.get("orgId") as string;
  const userId = c.get("userId") as string;
  const svc = new SpecLibraryService(c.env.DB);

  const spec = await svc.create(orgId, userId, body);
  return c.json(spec, 201);
});

// ─── GET /api/spec-library ───

const listSpecs = createRoute({
  method: "get",
  path: "/spec-library",
  tags: ["Spec Library"],
  summary: "List specs",
  request: {
    query: SpecLibraryQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(SpecLibraryResponseSchema) } },
      description: "Specs list",
    },
  },
});

specLibraryRoute.openapi(listSpecs, async (c) => {
  const orgId = c.get("orgId") as string;
  const query = c.req.valid("query");
  const svc = new SpecLibraryService(c.env.DB);

  const specs = await svc.list(orgId, query);
  return c.json(specs);
});

// ─── GET /api/spec-library/search ─── (before /:id)

const searchSpecs = createRoute({
  method: "get",
  path: "/spec-library/search",
  tags: ["Spec Library"],
  summary: "Search specs",
  request: {
    query: z.object({ q: z.string().min(1) }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(SpecLibraryResponseSchema) } },
      description: "Search results",
    },
  },
});

specLibraryRoute.openapi(searchSpecs, async (c) => {
  const orgId = c.get("orgId") as string;
  const { q } = c.req.valid("query");
  const svc = new SpecLibraryService(c.env.DB);

  const results = await svc.search(orgId, q);
  return c.json(results);
});

// ─── GET /api/spec-library/categories ─── (before /:id)

const listCategories = createRoute({
  method: "get",
  path: "/spec-library/categories",
  tags: ["Spec Library"],
  summary: "List spec categories",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.string()) } },
      description: "Categories list",
    },
  },
});

specLibraryRoute.openapi(listCategories, async (c) => {
  const orgId = c.get("orgId") as string;
  const svc = new SpecLibraryService(c.env.DB);

  const categories = await svc.listCategories(orgId);
  return c.json(categories);
});

// ─── GET /api/spec-library/:id ───

const getSpec = createRoute({
  method: "get",
  path: "/spec-library/{id}",
  tags: ["Spec Library"],
  summary: "Get spec by ID",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: SpecLibraryResponseSchema } },
      description: "Spec detail",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Not found",
    },
  },
});

specLibraryRoute.openapi(getSpec, async (c) => {
  const { id } = c.req.valid("param");
  const svc = new SpecLibraryService(c.env.DB);

  const spec = await svc.getById(id);
  if (!spec) return c.json({ error: "Spec not found" }, 404);
  return c.json(spec);
});

// ─── PUT /api/spec-library/:id ───

const updateSpec = createRoute({
  method: "put",
  path: "/spec-library/{id}",
  tags: ["Spec Library"],
  summary: "Update a spec",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: SpecLibraryUpdateSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SpecLibraryResponseSchema } },
      description: "Updated spec",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Not found",
    },
  },
});

specLibraryRoute.openapi(updateSpec, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const svc = new SpecLibraryService(c.env.DB);

  const spec = await svc.update(id, body);
  if (!spec) return c.json({ error: "Spec not found" }, 404);
  return c.json(spec);
});

// ─── DELETE /api/spec-library/:id ───

const deleteSpec = createRoute({
  method: "delete",
  path: "/spec-library/{id}",
  tags: ["Spec Library"],
  summary: "Delete a spec",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ success: z.boolean() }) } },
      description: "Deleted",
    },
  },
});

specLibraryRoute.openapi(deleteSpec, async (c) => {
  const { id } = c.req.valid("param");
  const svc = new SpecLibraryService(c.env.DB);

  await svc.remove(id);
  return c.json({ success: true });
});
