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

  private specTextCache: string | null = null;

  private async fetchSpecText(): Promise<string> {
    if (this.specTextCache) return this.specTextCache;
    try {
      const repo = this.env.GITHUB_REPO || "KTDS-AXBD/Foundry-X";
      const url = `https://raw.githubusercontent.com/${repo}/master/SPEC.md`;
      const res = await fetch(url, {
        headers: this.env.GITHUB_TOKEN
          ? { Authorization: `token ${this.env.GITHUB_TOKEN}` }
          : {},
      });
      if (!res.ok) return "";
      this.specTextCache = await res.text();
      return this.specTextCache;
    } catch {
      return "";
    }
  }

  private async parseSpecItems(): Promise<WorkItem[]> {
    const text = await this.fetchSpecText();
    if (!text) return [];
    return [...this.parseFItems(text), ...this.parseBacklogItems(text)];
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

  // C45/C49: Parse Backlog table rows (C/B/X tracks)
  // Format: | C43 | C | title... | REQ | Sprint | 상태 | 비고 |
  private parseBacklogItems(specText: string): WorkItem[] {
    const linePattern = /^\|\s*([CBXF]\d+)\s*\|\s*[CBXF]\s*\|\s*([^|]{3,}?)\s*\|[^|]*\|[^|]*\|\s*([^|]*?)\s*\|/gm;
    const items: WorkItem[] = [];

    for (const match of specText.matchAll(linePattern)) {
      const id = match[1] ?? "";
      const title = match[2] ?? "";
      const statusCol = match[3] ?? "";

      if (!id || id.startsWith("F")) continue; // F-items already parsed above

      let status: WorkItem["status"] = "backlog";
      const st = statusCol.trim().toUpperCase();
      if (st === "DONE" || st.includes("✅")) status = "done";
      else if (st.includes("IN_PROGRESS") || st.includes("🔧")) status = "in_progress";
      else if (st.includes("PLANNED") || st.includes("📋")) status = "planned";
      else if (st.includes("CANCELLED") || st.includes("CLOSED") || st.includes("REJECTED")) status = "rejected";

      items.push({
        id: id.trim(),
        title: title.trim().slice(0, 100),
        status,
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
    const specText = await this.fetchSpecText();
    if (!specText) {
      return { phases: [], current_phase: 1, generated_at: new Date().toISOString() };
    }

    // Parse SPEC §3 Phase table directly instead of inferring from F-item numbers
    // Format: | Phase 33 Work Observability (F509) | ✅ Sprint 261 |
    // or:     | **Phase 36 Work Management Enhancement** (...) | | | |
    const phasePattern = /^\|\s*\*{0,2}Phase\s+(\d+)[:\s]*([^(|*]*)/gm;
    const statusPattern = /\|\s*(✅|🔧|📋)/;

    const phases: Array<{ id: number; name: string; total: number; done: number; in_progress: number; pct: number }> = [];
    const seen = new Set<number>();

    for (const match of specText.matchAll(phasePattern)) {
      const id = parseInt(match[1] ?? "0", 10);
      if (id === 0 || seen.has(id)) continue;
      seen.add(id);

      const rawName = (match[2] ?? "").trim().replace(/\*+$/, "").trim();
      const name = rawName || `Phase ${id}`;

      // Find status in the same line
      const lineEnd = specText.indexOf("\n", match.index ?? 0);
      const fullLine = specText.slice(match.index ?? 0, lineEnd > 0 ? lineEnd : undefined);
      const statusMatch = fullLine.match(statusPattern);
      const statusEmoji = statusMatch?.[1] ?? "";

      // Count F-items belonging to this phase by checking next Phase boundary
      const items = await this.parseSpecItems();
      const phaseItems = items.filter(i => {
        if (!i.id.startsWith("F")) return false;
        // Check if item is mentioned in the Phase section header or nearby rows
        const itemIdx = specText.indexOf(`| ${i.id} |`);
        if (itemIdx < 0) return false;
        const phaseIdx = match.index ?? 0;
        // Find next Phase header
        const nextPhaseMatch = specText.slice(phaseIdx + 1).match(/^\|\s*\*{0,2}Phase\s+\d+/m);
        const nextPhaseIdx = nextPhaseMatch ? phaseIdx + 1 + (nextPhaseMatch.index ?? specText.length) : specText.length;
        return itemIdx > phaseIdx && itemIdx < nextPhaseIdx;
      });

      const total = phaseItems.length || 1;
      const done = phaseItems.filter(i => i.status === "done").length || (statusEmoji === "✅" ? 1 : 0);
      const in_progress = phaseItems.filter(i => i.status === "in_progress").length || (statusEmoji === "🔧" ? 1 : 0);
      const pct = total > 0 ? Math.round((done / total) * 100) : (statusEmoji === "✅" ? 100 : 0);

      phases.push({ id, name, total, done, in_progress, pct });
    }

    phases.sort((a, b) => a.id - b.id);
    const current_phase = phases.find(p => p.pct < 100 && p.pct > 0)?.id
      ?? phases[phases.length - 1]?.id
      ?? 1;

    return { phases, current_phase, generated_at: new Date().toISOString() };
  }

  // C44: Parse ROADMAP.md for future plans
  async getRoadmap() {
    try {
      const repo = this.env.GITHUB_REPO || "KTDS-AXBD/Foundry-X";
      const url = `https://raw.githubusercontent.com/${repo}/master/docs/ROADMAP.md`;
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
    const result = await this.env.DB.prepare(
      `SELECT id, name, status, profile, worktree, branch, windows, last_activity, collected_at
       FROM agent_sessions
       ORDER BY CASE status WHEN 'busy' THEN 0 WHEN 'idle' THEN 1 WHEN 'done' THEN 2 ELSE 3 END,
                last_activity DESC`
    ).all<{
      id: string; name: string; status: string; profile: string;
      worktree: string | null; branch: string | null; windows: number;
      last_activity: string | null; collected_at: string;
    }>();

    const rows = result.results ?? [];
    const lastSync = rows[0]?.collected_at ?? new Date(0).toISOString();

    // Fetch paired worktrees from dedicated sync table column aggregation
    const wtResult = await this.env.DB.prepare(
      `SELECT DISTINCT worktree AS path, branch FROM agent_sessions WHERE worktree IS NOT NULL`
    ).all<{ path: string; branch: string }>();

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
      worktrees: (wtResult.results ?? []).map(r => ({ path: r.path, branch: r.branch })),
      last_sync: lastSync,
    };
  }

  async syncSessions(input: {
    sessions: Array<{ name: string; status: string; profile: string; windows: number; last_activity: number }>;
    worktrees: Array<{ path: string; branch: string }>;
    collected_at: string;
  }) {
    const now = new Date().toISOString();

    // Upsert each session (id = session name, stable identifier)
    const stmts = input.sessions.map(s => {
      const lastActivityIso = s.last_activity
        ? new Date(s.last_activity * 1000).toISOString()
        : null;

      // Normalise profile to allowed enum values
      let profile = s.profile;
      if (!["coder", "reviewer", "tester"].includes(profile)) profile = "unknown";

      // Normalise status
      let status = s.status;
      if (!["busy", "idle", "done"].includes(status)) status = "idle";

      return this.env.DB.prepare(
        `INSERT INTO agent_sessions (id, name, status, profile, windows, last_activity, collected_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           status       = excluded.status,
           profile      = excluded.profile,
           windows      = excluded.windows,
           last_activity= excluded.last_activity,
           collected_at = excluded.collected_at,
           updated_at   = excluded.updated_at`
      ).bind(s.name, s.name, status, profile, s.windows, lastActivityIso, input.collected_at, now, now);
    });

    if (stmts.length > 0) {
      await this.env.DB.batch(stmts);
    }

    // Remove sessions not present in this batch (stale = terminated)
    const names = input.sessions.map(s => s.name);
    let removed = 0;
    if (names.length > 0) {
      const placeholders = names.map(() => "?").join(",");
      const del = await this.env.DB.prepare(
        `DELETE FROM agent_sessions WHERE id NOT IN (${placeholders})`
      ).bind(...names).run();
      removed = del.meta.changes ?? 0;
    } else {
      // No sessions reported → clear all
      const del = await this.env.DB.prepare(`DELETE FROM agent_sessions`).run();
      removed = del.meta.changes ?? 0;
    }

    // Upsert worktree info into sessions rows where name matches branch suffix
    for (const wt of input.worktrees) {
      const branch = wt.branch.replace(/^refs\/heads\//, "");
      await this.env.DB.prepare(
        `UPDATE agent_sessions SET worktree = ?, branch = ? WHERE name LIKE ? AND worktree IS NULL`
      ).bind(wt.path, branch, `%${branch.split("/").pop() ?? ""}%`).run();
    }

    return { synced: input.sessions.length, removed };
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
}
