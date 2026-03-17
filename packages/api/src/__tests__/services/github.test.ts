import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubService, GitHubApiError } from "../../services/github.js";

const originalFetch = globalThis.fetch;

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  globalThis.fetch = vi.fn(handler as typeof fetch);
}

beforeEach(() => {
  globalThis.fetch = originalFetch;
});

describe("GitHubService", () => {
  const github = new GitHubService("test-token", "owner/repo");

  it("getFileContent decodes Base64 content", async () => {
    const content = btoa("# Hello World");
    mockFetch(async () =>
      new Response(
        JSON.stringify({ content: content, sha: "abc123", size: 13 }),
        { status: 200 },
      ),
    );

    const result = await github.getFileContent("README.md");
    expect(result.content).toBe("# Hello World");
    expect(result.sha).toBe("abc123");
    expect(result.size).toBe(13);
  });

  it("getCommits returns commit array", async () => {
    const commits = [
      {
        sha: "def456",
        commit: {
          message: "initial",
          author: { name: "Test", date: "2026-03-17T00:00:00Z" },
        },
      },
    ];
    mockFetch(async () =>
      new Response(JSON.stringify(commits), { status: 200 }),
    );

    const result = await github.getCommits("src/", 1);
    expect(result).toHaveLength(1);
    expect(result[0]?.sha).toBe("def456");
  });

  it("fileExists returns true for 200, false for 404", async () => {
    mockFetch(async () => new Response(null, { status: 200 }));
    expect(await github.fileExists("CLAUDE.md")).toBe(true);

    mockFetch(async () => new Response(null, { status: 404 }));
    expect(await github.fileExists("missing.md")).toBe(false);
  });

  it("throws GitHubApiError on non-OK response", async () => {
    mockFetch(
      async () => new Response("Not Found", { status: 404 }),
    );

    await expect(github.getFileContent("missing.md")).rejects.toThrow(
      GitHubApiError,
    );
  });
});
