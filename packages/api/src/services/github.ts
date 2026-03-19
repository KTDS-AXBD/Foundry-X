export class GitHubService {
  private baseUrl = "https://api.github.com";

  constructor(
    private token: string,
    private repo: string,
  ) {}

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Foundry-X-API/0.8.0",
    };
  }

  async getFileContent(
    path: string,
  ): Promise<{ content: string; sha: string; size: number }> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/contents/${path}`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new GitHubApiError(res.status, path);
    const data = (await res.json()) as {
      content: string;
      sha: string;
      size: number;
    };
    return {
      content: atob(data.content.replace(/\n/g, "")),
      sha: data.sha,
      size: data.size,
    };
  }

  async getCommits(path: string, perPage = 5): Promise<GitHubCommit[]> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/commits?path=${encodeURIComponent(path)}&per_page=${perPage}`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new GitHubApiError(res.status, path);
    return res.json() as Promise<GitHubCommit[]>;
  }

  async createOrUpdateFile(
    path: string,
    content: string,
    message: string,
    sha?: string,
  ): Promise<{ sha: string; commit: { sha: string } }> {
    const body: Record<string, string> = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
    };
    if (sha) body.sha = sha;

    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/contents/${path}`,
      {
        method: "PUT",
        headers: { ...this.headers(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) throw new GitHubApiError(res.status, path);
    return res.json() as Promise<{ sha: string; commit: { sha: string } }>;
  }

  async getRateLimit(): Promise<{ remaining: number; limit: number }> {
    const res = await fetch(`${this.baseUrl}/rate_limit`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new GitHubApiError(res.status, "rate_limit");
    const data = (await res.json()) as {
      rate: { remaining: number; limit: number };
    };
    return { remaining: data.rate.remaining, limit: data.rate.limit };
  }

  async fileExists(path: string): Promise<boolean> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/contents/${path}`,
      { method: "HEAD", headers: this.headers() },
    );
    return res.ok;
  }

  // ─── Sprint 13: PR Pipeline Methods (F65) ───

  async createBranch(branchName: string, fromBranch = "master"): Promise<string> {
    const refRes = await fetch(
      `${this.baseUrl}/repos/${this.repo}/git/ref/heads/${fromBranch}`,
      { headers: this.headers() },
    );
    if (!refRes.ok) throw new GitHubApiError(refRes.status, `ref/heads/${fromBranch}`);
    const refData = (await refRes.json()) as { object: { sha: string } };

    const createRes = await fetch(
      `${this.baseUrl}/repos/${this.repo}/git/refs`,
      {
        method: "POST",
        headers: { ...this.headers(), "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: refData.object.sha,
        }),
      },
    );
    if (!createRes.ok) throw new GitHubApiError(createRes.status, branchName);
    return refData.object.sha;
  }

  async deleteBranch(branchName: string): Promise<boolean> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/git/refs/heads/${branchName}`,
      { method: "DELETE", headers: this.headers() },
    );
    return res.ok;
  }

  async createCommitWithFiles(
    branch: string,
    files: Array<{ path: string; content: string; action: string }>,
    message: string,
  ): Promise<{ sha: string; url: string }> {
    const refRes = await fetch(
      `${this.baseUrl}/repos/${this.repo}/git/ref/heads/${branch}`,
      { headers: this.headers() },
    );
    if (!refRes.ok) throw new GitHubApiError(refRes.status, `ref/heads/${branch}`);
    const refData = (await refRes.json()) as { object: { sha: string } };
    const commitSha = refData.object.sha;

    const commitRes = await fetch(
      `${this.baseUrl}/repos/${this.repo}/git/commits/${commitSha}`,
      { headers: this.headers() },
    );
    if (!commitRes.ok) throw new GitHubApiError(commitRes.status, commitSha);
    const commitData = (await commitRes.json()) as { tree: { sha: string } };
    const baseTree = commitData.tree.sha;

    const tree = files.map((f) => ({
      path: f.path,
      mode: "100644" as const,
      type: "blob" as const,
      content: f.content,
    }));

    const treeRes = await fetch(
      `${this.baseUrl}/repos/${this.repo}/git/trees`,
      {
        method: "POST",
        headers: { ...this.headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ base_tree: baseTree, tree }),
      },
    );
    if (!treeRes.ok) throw new GitHubApiError(treeRes.status, "git/trees");
    const treeData = (await treeRes.json()) as { sha: string };

    const newCommitRes = await fetch(
      `${this.baseUrl}/repos/${this.repo}/git/commits`,
      {
        method: "POST",
        headers: { ...this.headers(), "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          tree: treeData.sha,
          parents: [commitSha],
        }),
      },
    );
    if (!newCommitRes.ok) throw new GitHubApiError(newCommitRes.status, "git/commits");
    const newCommit = (await newCommitRes.json()) as { sha: string; html_url: string };

    const updateRes = await fetch(
      `${this.baseUrl}/repos/${this.repo}/git/refs/heads/${branch}`,
      {
        method: "PATCH",
        headers: { ...this.headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ sha: newCommit.sha }),
      },
    );
    if (!updateRes.ok) throw new GitHubApiError(updateRes.status, `refs/heads/${branch}`);

    return { sha: newCommit.sha, url: newCommit.html_url };
  }

  async createPullRequest(params: {
    title: string;
    body: string;
    head: string;
    base: string;
    labels?: string[];
  }): Promise<{ number: number; url: string; htmlUrl: string }> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/pulls`,
      {
        method: "POST",
        headers: { ...this.headers(), "Content-Type": "application/json" },
        body: JSON.stringify({
          title: params.title,
          body: params.body,
          head: params.head,
          base: params.base,
        }),
      },
    );
    if (!res.ok) throw new GitHubApiError(res.status, "pulls");
    const pr = (await res.json()) as { number: number; url: string; html_url: string };

    if (params.labels?.length) {
      await fetch(
        `${this.baseUrl}/repos/${this.repo}/issues/${pr.number}/labels`,
        {
          method: "POST",
          headers: { ...this.headers(), "Content-Type": "application/json" },
          body: JSON.stringify({ labels: params.labels }),
        },
      );
    }

    return { number: pr.number, url: pr.url, htmlUrl: pr.html_url };
  }

  async getPrDiff(prNumber: number): Promise<string> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/pulls/${prNumber}`,
      {
        headers: {
          ...this.headers(),
          Accept: "application/vnd.github.v3.diff",
        },
      },
    );
    if (!res.ok) throw new GitHubApiError(res.status, `pulls/${prNumber}/diff`);
    return res.text();
  }

  async mergePullRequest(
    prNumber: number,
    params?: { mergeMethod?: "squash" | "merge" | "rebase"; commitTitle?: string },
  ): Promise<{ sha: string; merged: boolean }> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/pulls/${prNumber}/merge`,
      {
        method: "PUT",
        headers: { ...this.headers(), "Content-Type": "application/json" },
        body: JSON.stringify({
          merge_method: params?.mergeMethod ?? "squash",
          commit_title: params?.commitTitle,
        }),
      },
    );
    if (!res.ok) throw new GitHubApiError(res.status, `pulls/${prNumber}/merge`);
    return res.json() as Promise<{ sha: string; merged: boolean }>;
  }

  async createPrReview(
    prNumber: number,
    params: { body: string; event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT"; comments?: Array<{ path: string; position: number; body: string }> },
  ): Promise<{ id: number }> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/pulls/${prNumber}/reviews`,
      {
        method: "POST",
        headers: { ...this.headers(), "Content-Type": "application/json" },
        body: JSON.stringify(params),
      },
    );
    if (!res.ok) throw new GitHubApiError(res.status, `pulls/${prNumber}/reviews`);
    return res.json() as Promise<{ id: number }>;
  }

  // ─── Sprint 18: Issue Sync Methods (F84) ───

  async createIssue(params: {
    title: string;
    body?: string;
    labels?: string[];
  }): Promise<{ number: number; url: string }> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/issues`,
      {
        method: "POST",
        headers: { ...this.headers(), "Content-Type": "application/json" },
        body: JSON.stringify({
          title: params.title,
          body: params.body ?? "",
          labels: params.labels ?? [],
        }),
      },
    );
    if (!res.ok) throw new GitHubApiError(res.status, "issues");
    const issue = (await res.json()) as { number: number; html_url: string };
    return { number: issue.number, url: issue.html_url };
  }

  async updateIssue(
    number: number,
    params: { state?: "open" | "closed"; labels?: string[] },
  ): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/issues/${number}`,
      {
        method: "PATCH",
        headers: { ...this.headers(), "Content-Type": "application/json" },
        body: JSON.stringify(params),
      },
    );
    if (!res.ok) throw new GitHubApiError(res.status, `issues/${number}`);
  }

  async addIssueComment(
    number: number,
    body: string,
  ): Promise<{ id: number }> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/issues/${number}/comments`,
      {
        method: "POST",
        headers: { ...this.headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      },
    );
    if (!res.ok) throw new GitHubApiError(res.status, `issues/${number}/comments`);
    return res.json() as Promise<{ id: number }>;
  }

  // ─── Sprint 14: Merge Queue Methods (F68) ───

  async getModifiedFiles(prNumber: number): Promise<string[]> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/pulls/${prNumber}/files`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new GitHubApiError(res.status, `pulls/${prNumber}/files`);
    const files = (await res.json()) as Array<{ filename: string }>;
    return files.map((f) => f.filename);
  }

  async updateBranch(
    prNumber: number,
    expectedHeadSha?: string,
  ): Promise<{ updated: boolean; sha?: string }> {
    try {
      const body: Record<string, string> = {};
      if (expectedHeadSha) body.expected_head_sha = expectedHeadSha;

      const res = await fetch(
        `${this.baseUrl}/repos/${this.repo}/pulls/${prNumber}/update-branch`,
        {
          method: "PUT",
          headers: { ...this.headers(), "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) return { updated: false };
      const data = (await res.json()) as { url: string; message: string };
      return { updated: true, sha: data.url?.split("/").pop() };
    } catch {
      return { updated: false };
    }
  }

  async getPrStatuses(
    prNumbers: number[],
  ): Promise<Array<{ number: number; mergeable: boolean; state: string }>> {
    const results = await Promise.all(
      prNumbers.map(async (num) => {
        try {
          const res = await fetch(
            `${this.baseUrl}/repos/${this.repo}/pulls/${num}`,
            { headers: this.headers() },
          );
          if (!res.ok) return { number: num, mergeable: false, state: "unknown" };
          const pr = (await res.json()) as { mergeable: boolean | null; state: string };
          return { number: num, mergeable: pr.mergeable ?? false, state: pr.state };
        } catch {
          return { number: num, mergeable: false, state: "error" };
        }
      }),
    );
    return results;
  }

  async getCheckRuns(ref: string): Promise<{ total: number; conclusion: string | null; checks: Array<{ name: string; status: string; conclusion: string | null }> }> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/commits/${ref}/check-runs`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new GitHubApiError(res.status, `check-runs/${ref}`);
    const data = (await res.json()) as {
      total_count: number;
      check_runs: Array<{ name: string; status: string; conclusion: string | null }>;
    };

    const allCompleted = data.check_runs.every((c) => c.status === "completed");
    const allPassed = data.check_runs.every((c) => c.conclusion === "success");

    return {
      total: data.total_count,
      conclusion: allCompleted ? (allPassed ? "success" : "failure") : null,
      checks: data.check_runs.map((c) => ({
        name: c.name,
        status: c.status,
        conclusion: c.conclusion,
      })),
    };
  }

  // ─── Sprint 21: Label Management Methods (F93) ───

  async addLabels(
    issueOrPrNumber: number,
    labels: string[],
  ): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/issues/${issueOrPrNumber}/labels`,
      {
        method: "POST",
        headers: { ...this.headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ labels }),
      },
    );
    if (!res.ok) throw new GitHubApiError(res.status, `issues/${issueOrPrNumber}/labels`);
  }

  async removeLabel(
    issueOrPrNumber: number,
    label: string,
  ): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/issues/${issueOrPrNumber}/labels/${encodeURIComponent(label)}`,
      { method: "DELETE", headers: this.headers() },
    );
    // 404는 무시 (라벨이 없는 경우)
    if (!res.ok && res.status !== 404) {
      throw new GitHubApiError(res.status, `issues/${issueOrPrNumber}/labels/${label}`);
    }
  }

  // ─── Sprint 22 F95: File Content Methods for PlannerAgent ───

  async getFileContentRaw(
    repo: string, path: string, ref?: string,
  ): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/repos/${repo}/contents/${encodeURIComponent(path)}${ref ? "?ref=" + ref : ""}`;
      const res = await fetch(url, { headers: this.headers() });
      if (!res.ok) return null;
      const data = (await res.json()) as { content: string };
      return atob(data.content.replace(/\n/g, ""));
    } catch {
      return null;
    }
  }

  async getMultipleFiles(
    repo: string, paths: string[], ref?: string,
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (paths.length <= 10) {
      await Promise.all(paths.map(async (p) => {
        const content = await this.getFileContentRaw(repo, p, ref);
        if (content !== null) result.set(p, content);
      }));
      return result;
    }
    try {
      const treeRes = await fetch(
        `${this.baseUrl}/repos/${repo}/git/trees/${ref ?? "HEAD"}?recursive=1`,
        { headers: this.headers() },
      );
      if (!treeRes.ok) throw new Error("trees API failed");
      const treeData = (await treeRes.json()) as {
        tree: Array<{ path: string; sha: string; type: string }>;
      };
      const pathSet = new Set(paths);
      const blobs = treeData.tree.filter((t) => t.type === "blob" && pathSet.has(t.path));
      await Promise.all(blobs.map(async (blob) => {
        try {
          const blobRes = await fetch(
            `${this.baseUrl}/repos/${repo}/git/blobs/${blob.sha}`,
            { headers: this.headers() },
          );
          if (!blobRes.ok) return;
          const blobData = (await blobRes.json()) as { content: string };
          result.set(blob.path, atob(blobData.content.replace(/\n/g, "")));
        } catch { /* skip */ }
      }));
    } catch {
      const limited = paths.slice(0, 10);
      await Promise.all(limited.map(async (p) => {
        const content = await this.getFileContentRaw(repo, p, ref);
        if (content !== null) result.set(p, content);
      }));
    }
    return result;
  }
}

export class GitHubApiError extends Error {
  constructor(
    public status: number,
    public path: string,
  ) {
    super(`GitHub API ${status} for ${path}`);
  }
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
}
