// F517: 메타데이터 트레이서빌리티 — TDD Red/Green
import { describe, it, expect, beforeEach } from "vitest";
import { TraceabilityService } from "../services/traceability.service.js";
import { createTestEnv } from "./helpers/test-app.js";
import { app } from "../app.js";
import { createAuthHeaders } from "./helpers/test-app.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SPEC_FIXTURE = `
## §5 Feature Roadmap

| F515 | Backlog 인입 파이프라인 웹 (FX-REQ-543, P0) | Sprint 272 | ✅ | |
| F517 | 메타데이터 트레이서빌리티 (FX-REQ-545, P0) | Sprint 274 | 🔧(design) | C47 승격 |
| F518 | Work Ontology (FX-REQ-546, P0) | Sprint 275 | 📋(plan) | |
`;

const PR_FIXTURE = [
  {
    number: 538,
    title: "feat: F516 Backlog 인입 파이프라인 (Sprint 273)",
    body: "## Sprint 273\n### F-items\nF516\n\n---",
    head: { ref: "sprint/273" },
    html_url: "https://github.com/KTDS-AXBD/Foundry-X/pull/538",
    state: "closed",
  },
  {
    number: 539,
    title: "feat: Sprint 274 — F517",
    body: "Implements F517 traceability",
    head: { ref: "sprint/274" },
    html_url: "https://github.com/KTDS-AXBD/Foundry-X/pull/539",
    state: "open",
  },
  {
    number: 540,
    title: "chore: no f-item reference",
    body: "just housekeeping",
    head: { ref: "fix/typo" },
    html_url: "https://github.com/KTDS-AXBD/Foundry-X/pull/540",
    state: "open",
  },
];

const CHANGELOG_FIXTURE = `
## [Phase 37] Work Lifecycle Platform

- F516: Backlog 인입 파이프라인 + 실시간 동기화
- F517: 메타데이터 트레이서빌리티

## [Phase 36] Task Orchestrator

