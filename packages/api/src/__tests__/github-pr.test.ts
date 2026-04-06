import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubService, GitHubApiError } from "../modules/portal/services/github.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("GitHubService PR methods", () => {
  let github: GitHubService;

  beforeEach(() => {
    mockFetch.mockReset();
    github = new GitHubService("test-token", "KTDS-AXBD/Foundry-X");
  });

  it("createBranch gets ref sha and creates new ref", async () => {
    // GET ref
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ object: { sha: "abc123" } }),
    });
    // POST refs
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ref: "refs/heads/agent/task-1", object: { sha: "abc123" } }),
    });

    const sha = await github.createBranch("agent/task-1", "master");
    expect(sha).toBe("abc123");
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const createCall = mockFetch.mock.calls[1]!;
    expect(createCall[0]).toContain("/git/refs");
    const body = JSON.parse(createCall[1].body);
    expect(body.ref).toBe("refs/heads/agent/task-1");
    expect(body.sha).toBe("abc123");
  });

  it("createPullRequest creates PR and adds labels", async () => {
    // POST pulls
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ number: 42, url: "https://api.github.com/pulls/42", html_url: "https://github.com/pulls/42" }),
    });
    // POST labels
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    });

    const pr = await github.createPullRequest({
      title: "Test PR",
      body: "Test body",
      head: "agent/task-1",
      base: "master",
      labels: ["agent-pr"],
    });

    expect(pr.number).toBe(42);
    expect(pr.htmlUrl).toBe("https://github.com/pulls/42");
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Check labels call
    const labelUrl = mockFetch.mock.calls[1]![0];
    expect(labelUrl).toContain("/issues/42/labels");
  });

  it("mergePullRequest merges with squash by default", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sha: "merge-sha", merged: true }),
    });

    const result = await github.mergePullRequest(42);
    expect(result.sha).toBe("merge-sha");
    expect(result.merged).toBe(true);

    const call = mockFetch.mock.calls[0]!;
    expect(call[0]).toContain("/pulls/42/merge");
    const body = JSON.parse(call[1].body);
    expect(body.merge_method).toBe("squash");
  });

  it("getPrDiff returns diff text", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "diff --git a/file.ts b/file.ts\n+added line\n",
    });

    const diff = await github.getPrDiff(42);
    expect(diff).toContain("diff --git");
    expect(diff).toContain("+added line");

    const opts = mockFetch.mock.calls[0]![1];
    expect(opts.headers.Accept).toBe("application/vnd.github.v3.diff");
  });
});
