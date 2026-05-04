// F517: 메타데이터 트레이서빌리티 — Green Phase 구현
import type { Env } from "../../../env.js";

export interface FItemLink {
  id: string;
  req_code?: string;
  sprint?: string;
  title: string;
  status: string;
}

export interface PrLink {
  id: string;
  sprint_num: string;
  pr_number: number;
  f_items: string[];
  branch?: string;
  pr_title?: string;
  pr_url?: string;
  pr_state: string;
  commit_shas: string[];
}

export interface ChangelogItem {
  f_item?: string;
  text: string;
  req_code?: string;
  sprint?: string;
  pr_number?: number;
}

export interface ChangelogEntry {
  phase: string;
  title: string;
  items: ChangelogItem[];
}

export interface TraceChain {
  id: string;
  type: "req" | "f_item";
  f_items: Array<{
    id: string;
    title: string;
    status: string;
    sprint?: string;
    req_code?: string;
    prs: Array<{
      number: number;
      title: string;
      url: string;
      state: string;
      commits: string[];
    }>;
  }>;
}

// F-item 상태 추론 (work.service와 동일한 로직)
function inferStatus(statusCol: string): string {
  if (statusCol.includes("✅")) return "done";
  if (statusCol.includes("🔧")) return "in_progress";
  if (statusCol.includes("🚫")) return "rejected";
  if (statusCol.includes("📋")) return "backlog";
  return "backlog";
}

export class TraceabilityService {
  constructor(private env: Env) {}

  // ─── parseFItemLinks ──────────────────────────────────────────────────────

  /** SPEC.md 텍스트 → F-item 링크 배열 */
  parseFItemLinks(specText: string): FItemLink[] {
    if (!specText) return [];

    const linePattern = /^\|\s*(F\d+)\s*\|\s*([^|]{3,200}?)\s*\|\s*(Sprint\s*(\d+)|—|\s*)\s*\|\s*([^|]*?)\s*\|/gm;
    const items: FItemLink[] = [];

    for (const match of specText.matchAll(linePattern)) {
      const id = (match[1] ?? "").trim();
      const title = (match[2] ?? "").trim().slice(0, 120);
      const sprint = match[4] ?? undefined;
      const statusCol = (match[5] ?? "").trim();

      if (!id) continue;

      const req_code = title.match(/FX-REQ-\d+/)?.[0];
      const status = inferStatus(statusCol);

      items.push({ id, req_code, sprint, title, status });
    }

    return items;
  }

  // ─── parsePrLinks ─────────────────────────────────────────────────────────

  /** GitHub PR 목록 → F번호/Sprint 매핑 배열 */
  parsePrLinks(prs: Array<{
    number: number;
    title: string;
    body: string;
    head: { ref: string };
    html_url: string;
    state: string;
  }>): PrLink[] {
    const result: PrLink[] = [];

    for (const pr of prs) {
      // F번호 추출: body 우선, title fallback
      const bodyMatches = [...(pr.body ?? "").matchAll(/\bF(\d+)\b/g)].map(m => `F${m[1]}`);
      const titleMatches = [...(pr.title ?? "").matchAll(/\bF(\d+)\b/g)].map(m => `F${m[1]}`);
      const f_items = [...new Set([...bodyMatches, ...titleMatches])];

      if (f_items.length === 0) continue;

      // sprint 번호: branch명에서 추출
      const sprintMatch = pr.head.ref.match(/sprint\/(\d+)/);
      const sprint_num = sprintMatch?.[1] ?? "";

      result.push({
        id: `sprint-${sprint_num || pr.number}-pr-${pr.number}`,
        sprint_num,
        pr_number: pr.number,
        f_items,
        branch: pr.head.ref,
        pr_title: pr.title,
        pr_url: pr.html_url,
        pr_state: pr.state,
        commit_shas: [],
      });
    }

    return result;
  }

