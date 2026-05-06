import { describe, it, expect, vi } from "vitest";
import { IntegrityChecker } from "../../core/harness/services/integrity-checker.js";
import type { GitHubService } from "../../modules/portal/services/github.js";
import type { KVCacheService } from "../../core/infra/kv-cache.js";

function createMockGitHub(
  existingFiles: string[],
  fileContents: Record<string, string> = {},
): GitHubService {
  return {
    fileExists: vi.fn(async (path: string) => existingFiles.includes(path)),
    getFileContent: vi.fn(async (path: string) => {
      const content = fileContents[path];
      if (!content) throw new Error(`Not found: ${path}`);
      return { content, sha: "sha", size: content.length };
    }),
    getCommits: vi.fn(async () => []),
    createOrUpdateFile: vi.fn(),
  } as unknown as GitHubService;
}

function createPassthroughCache(): KVCacheService {
  return {
    get: vi.fn(async () => null),
    set: vi.fn(async () => {}),
    getOrFetch: vi.fn(
      async <T>(_key: string, fetcher: () => Promise<T>) => fetcher(),
    ),
    invalidate: vi.fn(async () => {}),
  } as unknown as KVCacheService;
}

describe("IntegrityChecker", () => {
  it("returns passing result when all required files exist", async () => {
    const github = createMockGitHub(
      [
        "CLAUDE.md",
        ".github/workflows/deploy.yml",
        "package.json",
        "tsconfig.json",
        "eslint.config.js",
      ],
      {
        "CLAUDE.md":
          "## Project Overview\nContent\n## Development Commands\nContent",
      },
    );
    const checker = new IntegrityChecker(github, createPassthroughCache());

    const result = await checker.check();
    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.checks.every((c) => c.level !== "FAIL")).toBe(true);
  });

  it("returns failing result when required files are missing", async () => {
    const github = createMockGitHub([], {});
    const checker = new IntegrityChecker(github, createPassthroughCache());

    const result = await checker.check();
    expect(result.passed).toBe(false);
    expect(result.checks.some((c) => c.level === "FAIL")).toBe(true);
  });

  it("warns when CLAUDE.md exists but missing required sections", async () => {
    const github = createMockGitHub(
      ["CLAUDE.md", ".github/workflows/deploy.yml", "package.json"],
      { "CLAUDE.md": "# Just a title\nNo required sections here" },
    );
    const checker = new IntegrityChecker(github, createPassthroughCache());

    const result = await checker.check();
    const sectionCheck = result.checks.find(
      (c) => c.name === "CLAUDE.md required sections",
    );
    expect(sectionCheck?.level).toBe("WARN");
    expect(sectionCheck?.passed).toBe(false);
  });
});
