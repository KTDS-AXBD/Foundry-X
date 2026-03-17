import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { wikiPages } from "../db/schema.js";
import type { Env } from "../env.js";
import { rbac } from "../middleware/rbac.js";
import {
  WikiPageSchema,
  WikiCreateSchema,
  WikiUpdateSchema,
  WikiSlugParamSchema,
  WikiActionResponseSchema,
} from "../schemas/wiki.js";
import { ErrorSchema, validationHook } from "../schemas/common.js";
import { WikiSyncService } from "../services/wiki-sync.js";
import { GitHubService } from "../services/github.js";

const DEFAULT_PROJECT_ID = "default";

export const wikiRoute = new OpenAPIHono<{ Bindings: Env }>({
  defaultHook: validationHook as any,
});

function toSlug(filePath: string): string {
  return Buffer.from(filePath).toString("base64url");
}

function titleFromPath(filePath: string): string {
  const name = filePath.split("/").pop() ?? filePath;
  return name.replace(/\.md$/, "").replace(/[-_]/g, " ");
}

// ─── RBAC middleware for write operations ───

wikiRoute.post("/wiki", rbac("member"));
wikiRoute.put("/wiki/:slug", rbac("member"));
wikiRoute.delete("/wiki/:slug", rbac("member"));

// ─── GET /wiki ───

const listWiki = createRoute({
  method: "get",
  path: "/wiki",
  tags: ["Wiki"],
  summary: "List all wiki pages",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(WikiPageSchema) } },
      description: "List of wiki pages (content field is empty for list)",
    },
  },
});

wikiRoute.openapi(listWiki, async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db.select().from(wikiPages);

  return c.json(
    rows.map((p) => ({
      slug: p.slug,
      title: p.title,
      content: "",
      filePath: p.filePath ?? "",
      lastModified: p.updatedAt,
      author: p.updatedBy ?? "system",
    })),
  );
});

// ─── GET /wiki/:slug ───

const getWikiPage = createRoute({
  method: "get",
  path: "/wiki/{slug}",
  tags: ["Wiki"],
  summary: "Get wiki page by slug",
  request: {
    params: WikiSlugParamSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: WikiPageSchema } },
      description: "Wiki page with full content",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Page not found",
    },
  },
});

wikiRoute.openapi(getWikiPage, async (c) => {
  const { slug } = c.req.valid("param");
  const db = getDb(c.env.DB);

  const [page] = await db
    .select()
    .from(wikiPages)
    .where(eq(wikiPages.slug, slug));

  if (!page) {
    return c.json({ error: "Page not found" }, 404);
  }

  return c.json({
    slug: page.slug,
    title: page.title,
    content: page.content,
    filePath: page.filePath ?? "",
    lastModified: page.updatedAt,
    author: page.updatedBy ?? "system",
  });
});

// ─── PUT /wiki/:slug ───

const updateWikiPage = createRoute({
  method: "put",
  path: "/wiki/{slug}",
  tags: ["Wiki"],
  summary: "Update wiki page content",
  request: {
    params: WikiSlugParamSchema,
    body: {
      content: { "application/json": { schema: WikiUpdateSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: WikiActionResponseSchema } },
      description: "Page updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Page not found",
    },
  },
});

wikiRoute.openapi(updateWikiPage, async (c) => {
  const { slug } = c.req.valid("param");
  const { content } = c.req.valid("json");
  const db = getDb(c.env.DB);

  const [existing] = await db
    .select({ id: wikiPages.id, filePath: wikiPages.filePath })
    .from(wikiPages)
    .where(eq(wikiPages.slug, slug));

  if (!existing) {
    return c.json({ error: "Page not found" }, 404);
  }

  await db
    .update(wikiPages)
    .set({ content, updatedAt: new Date().toISOString() })
    .where(eq(wikiPages.slug, slug));

  // Async Git sync (non-blocking)
  if (c.env.GITHUB_TOKEN && c.env.GITHUB_REPO) {
    c.executionCtx.waitUntil(
      (async () => {
        try {
          const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
          const sync = new WikiSyncService(github, c.env.DB);
          await sync.pushToGit(slug, content, "api");
        } catch (err) {
          console.error("Wiki->Git sync failed:", err);
        }
      })(),
    );
  }

  return c.json({ ok: true as const, slug, filePath: existing.filePath ?? "" });
});

// ─── POST /wiki ───

const createWikiPage = createRoute({
  method: "post",
  path: "/wiki",
  tags: ["Wiki"],
  summary: "Create a new wiki page",
  request: {
    body: {
      content: { "application/json": { schema: WikiCreateSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: WikiPageSchema } },
      description: "Page created",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Write failed",
    },
  },
});

wikiRoute.openapi(createWikiPage, async (c) => {
  const body = c.req.valid("json");
  const db = getDb(c.env.DB);

  const slug = toSlug(body.filePath);
  const title = body.title ?? titleFromPath(body.filePath);
  const content = body.content ?? `# ${title}\n\n`;
  const now = new Date().toISOString();

  await db.insert(wikiPages).values({
    id: crypto.randomUUID(),
    projectId: DEFAULT_PROJECT_ID,
    slug,
    title,
    content,
    filePath: body.filePath,
    ownershipMarker: "human",
    updatedAt: now,
  });

  return c.json(
    {
      slug,
      title,
      content,
      filePath: body.filePath,
      lastModified: now,
      author: "system",
    },
    201,
  );
});

// ─── DELETE /wiki/:slug ───

const deleteWikiPage = createRoute({
  method: "delete",
  path: "/wiki/{slug}",
  tags: ["Wiki"],
  summary: "Delete a wiki page",
  request: {
    params: WikiSlugParamSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: WikiActionResponseSchema } },
      description: "Page deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Page not found",
    },
  },
});

wikiRoute.openapi(deleteWikiPage, async (c) => {
  const { slug } = c.req.valid("param");
  const db = getDb(c.env.DB);

  const [existing] = await db
    .select({ id: wikiPages.id, filePath: wikiPages.filePath })
    .from(wikiPages)
    .where(eq(wikiPages.slug, slug));

  if (!existing) {
    return c.json({ error: "Page not found or could not be deleted" }, 404);
  }

  await db.delete(wikiPages).where(eq(wikiPages.slug, slug));

  return c.json({ ok: true as const, slug, filePath: existing.filePath ?? "" });
});
