import type { Env } from "../../../env.js";
import { SSEManager } from "../../../services/sse-manager.js";
import { MODEL_SONNET } from "@foundry-x/shared";
import {
  queryAllAgentSessions,
  queryDistinctAgentWorktrees,
  syncAgentSessionsData,
} from "../../agent/types.js";

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
        model: MODEL_SONNET,
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

  // ─── Work Analytics (F513 B-1~B-3) ──────────────────────────────────────────

  async getVelocity() {
    const items = await this.parseSpecItems();
    const doneItems = items.filter(i => i.status === "done" && i.sprint);

    const sprintMap = new Map<number, number>();
    for (const item of doneItems) {
      const n = parseInt(item.sprint ?? "0", 10);
      if (n > 0) sprintMap.set(n, (sprintMap.get(n) ?? 0) + 1);
    }

    const sprints = Array.from(sprintMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([sprint, f_items_done]) => ({
        sprint,
        f_items_done,
        week: `${new Date().getFullYear()}-W${String(sprint % 52 || 52).padStart(2, "0")}`,
      }));

    const counts = sprints.map(s => s.f_items_done);
    const avg_per_sprint = counts.length > 0
      ? Math.round((counts.reduce((a, b) => a + b, 0) / counts.length) * 10) / 10
      : 0;

    let trend: "up" | "down" | "stable" = "stable";
    if (counts.length >= 2) {
      const recent = counts.slice(-3).reduce((a, b) => a + b, 0) / Math.min(counts.length, 3);
      const older = counts.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(counts.length - 3, 1);
      if (recent > older * 1.1) trend = "up";
      else if (recent < older * 0.9) trend = "down";
    }

    return { sprints, avg_per_sprint, trend, generated_at: new Date().toISOString() };
  }

  async getPhaseProgress() {
    const items = await this.parseSpecItems();

    // Group by phase inferred from F-item numbering (every ~30 items = one phase)
    const phaseMap = new Map<number, { total: number; done: number; in_progress: number }>();
    const ITEMS_PER_PHASE = 15;

    for (const item of items) {
      const num = parseInt(item.id.replace("F", ""), 10);
      const phaseId = Math.max(1, Math.ceil(num / ITEMS_PER_PHASE));
      const entry = phaseMap.get(phaseId) ?? { total: 0, done: 0, in_progress: 0 };
      entry.total++;
      if (item.status === "done") entry.done++;
      if (item.status === "in_progress") entry.in_progress++;
      phaseMap.set(phaseId, entry);
    }

    const phases = Array.from(phaseMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([id, data]) => ({
        id,
        name: `Phase ${id}`,
        total: data.total,
        done: data.done,
        in_progress: data.in_progress,
        pct: data.total > 0 ? Math.round((data.done / data.total) * 100) : 0,
      }));

    const current_phase = phases.length > 0 ? (phases[phases.length - 1]?.id ?? 1) : 1;

    return { phases, current_phase, generated_at: new Date().toISOString() };
  }

  async getBacklogHealth() {
    const items = await this.parseSpecItems();
    const backlogItems = items.filter(i => i.status === "backlog" && !i.sprint);

    const STALE_THRESHOLD = 10;
    const stale_items = backlogItems
      .filter(i => {
        const num = parseInt(i.id.replace("F", ""), 10);
        return num < (items[items.length - 1] ? parseInt(items[items.length - 1]!.id.replace("F", ""), 10) - STALE_THRESHOLD : 0);
      })
      .slice(0, 20)
      .map(i => ({
        id: i.id,
        title: i.title,
        age_sprints: STALE_THRESHOLD,
      }));

    const total_backlog = backlogItems.length;
    const health_score = total_backlog === 0
      ? 100
      : Math.max(0, Math.round(100 - (stale_items.length / Math.max(total_backlog, 1)) * 50 - (total_backlog > 20 ? 20 : 0)));

    const warnings: string[] = [];
    if (total_backlog > 30) warnings.push(`백로그 항목이 ${total_backlog}개로 과다합니다`);
    if (stale_items.length > 5) warnings.push(`장기 대기 항목 ${stale_items.length}개 검토 필요`);

    return { total_backlog, stale_items, health_score, warnings, generated_at: new Date().toISOString() };
  }

  // ─── Agent Sessions (F510 M4) ────────────────────────────────────────────

  async getSessions() {
    const rows = await queryAllAgentSessions(this.env.DB);
    const lastSync = rows[0]?.collected_at ?? new Date(0).toISOString();
    const worktrees = await queryDistinctAgentWorktrees(this.env.DB);

    return {
      sessions: rows.map(r => ({
        id: r.id,
        name: r.name,
        status: r.status as "busy" | "idle" | "done",
        profile: r.profile as "coder" | "reviewer" | "tester" | "unknown",
        worktree: r.worktree ?? undefined,
        branch: r.branch ?? undefined,
        windows: r.windows,
        last_activity: r.last_activity ?? undefined,
        collected_at: r.collected_at,
      })),
      worktrees,
      last_sync: lastSync,
    };
  }

  async syncSessions(input: {
    sessions: Array<{ name: string; status: string; profile: string; windows: number; last_activity: number }>;
    worktrees: Array<{ path: string; branch: string }>;
    collected_at: string;
  }) {
    return syncAgentSessionsData(this.env.DB, input);
  }

  async getChangelog() {
    try {
      const repo = this.env.GITHUB_REPO || "KTDS-AXBD/Foundry-X";
      const url = `https://raw.githubusercontent.com/${repo}/master/CHANGELOG.md`;
      const res = await fetch(url, {
        headers: this.env.GITHUB_TOKEN
          ? { Authorization: `token ${this.env.GITHUB_TOKEN}` }
          : {},
      });
      if (!res.ok) return { content: "", generated_at: new Date().toISOString() };
      const content = await res.text();
      return { content, generated_at: new Date().toISOString() };
    } catch {
      return { content: "", generated_at: new Date().toISOString() };
    }
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

  // ─── F516: Backlog 인입 파이프라인 ──────────────────────────────────────

  async submitBacklog(input: {
    title: string;
    description?: string;
    source: "web" | "cli" | "marker";
    idempotency_key?: string;
  }) {
    // 1. 중복 체크 (idempotency_key)
    if (input.idempotency_key) {
      const existing = await this.env.DB
        .prepare("SELECT id FROM backlog_items WHERE idempotency_key = ?")
        .bind(input.idempotency_key)
        .first<{ id: string }>();
      if (existing) {
        return { conflict: true, id: existing.id };
      }
    }

    // 2. 분류
    const classified = await this.classify(input.title + (input.description ? ` ${input.description}` : ""));

    // 3. D1 INSERT
    const id = `bli-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await this.env.DB
      .prepare(`
        INSERT INTO backlog_items (id, org_id, title, description, track, priority, source, classify_method, status, idempotency_key)
        VALUES (?, 'org_default', ?, ?, ?, ?, ?, ?, 'classified', ?)
      `)
      .bind(
        id,
        classified.title,
        input.description ?? null,
        classified.track,
        classified.priority,
        input.source,
        classified.method,
        input.idempotency_key ?? null,
      )
      .run();

    // 4. GitHub Issue 생성 (soft fail)
    let github_issue_number: number | undefined;
    try {
      github_issue_number = await this.createGithubIssue(classified.title, classified.track, classified.priority);
    } catch {
      // soft fail — 이슈 없이도 계속
    }

    // 5. SPEC.md 행 추가 (soft fail)
    const spec_row_added = await this.updateSpecMd({ id, title: classified.title, track: classified.track, priority: classified.priority });

    // 6. D1 상태 갱신
    await this.env.DB
      .prepare("UPDATE backlog_items SET github_issue_number = ?, spec_row_added = ?, status = 'registered', updated_at = datetime('now') WHERE id = ?")
      .bind(github_issue_number ?? null, spec_row_added ? 1 : 0, id)
      .run();

    // 7. SSE broadcast (soft fail)
    try {
      const sseManager = new SSEManager(this.env.DB);
      sseManager.pushEvent({
        event: "work:backlog-updated",
        data: { id, track: classified.track, priority: classified.priority, title: classified.title, source: input.source },
      });
    } catch {
      // SSE 실패는 응답에 영향 없음
    }

    return {
      conflict: false,
      id,
      track: classified.track,
      priority: classified.priority,
      title: classified.title,
      classify_method: classified.method,
      github_issue_number,
      spec_row_added,
      status: "registered",
    };
  }

  private async createGithubIssue(title: string, track: string, priority: string): Promise<number> {
    const repo = this.env.GITHUB_REPO || "KTDS-AXBD/Foundry-X";
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `token ${this.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": "Foundry-X",
      },
      body: JSON.stringify({
        title: `[Backlog] ${title}`,
        labels: [`track-${track}`, `priority-${priority}`],
      }),
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = await res.json() as { number: number };
    return data.number;
  }

  private async updateSpecMd(item: { id: string; title: string; track: string; priority: string }): Promise<boolean> {
    try {
      const repo = this.env.GITHUB_REPO || "KTDS-AXBD/Foundry-X";
      const apiUrl = `https://api.github.com/repos/${repo}/contents/SPEC.md`;
      const headers = {
        Authorization: `token ${this.env.GITHUB_TOKEN}`,
        "User-Agent": "Foundry-X",
        "Content-Type": "application/json",
      };

      // 현재 SPEC.md 가져오기
      const getRes = await fetch(apiUrl, { headers });
      if (!getRes.ok) return false;
      const fileData = await getRes.json() as { content: string; sha: string };

      // base64 디코드 → 행 추가 → base64 인코드
      const content = atob(fileData.content.replace(/\n/g, ""));
      const newRow = `| ${item.id} | ${item.title} (${item.track}, ${item.priority}) | — | 📋(idea) | 웹 자동 인입 |`;
      const markerComment = "<!-- fx-task-orchestrator-backlog -->";
      const updated = content.includes(markerComment)
        ? content.replace(markerComment, `${newRow}\n${markerComment}`)
        : content + `\n${newRow}`;
      const encoded = btoa(updated);

      // GitHub API PUT
      const putRes = await fetch(apiUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: `chore: auto-add backlog item ${item.id} via web submit`,
          content: encoded,
          sha: fileData.sha,
        }),
      });
      return putRes.ok;
    } catch {
      return false;
    }
  }
}