- F512: 문서 체계 정비
`;

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe("TraceabilityService F517", () => {
  let svc: TraceabilityService;
  let env: ReturnType<typeof createTestEnv>;

  beforeEach(() => {
    env = createTestEnv();
    svc = new TraceabilityService(env as any);
  });

  // ─── parseFItemLinks ───────────────────────────────────────────────────────

  describe("parseFItemLinks", () => {
    it("SPEC fixture에서 F-item 3건 추출", () => {
      const links = svc.parseFItemLinks(SPEC_FIXTURE);
      expect(links).toHaveLength(3);
    });

    it("req_code 추출 정확 — FX-REQ-545", () => {
      const links = svc.parseFItemLinks(SPEC_FIXTURE);
      const f517 = links.find(l => l.id === "F517");
      expect(f517).toBeDefined();
      expect(f517!.req_code).toBe("FX-REQ-545");
    });

    it("sprint 번호 추출 — 274", () => {
      const links = svc.parseFItemLinks(SPEC_FIXTURE);
      const f517 = links.find(l => l.id === "F517");
      expect(f517!.sprint).toBe("274");
    });

    it("status 추출 — 🔧 → in_progress", () => {
      const links = svc.parseFItemLinks(SPEC_FIXTURE);
      const f517 = links.find(l => l.id === "F517");
      expect(f517!.status).toBe("in_progress");
    });

    it("status 추출 — ✅ → done", () => {
      const links = svc.parseFItemLinks(SPEC_FIXTURE);
      const f515 = links.find(l => l.id === "F515");
      expect(f515!.status).toBe("done");
    });

    it("빈 텍스트 → 빈 배열", () => {
      expect(svc.parseFItemLinks("")).toHaveLength(0);
    });
  });

  // ─── parsePrLinks ─────────────────────────────────────────────────────────

  describe("parsePrLinks", () => {
    it("PR 3건 중 F번호 있는 2건만 반환", () => {
      const links = svc.parsePrLinks(PR_FIXTURE);
      expect(links).toHaveLength(2);
    });

    it("PR body에서 F516 추출", () => {
      const links = svc.parsePrLinks(PR_FIXTURE);
      const pr538 = links.find(l => l.pr_number === 538);
      expect(pr538!.f_items).toContain("F516");
    });

    it("PR title에서 F517 추출 (body fallback)", () => {
      const links = svc.parsePrLinks(PR_FIXTURE);
      const pr539 = links.find(l => l.pr_number === 539);
      expect(pr539!.f_items).toContain("F517");
    });

    it("branch sprint/273 → sprint_num 273", () => {
      const links = svc.parsePrLinks(PR_FIXTURE);
      const pr538 = links.find(l => l.pr_number === 538);
      expect(pr538!.sprint_num).toBe("273");
    });

    it("F번호 없는 PR(540) → 제외", () => {
      const links = svc.parsePrLinks(PR_FIXTURE);
      expect(links.find(l => l.pr_number === 540)).toBeUndefined();
    });
  });

  // ─── enrichChangelog ──────────────────────────────────────────────────────

  describe("enrichChangelog", () => {
    beforeEach(async () => {
      // seed D1 with F517 data
      await env.DB.prepare(
        "INSERT INTO spec_traceability (id, req_code, sprint, title, status) VALUES (?, ?, ?, ?, ?)"
      ).bind("F517", "FX-REQ-545", "274", "메타데이터 트레이서빌리티", "in_progress").run();
      await env.DB.prepare(
        "INSERT INTO sprint_pr_links (id, sprint_num, pr_number, f_items, pr_state) VALUES (?, ?, ?, ?, ?)"
      ).bind("sprint-274-pr-539", "274", 539, JSON.stringify(["F517"]), "open").run();
    });

    it("Changelog 항목 파싱 — Phase 37: 2개 항목", async () => {
      const entries = await svc.enrichChangelog(CHANGELOG_FIXTURE);
      const phase37 = entries.find(e => e.phase === "Phase 37");
      expect(phase37).toBeDefined();
      expect(phase37!.items).toHaveLength(2);
    });

    it("F517 항목에 req_code 태깅", async () => {
      const entries = await svc.enrichChangelog(CHANGELOG_FIXTURE);
      const phase37 = entries.find(e => e.phase === "Phase 37")!;
      const f517item = phase37.items.find(i => i.f_item === "F517");
      expect(f517item!.req_code).toBe("FX-REQ-545");
    });

    it("F517 항목에 sprint 태깅", async () => {
      const entries = await svc.enrichChangelog(CHANGELOG_FIXTURE);
      const phase37 = entries.find(e => e.phase === "Phase 37")!;
      const f517item = phase37.items.find(i => i.f_item === "F517");
      expect(f517item!.sprint).toBe("274");
    });

    it("F517 항목에 pr_number 태깅", async () => {
      const entries = await svc.enrichChangelog(CHANGELOG_FIXTURE);
      const phase37 = entries.find(e => e.phase === "Phase 37")!;
      const f517item = phase37.items.find(i => i.f_item === "F517");
      expect(f517item!.pr_number).toBe(539);
    });
  });
});

// ─── API Route Tests ──────────────────────────────────────────────────────────

describe("GET /api/work/trace F517", () => {
  let env: ReturnType<typeof createTestEnv>;
  let headers: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    headers = {
      ...(await createAuthHeaders()),
    };
    // seed D1
    await env.DB.prepare(
      "INSERT INTO spec_traceability (id, req_code, sprint, title, status) VALUES (?, ?, ?, ?, ?)"
    ).bind("F517", "FX-REQ-545", "274", "메타데이터 트레이서빌리티", "in_progress").run();
    await env.DB.prepare(
      "INSERT INTO sprint_pr_links (id, sprint_num, pr_number, f_items, pr_title, pr_url, pr_state) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind("sprint-274-pr-539", "274", 539, JSON.stringify(["F517"]), "feat: Sprint 274 — F517", "https://github.com/KTDS-AXBD/Foundry-X/pull/539", "open").run();
  });

  it("REQ id로 조회 → 200 + TraceChain", async () => {
    const res = await app.request(
      "/api/work/trace?id=FX-REQ-545",
      { method: "GET", headers },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.id).toBe("FX-REQ-545");
    expect(data.type).toBe("req");
    expect(data.f_items).toHaveLength(1);
    expect(data.f_items[0].id).toBe("F517");
  });

  it("F-item id로 조회 → 200 + TraceChain", async () => {
    const res = await app.request(
      "/api/work/trace?id=F517",
      { method: "GET", headers },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.id).toBe("F517");
    expect(data.type).toBe("f_item");
    expect(data.f_items[0].prs).toHaveLength(1);
    expect(data.f_items[0].prs[0].number).toBe(539);
  });

  it("존재하지 않는 id → 404", async () => {
    const res = await app.request(
      "/api/work/trace?id=FX-REQ-9999",
      { method: "GET", headers },
      env,
    );
    expect(res.status).toBe(404);
  });
});

describe("POST /api/work/trace/sync F517", () => {
  let env: ReturnType<typeof createTestEnv>;
  let headers: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    headers = {
      ...(await createAuthHeaders()),
      "Content-Type": "application/json",
    };
  });

  it("sync 성공 → 200 + synced counts", async () => {
    const res = await app.request(
      "/api/work/trace/sync",
      { method: "POST", headers },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.synced).toBeDefined();
    expect(typeof data.synced.spec).toBe("number");
    expect(typeof data.synced.prs).toBe("number");
  });
});
