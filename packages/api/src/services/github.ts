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

  async fileExists(path: string): Promise<boolean> {
    const res = await fetch(
      `${this.baseUrl}/repos/${this.repo}/contents/${path}`,
      { method: "HEAD", headers: this.headers() },
    );
    return res.ok;
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
