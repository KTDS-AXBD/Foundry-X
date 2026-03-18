import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubService } from "../services/github.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("GitHubService extended methods (F68)", () => {
  let github: GitHubService;

  beforeEach(() => {
    mockFetch.mockReset();
    github = new GitHubService("test-token", "KTDS-AXBD/Foundry-X");
  });

  it("getModifiedFiles returns filenames from PR", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { filename: "src/a.ts" },
        { filename: "src/b.ts" },
      ],
    });

    const files = await github.getModifiedFiles(42);
    expect(files).toEqual(["src/a.ts", "src/b.ts"]);
    expect(mockFetch.mock.calls[0]![0]).toContain("/pulls/42/files");
  });

  it("updateBranch returns updated=true on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://api.github.com/repos/test/commits/newsha", message: "Updating" }),
    });

    const result = await github.updateBranch(42, "oldsha");
    expect(result.updated).toBe(true);
  });

  it("updateBranch returns updated=false on failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const result = await github.updateBranch(42);
    expect(result.updated).toBe(false);
  });

  it("getPrStatuses returns status for multiple PRs", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mergeable: true, state: "open" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mergeable: false, state: "closed" }),
      });

    const statuses = await github.getPrStatuses([10, 20]);
    expect(statuses).toHaveLength(2);
    expect(statuses[0]).toEqual({ number: 10, mergeable: true, state: "open" });
    expect(statuses[1]).toEqual({ number: 20, mergeable: false, state: "closed" });
  });
});
