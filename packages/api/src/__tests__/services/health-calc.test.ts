import { describe, it, expect, vi } from "vitest";
import { HealthCalculator } from "../../services/health-calc.js";
import type { GitHubService } from "../../services/github.js";
import type { KVCacheService } from "../../services/kv-cache.js";

function createMockGitHub(
  files: Record<string, string>,
): GitHubService {
  return {
    getFileContent: vi.fn(async (path: string) => {
      const content = files[path];
      if (!content) throw new Error(`Not found: ${path}`);
      return { content, sha: "mock-sha", size: content.length };
    }),
    getCommits: vi.fn(async () => []),
    fileExists: vi.fn(async () => true),
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

describe("HealthCalculator", () => {
  it("calculates score from SPEC.md F-items", async () => {
    const specContent = [
      "| F1 | CLI Init (FX-REQ-001, P1) | v0.1 | \u2705 | done |",
      "| F2 | CLI Status (FX-REQ-002, P1) | v0.2 | \u2705 | done |",
      "| F3 | CLI Sync (FX-REQ-003, P1) | v0.3 | \uD83D\uDCCB | planned |",
    ].join("\n");

    const pkgJson = JSON.stringify({ scripts: { test: "vitest" } });

    const github = createMockGitHub({
      "SPEC.md": specContent,
      "package.json": pkgJson,
    });
    const cache = createPassthroughCache();
    const calc = new HealthCalculator(github, cache);

    const score = await calc.calculate();

    // 2/3 done = 67% specToCode, 75 codeToTest (has test script), specToTest = avg(67,75)=71
    expect(score.specToCode).toBe(67);
    expect(score.codeToTest).toBe(75);
    expect(score.grade).toMatch(/^[A-F]$/);
    expect(score.overall).toBeGreaterThan(0);
  });

  it("returns grade F for zero items", async () => {
    const github = createMockGitHub({
      "SPEC.md": "no table here",
      "package.json": "{}",
    });
    const cache = createPassthroughCache();
    const calc = new HealthCalculator(github, cache);

    const score = await calc.calculate();
    expect(score.specToCode).toBe(0);
  });

  it("handles missing package.json gracefully", async () => {
    const specContent =
      "| F1 | Feature (FX-REQ-001, P1) | v0.1 | \u2705 | done |";
    const github = createMockGitHub({ "SPEC.md": specContent });
    const cache = createPassthroughCache();
    const calc = new HealthCalculator(github, cache);

    const score = await calc.calculate();
    // package.json missing → codeToTest falls back to 50
    expect(score.codeToTest).toBe(50);
  });
});
