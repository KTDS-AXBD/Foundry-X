// F574 TDD Red: wiki-sync webhook 2종 버그 fix
// Bug A: wiki_pages.slug UNIQUE 제약 부재 → ON CONFLICT(slug) DO UPDATE reject
// Bug B: DEFAULT_PROJECT_ID = "default" vs 실측 FK "proj_default"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WikiSyncService } from "../modules/portal/services/wiki-sync.js";
import { createMockD1 } from "./helpers/mock-d1.js";

function createMockGitHub(content = "# Spec\n\nContent here.") {
  return {
    getFileContent: vi.fn().mockResolvedValue({ content, sha: "sha-abc", size: content.length }),
    createOrUpdateFile: vi.fn().mockResolvedValue({ sha: "sha-new", commit: { sha: "commit-abc" } }),
    getCommits: vi.fn(),
    fileExists: vi.fn(),
  };
}

describe("F574 — wiki-sync bug fix", () => {
  let db: ReturnType<typeof createMockD1>;

  beforeEach(async () => {
    db = createMockD1();
    await db.exec(
      `INSERT OR IGNORE INTO projects (id, name, repo_url, owner_id, created_at)
       VALUES ('proj_default', 'Default Project', 'https://github.com/test/repo', 'user_1', datetime('now'))`,
    );
    // Simulate F574 migration 0139: UNIQUE index on wiki_pages.slug
    await db.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_wiki_pages_slug ON wiki_pages(slug)",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("(A) pullFromGit: second push of same file upserts without error", async () => {
    const github = createMockGitHub("# Decode-X Spec\n\nInitial content.");
    const sync = new WikiSyncService(github as any, db as any);

    const firstResult = await sync.pullFromGit(["docs/wiki/decode-x-spec.md"]);
    expect(firstResult.synced).toBe(1);
    expect(firstResult.errors).toHaveLength(0);

    // Second push (webhook redelivery) must not error
    const secondResult = await sync.pullFromGit(["docs/wiki/decode-x-spec.md"]);
    expect(secondResult.synced).toBe(1);
    expect(secondResult.errors).toHaveLength(0);
  });

  it("(B) pullFromGit: project_id must be 'proj_default'", async () => {
    const github = createMockGitHub("# My Doc\n\nHello.");
    const sync = new WikiSyncService(github as any, db as any);

    const result = await sync.pullFromGit(["docs/wiki/my-doc.md"]);
    expect(result.synced).toBe(1);
    expect(result.errors).toHaveLength(0);

    const row = await db
      .prepare("SELECT project_id FROM wiki_pages WHERE slug = ?")
      .bind("my-doc")
      .first<{ project_id: string }>();
    expect(row?.project_id).toBe("proj_default");
  });

  it("(A+B combined) webhook redelivery: full C86 scenario — no duplicate rows", async () => {
    const github = createMockGitHub("# Decode-X Spec v2\n\nUpdated content.");
    const sync = new WikiSyncService(github as any, db as any);

    const r1 = await sync.pullFromGit(["docs/wiki/decode-x-spec.md"]);
    expect(r1.synced).toBe(1);

    const r2 = await sync.pullFromGit(["docs/wiki/decode-x-spec.md"]);
    expect(r2.synced).toBe(1);
    expect(r2.errors).toHaveLength(0);

    const countRow = await db
      .prepare("SELECT COUNT(*) as cnt FROM wiki_pages WHERE slug = ?")
      .bind("decode-x-spec")
      .first<{ cnt: number }>();
    expect(countRow?.cnt).toBe(1);
  });
});
