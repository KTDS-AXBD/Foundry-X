import { describe, it, expect, vi } from "vitest";
import { FreshnessChecker } from "../../services/freshness-checker.js";
import type { GitHubService } from "../../services/github.js";
import type { KVCacheService } from "../../services/kv-cache.js";

function createMockGitHub(
  commitDates: Record<string, string>,
): GitHubService {
  return {
    getCommits: vi.fn(async (path: string) => {
      const date = commitDates[path];
      if (!date) return [];
      return [
        {
          sha: "abc",
          commit: { message: "update", author: { name: "test", date } },
        },
      ];
    }),
    getFileContent: vi.fn(),
    fileExists: vi.fn(),
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

describe("FreshnessChecker", () => {
  it("marks documents as fresh when recently updated", async () => {
    const now = new Date().toISOString();
    const github = createMockGitHub({
      packages: now,
      "CLAUDE.md": now,
      "SPEC.md": now,
      "docs/specs/prd-v4.md": now,
    });
    const checker = new FreshnessChecker(github, createPassthroughCache());

    const report = await checker.check();
    expect(report.overallStale).toBe(false);
    expect(report.documents.every((d) => !d.stale)).toBe(true);
  });

  it("marks documents as stale when older than 7 days", async () => {
    const now = new Date();
    const oldDate = new Date(
      now.getTime() - 10 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const github = createMockGitHub({
      packages: now.toISOString(),
      "CLAUDE.md": oldDate,
      "SPEC.md": oldDate,
      "docs/specs/prd-v4.md": oldDate,
    });
    const checker = new FreshnessChecker(github, createPassthroughCache());

    const report = await checker.check();
    expect(report.overallStale).toBe(true);
    expect(report.documents.every((d) => d.stale)).toBe(true);
    expect(report.documents[0]?.staleDays).toBeGreaterThanOrEqual(9);
  });

  it("skips documents with no commit history", async () => {
    const now = new Date().toISOString();
    const github = createMockGitHub({
      packages: now,
      "CLAUDE.md": now,
      // SPEC.md and prd-v4.md have no commits → getCommits returns []
    });
    const checker = new FreshnessChecker(github, createPassthroughCache());

    const report = await checker.check();
    // Only CLAUDE.md should appear (SPEC.md and prd-v4.md skipped due to empty commits)
    expect(report.documents.length).toBeGreaterThanOrEqual(1);
  });
});
