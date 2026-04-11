import type { Env } from "../env.js";

interface WorkItem {
  id: string;
  title: string;
  status: "backlog" | "planned" | "in_progress" | "done" | "rejected" | "closed";
  sprint?: string;
  priority?: string;
  req_code?: string;
}

interface GithubCommit {
  sha: string;
  message: string;
  date: string;
  author: string;
}

interface GithubPR {
  number: number;
  title: string;
  state: string;
  url: string;
  created_at: string;
}

export class WorkService {
  constructor(private env: Env) {}

  async getSnapshot() {
    const [items, github] = await Promise.all([
      this.parseSpecItems(),
      this.fetchGithubData(),
    ]);

    const summary = {
      backlog: items.filter(i => i.status === "backlog").length,
      planned: items.filter(i => i.status === "planned").length,
      in_progress: items.filter(i => i.status === "in_progress").length,
      done_today: items.filter(i => i.status === "done").length,
    };

    return {
      summary,
      items: items.slice(0, 80), // cap for Claude ~2000 token budget
      prs: github.prs.slice(0, 20),
      commits: github.commits.slice(0, 10),
      generated_at: new Date().toISOString(),
    };
  }

  async getContext() {
    const github = await this.fetchGithubData();
    const openPrs = github.prs.filter(p => p.state === "open");
    const nextActions: string[] = [];

    if (openPrs.length > 0) {
      nextActions.push(`PR review: ${openPrs.length}개 open — ${openPrs.map(p => `#${p.number}`).join(", ")}`);
    }
    if (github.commits.length > 0) {
      nextActions.push(`최근 작업: ${github.commits[0]?.message ?? ""}`);
    }
    nextActions.push("/ax:session-start 로 다음 세션 컨텍스트 복원");

    return {
      recent_commits: github.commits.slice(0, 10),
      worktrees: [] as string[],
      daemon_events: [] as { event: string; timestamp: string }[],
      next_actions: nextActions,
      note: "worktrees/daemon_events: CF Workers에서 로컬 파일 접근 불가 — CLI `git worktree list` 또는 /ax:daily-check 사용",
    };
  }

  async classify(text: string) {
    if (this.env.ANTHROPIC_API_KEY) {
      try {
        return await this.classifyWithLLM(text);
      } catch {
        // fall through to regex fallback
      }
    }
    return this.classifyWithRegex(text);
  }

  private async parseSpecItems(): Promise<WorkItem[]> {
    try {
      const repo = this.env.GITHUB_REPO || "KTDS-AXBD/Foundry-X";
      const url = `https://raw.githubusercontent.com/${repo}/master/SPEC.md`;
      const res = await fetch(url, {
        headers: this.env.GITHUB_TOKEN
          ? { Authorization: `token ${this.env.GITHUB_TOKEN}` }
          : {},
      });
      if (!res.ok) return [];
      const text = await res.text();
      return this.parseFItems(text);
    } catch {
      return [];
    }
  }

  private parseFItems(specText: string): WorkItem[] {
    // Match F-item table rows: | F509 | title... | Sprint 261 | 📋 | notes |
    const linePattern = /^\|\s*(F\d+)\s*\|\s*([^|]{3,120}?)\s*\|\s*(Sprint\s*\d+|—|\s*)\s*\|\s*([^|]*?)\s*\|/gm;
    const items: WorkItem[] = [];

    for (const match of specText.matchAll(linePattern)) {
      const id = match[1] ?? "";
      const title = match[2] ?? "";
      const sprintCol = match[3] ?? "";
      const statusCol = match[4] ?? "";

      const sprint = sprintCol.match(/\d+/)?.[0];
      const status = this.inferStatus(statusCol, sprintCol);

      if (!id) continue;
      items.push({
        id: id.trim(),
        title: title.trim().slice(0, 100),
        status,
        sprint,
        priority: title.match(/P[0-3]/)?.[0],
        req_code: title.match(/FX-REQ-\d+/)?.[0],
      });
    }

    return items;
  }

  private inferStatus(
    statusCol: string,
    sprintCol: string,
  ): WorkItem["status"] {
    if (statusCol.includes("✅")) return "done";
    if (statusCol.includes("🔧")) return "in_progress";
    if (statusCol.includes("🚫")) return "rejected";
    if (statusCol.includes("📋")) return "backlog";
    if (sprintCol.trim() && sprintCol.includes("Sprint")) return "planned";
    return "backlog";
  }

  private async fetchGithubData(): Promise<{ commits: GithubCommit[]; prs: GithubPR[] }> {
    const repo = this.env.GITHUB_REPO || "KTDS-AXBD/Foundry-X";
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };
    if (this.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${this.env.GITHUB_TOKEN}`;
    }

    const [commitsResult, prsResult] = await Promise.allSettled([
      fetch(`https://api.github.com/repos/${repo}/commits?per_page=10`, { headers }),
      fetch(`https://api.github.com/repos/${repo}/pulls?state=all&per_page=20&sort=updated`, {
        headers,
      }),
    ]);

