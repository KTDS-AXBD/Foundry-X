import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock node:fs/promises before importing wiki route
vi.mock("node:fs/promises", () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock("../services/data-reader.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/data-reader.js")>();
  return {
    ...actual,
    getProjectRoot: () => "/mock/project",
    readTextFile: vi.fn(),
    writeTextFile: vi.fn(),
  };
});

import { readdir, stat, unlink } from "node:fs/promises";
import { readTextFile, writeTextFile } from "../services/data-reader.js";
import { wikiRoute } from "../routes/wiki.js";

function toSlug(filePath: string): string {
  return Buffer.from(filePath).toString("base64url");
}

describe("wiki routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── GET /wiki ───

  it("GET /wiki lists markdown files", async () => {
    vi.mocked(readdir).mockResolvedValue([
      { name: "guide.md", isDirectory: () => false, isFile: () => true },
      { name: "faq.md", isDirectory: () => false, isFile: () => true },
    ] as any);
    vi.mocked(stat).mockResolvedValue({
      mtime: new Date("2026-03-17T00:00:00Z"),
    } as any);

    const res = await wikiRoute.request("/wiki");
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
    expect(data[0]).toHaveProperty("slug");
    expect(data[0]).toHaveProperty("title");
    expect(data[0]).toHaveProperty("filePath");
  });

  it("GET /wiki returns empty array when docs/ missing", async () => {
    vi.mocked(readdir).mockRejectedValue(new Error("ENOENT"));

    const res = await wikiRoute.request("/wiki");
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data).toEqual([]);
  });

  // ─── GET /wiki/:slug ───

  it("GET /wiki/:slug reads single page", async () => {
    vi.mocked(readTextFile).mockResolvedValue("# Hello World\n\nContent here.");
    vi.mocked(stat).mockResolvedValue({
      mtime: new Date("2026-03-17T00:00:00Z"),
    } as any);

    const slug = toSlug("docs/guide.md");
    const res = await wikiRoute.request(`/wiki/${slug}`);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.content).toBe("# Hello World\n\nContent here.");
    expect(data.slug).toBe(slug);
  });

  it("GET /wiki/:slug returns 404 for missing page", async () => {
    vi.mocked(readTextFile).mockResolvedValue("");

    const slug = toSlug("docs/nonexistent.md");
    const res = await wikiRoute.request(`/wiki/${slug}`);
    expect(res.status).toBe(404);
  });

  // ─── PUT /wiki/:slug ───

  it("PUT /wiki/:slug updates page content", async () => {
    vi.mocked(writeTextFile).mockResolvedValue(undefined);

    const slug = toSlug("docs/guide.md");
    const res = await wikiRoute.request(`/wiki/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "# Updated\n\nNew content." }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.ok).toBe(true);
    expect(data.slug).toBe(slug);
  });

  // ─── POST /wiki ───

  it("POST /wiki creates a new page", async () => {
    vi.mocked(writeTextFile).mockResolvedValue(undefined);
    vi.mocked(stat).mockResolvedValue({
      mtime: new Date("2026-03-17T00:00:00Z"),
    } as any);

    const res = await wikiRoute.request("/wiki", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath: "docs/new-page.md", title: "New Page" }),
    });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.title).toBe("New Page");
    expect(data.filePath).toBe("docs/new-page.md");
  });

  it("POST /wiki rejects missing filePath", async () => {
    const res = await wikiRoute.request("/wiki", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "no path" }),
    });
    expect(res.status).toBe(400);
  });

  // ─── DELETE /wiki/:slug ───

  it("DELETE /wiki/:slug deletes page", async () => {
    vi.mocked(unlink).mockResolvedValue(undefined);

    const slug = toSlug("docs/old-page.md");
    const res = await wikiRoute.request(`/wiki/${slug}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.ok).toBe(true);
  });

  it("DELETE /wiki/:slug returns 404 for missing page", async () => {
    vi.mocked(unlink).mockRejectedValue(new Error("ENOENT"));

    const slug = toSlug("docs/nonexistent.md");
    const res = await wikiRoute.request(`/wiki/${slug}`, { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
