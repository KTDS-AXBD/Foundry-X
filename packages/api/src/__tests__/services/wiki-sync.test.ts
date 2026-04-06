import { describe, it, expect, vi, afterEach } from "vitest";
import { WikiSyncService } from "../../modules/portal/services/wiki-sync.js";
import { createMockD1 } from "../helpers/mock-d1.js";

function createMockGitHub() {
  return {
    getFileContent: vi.fn(),
    createOrUpdateFile: vi.fn().mockResolvedValue({ sha: "abc123", commit: { sha: "def456" } }),
    getCommits: vi.fn(),
    fileExists: vi.fn(),
  };
}

describe("WikiSyncService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pushToGit creates new file when it doesn't exist", async () => {
    const github = createMockGitHub();
    github.getFileContent.mockRejectedValue(new Error("Not found"));

    const db = createMockD1();
    const sync = new WikiSyncService(github as any, db as any);

    await sync.pushToGit("getting-started", "# Getting Started\n\nWelcome!", "admin");

    expect(github.createOrUpdateFile).toHaveBeenCalledWith(
      "docs/wiki/getting-started.md",
      "# Getting Started\n\nWelcome!",
      "docs(wiki): update getting-started by admin",
      undefined,
    );
  });

  it("pushToGit updates existing file with SHA", async () => {
    const github = createMockGitHub();
    github.getFileContent.mockResolvedValue({
      content: "old content",
      sha: "existing-sha-123",
      size: 11,
    });

    const db = createMockD1();
    const sync = new WikiSyncService(github as any, db as any);

    await sync.pushToGit("readme", "# Updated", "user1");

    expect(github.createOrUpdateFile).toHaveBeenCalledWith(
      "docs/wiki/readme.md",
      "# Updated",
      "docs(wiki): update readme by user1",
      "existing-sha-123",
    );
  });

  it("pullFromGit syncs wiki files from Git to D1", async () => {
    const github = createMockGitHub();
    github.getFileContent.mockResolvedValue({
      content: "# Architecture\n\nSystem design docs.",
      sha: "sha-456",
      size: 35,
    });

    const db = createMockD1();
    // Add unique index for ON CONFLICT
    await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_wiki_slug ON wiki_pages(slug)");

    const sync = new WikiSyncService(github as any, db as any);

    const result = await sync.pullFromGit([
      "docs/wiki/architecture.md",
      "docs/wiki/api-guide.md",
      "src/index.ts", // Should be filtered out
    ]);

    expect(result.synced).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(github.getFileContent).toHaveBeenCalledTimes(2);
    expect(github.getFileContent).toHaveBeenCalledWith("docs/wiki/architecture.md");
    expect(github.getFileContent).toHaveBeenCalledWith("docs/wiki/api-guide.md");
  });
});
