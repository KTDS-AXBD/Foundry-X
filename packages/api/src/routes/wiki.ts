import { Hono } from "hono";
import { readdir, stat, unlink, mkdir } from "node:fs/promises";
import { join, relative, dirname } from "node:path";
import type { WikiPage } from "@foundry-x/shared";
import {
  getProjectRoot,
  readTextFile,
  writeTextFile,
} from "../services/data-reader.js";
import { rbac } from "../middleware/rbac.js";

export const wikiRoute = new Hono();

function toSlug(filePath: string): string {
  return Buffer.from(filePath).toString("base64url");
}

function fromSlug(slug: string): string {
  return Buffer.from(slug, "base64url").toString("utf-8");
}

function titleFromPath(filePath: string): string {
  const name = filePath.split("/").pop() ?? filePath;
  return name.replace(/\.md$/, "").replace(/[-_]/g, " ");
}

async function scanMarkdown(dir: string, base: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await scanMarkdown(full, base)));
      } else if (entry.name.endsWith(".md")) {
        files.push(relative(base, full));
      }
    }
  } catch {
    // directory not found — return empty
  }
  return files;
}

// GET /wiki — list all .md files under docs/
wikiRoute.get("/wiki", async (c) => {
  const root = getProjectRoot();
  const docsDir = join(root, "docs");
  const mdFiles = await scanMarkdown(docsDir, root);

  const pages: WikiPage[] = await Promise.all(
    mdFiles.map(async (filePath) => {
      const fullPath = join(root, filePath);
      let lastModified = new Date().toISOString();
      try {
        const s = await stat(fullPath);
        lastModified = s.mtime.toISOString();
      } catch {
        // ignore
      }
      return {
        slug: toSlug(filePath),
        title: titleFromPath(filePath),
        content: "",
        filePath,
        lastModified,
        author: "system",
      };
    }),
  );

  return c.json(pages);
});

// GET /wiki/:slug — read single page
wikiRoute.get("/wiki/:slug", async (c) => {
  const slug = c.req.param("slug");
  const filePath = fromSlug(slug);
  const root = getProjectRoot();
  const fullPath = join(root, filePath);

  const content = await readTextFile(fullPath, "");
  if (!content) {
    return c.json({ error: "Page not found" }, 404);
  }

  let lastModified = new Date().toISOString();
  try {
    const s = await stat(fullPath);
    lastModified = s.mtime.toISOString();
  } catch {
    // ignore
  }

  const page: WikiPage = {
    slug,
    title: titleFromPath(filePath),
    content,
    filePath,
    lastModified,
    author: "system",
  };

  return c.json(page);
});

// PUT /wiki/:slug — update page content (member+)
wikiRoute.put("/wiki/:slug", rbac("member"), async (c) => {
  const slug = c.req.param("slug");
  const filePath = fromSlug(slug);
  const root = getProjectRoot();
  const fullPath = join(root, filePath);

  const body = await c.req.json<{ content: string }>();
  if (!body.content && body.content !== "") {
    return c.json({ error: "content field is required" }, 400);
  }

  try {
    await writeTextFile(fullPath, body.content);
  } catch {
    return c.json({ error: "Failed to write file" }, 500);
  }

  return c.json({ ok: true, slug, filePath });
});

// POST /wiki — create a new Wiki page (member+)
wikiRoute.post("/wiki", rbac("member"), async (c) => {
  const body = await c.req.json<{ filePath: string; content?: string; title?: string }>();
  if (!body.filePath) {
    return c.json({ error: "filePath field is required" }, 400);
  }

  const root = getProjectRoot();
  const fullPath = join(root, body.filePath);

  // Ensure directory exists
  try {
    await mkdir(dirname(fullPath), { recursive: true });
  } catch {
    // ignore if already exists
  }

  const content = body.content ?? `# ${body.title ?? titleFromPath(body.filePath)}\n\n`;

  try {
    await writeTextFile(fullPath, content);
  } catch {
    return c.json({ error: "Failed to create file" }, 500);
  }

  const slug = toSlug(body.filePath);
  let lastModified = new Date().toISOString();
  try {
    const s = await stat(fullPath);
    lastModified = s.mtime.toISOString();
  } catch {
    // ignore
  }

  const page: WikiPage = {
    slug,
    title: body.title ?? titleFromPath(body.filePath),
    content,
    filePath: body.filePath,
    lastModified,
    author: "system",
  };

  return c.json(page, 201);
});

// DELETE /wiki/:slug — delete a page (member+)
wikiRoute.delete("/wiki/:slug", rbac("member"), async (c) => {
  const slug = c.req.param("slug");
  const filePath = fromSlug(slug);
  const root = getProjectRoot();
  const fullPath = join(root, filePath);

  try {
    await unlink(fullPath);
  } catch {
    return c.json({ error: "Page not found or could not be deleted" }, 404);
  }

  return c.json({ ok: true, slug, filePath });
});