  // ─── enrichChangelog ──────────────────────────────────────────────────────

  /** Changelog Markdown → 구조화된 항목 배열 (D1에서 메타 태깅) */
  async enrichChangelog(content: string): Promise<ChangelogEntry[]> {
    if (!content) return [];

    const entries: ChangelogEntry[] = [];
    let currentEntry: ChangelogEntry | null = null;

    const lines = content.split("\n");
    for (const line of lines) {
      // Phase 헤더: ## [Phase 37] 또는 ## [v1.0.0]
      const phaseMatch = line.match(/^##\s+\[([^\]]+)\](.*)/);
      if (phaseMatch) {
        if (currentEntry) entries.push(currentEntry);
        const phase = (phaseMatch[1] ?? "").trim();
        const title = (phaseMatch[2] ?? "").replace(/^[:\s-]+/, "").trim();
        currentEntry = { phase, title, items: [] };
        continue;
      }

      // 아이템 행: - F517: ... 또는 - text
      if (currentEntry && line.match(/^[-*]\s+/)) {
        const text = line.replace(/^[-*]\s+/, "").trim();
        const fMatch = text.match(/^(F\d+)[:\s]/);
        const f_item = fMatch?.[1];
        const item: ChangelogItem = { text, f_item };

        if (f_item) {
          // D1에서 메타 조회
          const row = await this.env.DB
            .prepare("SELECT req_code, sprint FROM spec_traceability WHERE id = ?")
            .bind(f_item)
            .first<{ req_code?: string; sprint?: string }>();
          if (row) {
            item.req_code = row.req_code;
            item.sprint = row.sprint;
          }

          // PR 연결 조회 (LIKE 패턴 — json_each보다 호환성 높음)
          const prRow = await this.env.DB
            .prepare(`
              SELECT pr_number FROM sprint_pr_links
              WHERE f_items LIKE ?
              ORDER BY pr_number DESC
              LIMIT 1
            `)
            .bind(`%"${f_item}"%`)
            .first<{ pr_number?: number }>();
          if (prRow?.pr_number) {
            item.pr_number = prRow.pr_number;
          } else if (item.sprint) {
            // fallback: sprint 번호 기반 조회
            const sprintPr = await this.env.DB
              .prepare(`
                SELECT pr_number FROM sprint_pr_links
                WHERE sprint_num = ?
                AND f_items LIKE ?
                LIMIT 1
              `)
              .bind(item.sprint, `%${f_item}%`)
              .first<{ pr_number?: number }>();
            if (sprintPr?.pr_number) item.pr_number = sprintPr.pr_number;
          }
        }

        currentEntry.items.push(item);
      }
    }

    if (currentEntry) entries.push(currentEntry);
    return entries;
  }

  // ─── syncFromSpec ─────────────────────────────────────────────────────────

  /** SPEC.md 파싱 → spec_traceability D1 upsert */
  async syncFromSpec(): Promise<{ synced: number }> {
    try {
      const repo = this.env.GITHUB_REPO || "KTDS-AXBD/Foundry-X";
      const url = `https://raw.githubusercontent.com/${repo}/master/SPEC.md`;
      const res = await fetch(url, {
        headers: this.env.GITHUB_TOKEN
          ? { Authorization: `token ${this.env.GITHUB_TOKEN}` }
          : {},
      });
      if (!res.ok) return { synced: 0 };

      const text = await res.text();
      const links = this.parseFItemLinks(text);

      for (const link of links) {
        await this.env.DB
          .prepare(`
            INSERT INTO spec_traceability (id, req_code, sprint, title, status, synced_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
              req_code  = excluded.req_code,
              sprint    = excluded.sprint,
              title     = excluded.title,
              status    = excluded.status,
              synced_at = excluded.synced_at
          `)
          .bind(link.id, link.req_code ?? null, link.sprint ?? null, link.title, link.status)
          .run();
      }

      return { synced: links.length };
    } catch {
      return { synced: 0 };
    }
  }

  // ─── syncFromGitHub ───────────────────────────────────────────────────────

  /** GitHub API PR 목록 → sprint_pr_links D1 upsert */
  async syncFromGitHub(): Promise<{ synced: number }> {
    try {
      const repo = this.env.GITHUB_REPO || "KTDS-AXBD/Foundry-X";
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
      };
      if (this.env.GITHUB_TOKEN) {
        headers.Authorization = `token ${this.env.GITHUB_TOKEN}`;
      }

      const res = await fetch(
        `https://api.github.com/repos/${repo}/pulls?state=all&per_page=50&sort=updated`,
        { headers },
      );
      if (!res.ok) return { synced: 0 };

      const prs = (await res.json()) as Array<{
        number: number;
        title: string;
        body: string;
        head: { ref: string };
        html_url: string;
        state: string;
      }>;

      const links = this.parsePrLinks(prs);

      for (const link of links) {
        await this.env.DB
          .prepare(`
            INSERT INTO sprint_pr_links (id, sprint_num, pr_number, f_items, branch, pr_title, pr_url, pr_state, commit_shas, synced_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
              sprint_num  = excluded.sprint_num,
              f_items     = excluded.f_items,
              pr_title    = excluded.pr_title,
              pr_url      = excluded.pr_url,
              pr_state    = excluded.pr_state,
              synced_at   = excluded.synced_at
          `)
          .bind(
            link.id,
            link.sprint_num,
            link.pr_number,
            JSON.stringify(link.f_items),
            link.branch ?? null,
            link.pr_title ?? null,
            link.pr_url ?? null,
            link.pr_state,
            JSON.stringify(link.commit_shas),
          )
          .run();
      }

      return { synced: links.length };
    } catch {
      return { synced: 0 };
    }
  }

