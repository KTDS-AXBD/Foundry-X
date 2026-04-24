import type { D1Database } from "@cloudflare/workers-types";
import type { GitHubService } from "./github.js";

export class WikiSyncService {
  constructor(
    private github: GitHubService,
    private db: D1Database,
  ) {}

  async pushToGit(slug: string, content: string, author: string): Promise<void> {
    const filePath = `docs/wiki/${slug}.md`;

    let sha: string | undefined;
    try {
      const existing = await this.github.getFileContent(filePath);
      sha = existing.sha;
    } catch {
      // File doesn't exist — will create new
    }

    await this.github.createOrUpdateFile(
      filePath,
      content,
      `docs(wiki): update ${slug} by ${author}`,
      sha,
    );
  }

  async pullFromGit(
    modifiedFiles: string[],
  ): Promise<{ synced: number; errors: string[] }> {
    const wikiFiles = modifiedFiles.filter(
      (f) => f.startsWith("docs/wiki/") && f.endsWith(".md"),
    );
    let synced = 0;
    const errors: string[] = [];

    for (const filePath of wikiFiles) {
      try {
        const slug = filePath.slice("docs/wiki/".length).replace(/\.md$/, "");
        if (!/^[\w-]+$/.test(slug)) {
          errors.push(`${filePath}: invalid slug "${slug}"`);
          continue;
        }
        const { content } = await this.github.getFileContent(filePath);
        const title = slug
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        await this.db
          .prepare(
            `INSERT INTO wiki_pages (id, project_id, slug, title, content, file_path, ownership_marker, updated_at)
             VALUES (?, 'proj_default', ?, ?, ?, ?, 'git', datetime('now'))
             ON CONFLICT(slug) DO UPDATE SET
               content = excluded.content,
               ownership_marker = 'git',
               updated_at = datetime('now')`,
          )
          .bind(crypto.randomUUID(), slug, title, content, filePath)
          .run();

        synced++;
      } catch (err) {
        errors.push(`${filePath}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }

    return { synced, errors };
  }
}