    const commits: GithubCommit[] = [];
    if (commitsResult.status === "fulfilled" && commitsResult.value.ok) {
      const data = (await commitsResult.value.json()) as Array<{
        sha: string;
        commit: { message: string; author: { date: string; name: string } };
      }>;
      for (const c of data) {
        commits.push({
          sha: c.sha.slice(0, 8),
          message: (c.commit.message.split("\n")[0] ?? "").slice(0, 80),
          date: c.commit.author.date,
          author: c.commit.author.name,
        });
      }
    }

    const prs: GithubPR[] = [];
    if (prsResult.status === "fulfilled" && prsResult.value.ok) {
      const data = (await prsResult.value.json()) as Array<{
        number: number;
        title: string;
        state: string;
        html_url: string;
        created_at: string;
      }>;
      for (const p of data) {
        prs.push({
          number: p.number,
          title: p.title.slice(0, 80),
          state: p.state,
          url: p.html_url,
          created_at: p.created_at,
        });
      }
    }

    return { commits, prs };
  }

  private async classifyWithLLM(text: string) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: `Classify this work item. Reply ONLY with JSON (no markdown): {"track":"F","priority":"P1","title":"brief title"}\n\ntrack: F=Feature, B=Bug, C=Chore, X=Experiment\npriority: P0=critical, P1=high, P2=medium, P3=low\n\nInput: "${text}"`,
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
    const data = (await res.json()) as { content: Array<{ text: string }> };
    const raw = (data.content[0]?.text ?? "").trim();
    const parsed = JSON.parse(raw) as {
      track: "F" | "B" | "C" | "X";
      priority: "P0" | "P1" | "P2" | "P3";
      title: string;
    };

    return {
      track: parsed.track,
      priority: parsed.priority,
      title: parsed.title,
      req_code: undefined as string | undefined,
      method: "llm" as const,
    };
  }

  private classifyWithRegex(text: string) {
    const lower = text.toLowerCase();

    let track: "F" | "B" | "C" | "X" = "F";
    if (/bug|fix|error|crash|fail|broken|오류|수정|버그/.test(lower)) track = "B";
    else if (/chore|cleanup|refactor|docs|format|lint|정리|문서/.test(lower)) track = "C";
    else if (/experiment|poc|spike|explore|실험|탐색/.test(lower)) track = "X";

    let priority: "P0" | "P1" | "P2" | "P3" = "P2";
    if (/critical|urgent|blocking|hotfix|즉시|긴급|블로킹/.test(lower)) priority = "P0";
    else if (/important|high|필요|중요|추가|구현/.test(lower)) priority = "P1";
    else if (/low|nice.?have|optional|나중|낮음|보조/.test(lower)) priority = "P3";

    return {
      track,
      priority,
      title: text.slice(0, 60).trim(),
      req_code: undefined as string | undefined,
      method: "regex" as const,
    };
  }
}