  // ─── getTraceChain ────────────────────────────────────────────────────────

  /** REQ 또는 F-item id → TraceChain */
  async getTraceChain(id: string): Promise<TraceChain | null> {
    const isReq = id.startsWith("FX-REQ-");

    let fItems: Array<{ id: string; req_code?: string; sprint?: string; title: string; status: string }> = [];

    if (isReq) {
      const rows = await this.env.DB
        .prepare("SELECT id, req_code, sprint, title, status FROM spec_traceability WHERE req_code = ?")
        .bind(id)
        .all<{ id: string; req_code?: string; sprint?: string; title: string; status: string }>();
      fItems = rows.results;
    } else {
      const row = await this.env.DB
        .prepare("SELECT id, req_code, sprint, title, status FROM spec_traceability WHERE id = ?")
        .bind(id)
        .first<{ id: string; req_code?: string; sprint?: string; title: string; status: string }>();
      if (row) fItems = [row];
    }

    if (fItems.length === 0) return null;

    // 각 F-item에 대해 PR 연결 조회
    const enriched = await Promise.all(
      fItems.map(async (fi) => {
        const prRows = await this.env.DB
          .prepare(`
            SELECT pr_number, pr_title, pr_url, pr_state, commit_shas
            FROM sprint_pr_links
            WHERE f_items LIKE ?
          `)
          .bind(`%${fi.id}%`)
          .all<{ pr_number: number; pr_title?: string; pr_url?: string; pr_state: string; commit_shas: string }>();

        const prs = prRows.results.map(pr => ({
          number: pr.pr_number,
          title: pr.pr_title ?? "",
          url: pr.pr_url ?? "",
          state: pr.pr_state,
          commits: JSON.parse(pr.commit_shas || "[]") as string[],
        }));

        return {
          id: fi.id,
          title: fi.title,
          status: fi.status,
          sprint: fi.sprint,
          req_code: fi.req_code,
          prs,
        };
      })
    );

    return {
      id,
      type: isReq ? "req" : "f_item",
      f_items: enriched,
    };
  }
}
