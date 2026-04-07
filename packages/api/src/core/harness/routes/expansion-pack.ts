import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  ExpansionPackCreateSchema,
  ExpansionPackResponseSchema,
  ExpansionPackUpdateSchema,
  PackInstallSchema,
  PackInstallationResponseSchema,
} from "../schemas/expansion-pack.js";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { ExpansionPackService } from "../services/expansion-pack.js";

export const expansionPackRoute = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>();

// ─── POST /api/expansion-packs ───

const createPack = createRoute({
  method: "post",
  path: "/expansion-packs",
  tags: ["Expansion Packs"],
  summary: "Create an expansion pack",
  request: {
    body: { content: { "application/json": { schema: ExpansionPackCreateSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ExpansionPackResponseSchema } },
      description: "Created expansion pack",
    },
  },
});

expansionPackRoute.openapi(createPack, async (c) => {
  const body = c.req.valid("json");
  const orgId = c.get("orgId") as string;
  const userId = c.get("userId") as string;
  const svc = new ExpansionPackService(c.env.DB);

  const pack = await svc.create(orgId, userId, body);
  return c.json(pack, 201);
});

// ─── GET /api/expansion-packs ───

const listPacks = createRoute({
  method: "get",
  path: "/expansion-packs",
  tags: ["Expansion Packs"],
  summary: "List expansion packs",
  request: {
    query: z.object({
      domain: z.enum(["security", "data", "devops", "testing", "custom"]).optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(ExpansionPackResponseSchema) } },
      description: "Expansion packs list",
    },
  },
});

expansionPackRoute.openapi(listPacks, async (c) => {
  const query = c.req.valid("query");
  const svc = new ExpansionPackService(c.env.DB);

  const packs = await svc.list(query);
  return c.json(packs);
});

// ─── GET /api/expansion-packs/installations ─── (before /:id)

const listInstallations = createRoute({
  method: "get",
  path: "/expansion-packs/installations",
  tags: ["Expansion Packs"],
  summary: "List installed packs for org",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(PackInstallationResponseSchema) } },
      description: "Installations list",
    },
  },
});

expansionPackRoute.openapi(listInstallations, async (c) => {
  const orgId = c.get("orgId") as string;
  const svc = new ExpansionPackService(c.env.DB);

  const installations = await svc.listInstallations(orgId);
  return c.json(installations);
});

// ─── GET /api/expansion-packs/:id ───

const getPack = createRoute({
  method: "get",
  path: "/expansion-packs/{id}",
  tags: ["Expansion Packs"],
  summary: "Get expansion pack by ID",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ExpansionPackResponseSchema } },
      description: "Pack detail",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Not found",
    },
  },
});

expansionPackRoute.openapi(getPack, async (c) => {
  const { id } = c.req.valid("param");
  const svc = new ExpansionPackService(c.env.DB);

  const pack = await svc.getById(id);
  if (!pack) return c.json({ error: "Pack not found" }, 404);
  return c.json(pack);
});

// ─── PUT /api/expansion-packs/:id ───

const updatePack = createRoute({
  method: "put",
  path: "/expansion-packs/{id}",
  tags: ["Expansion Packs"],
  summary: "Update an expansion pack",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: ExpansionPackUpdateSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ExpansionPackResponseSchema } },
      description: "Updated pack",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Not found",
    },
  },
});

expansionPackRoute.openapi(updatePack, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const svc = new ExpansionPackService(c.env.DB);

  const pack = await svc.update(id, body);
  if (!pack) return c.json({ error: "Pack not found" }, 404);
  return c.json(pack);
});

// ─── PATCH /api/expansion-packs/:id/publish ───

const publishPack = createRoute({
  method: "patch",
  path: "/expansion-packs/{id}/publish",
  tags: ["Expansion Packs"],
  summary: "Publish an expansion pack",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ExpansionPackResponseSchema } },
      description: "Published pack",
    },
    404: { description: "Pack not found" },
  },
});

expansionPackRoute.openapi(publishPack, async (c) => {
  const { id } = c.req.valid("param");
  const svc = new ExpansionPackService(c.env.DB);

  const pack = await svc.publish(id);
  if (!pack) return c.json({ error: "Pack not found" }, 404);
  return c.json(pack);
});

// ─── POST /api/expansion-packs/:id/install ───

const installPack = createRoute({
  method: "post",
  path: "/expansion-packs/{id}/install",
  tags: ["Expansion Packs"],
  summary: "Install an expansion pack",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: PackInstallSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: PackInstallationResponseSchema } },
      description: "Installation record",
    },
  },
});

expansionPackRoute.openapi(installPack, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const orgId = c.get("orgId") as string;
  const userId = c.get("userId") as string;
  const svc = new ExpansionPackService(c.env.DB);

  const installation = await svc.install(id, orgId, userId, body.config as Record<string, unknown> | undefined);
  return c.json(installation, 201);
});

// ─── DELETE /api/expansion-packs/installations/:installId ───

const uninstallPack = createRoute({
  method: "delete",
  path: "/expansion-packs/installations/{installId}",
  tags: ["Expansion Packs"],
  summary: "Uninstall an expansion pack",
  request: {
    params: z.object({ installId: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ success: z.boolean() }) } },
      description: "Uninstalled",
    },
  },
});

expansionPackRoute.openapi(uninstallPack, async (c) => {
  const { installId } = c.req.valid("param");
  const svc = new ExpansionPackService(c.env.DB);

  await svc.uninstall(installId);
  return c.json({ success: true });
});
