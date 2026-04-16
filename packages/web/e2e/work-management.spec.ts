import { test, expect } from "./fixtures/auth";

// @service: portal
// @sprint: 261, 262, 265, 267, 273, 274
// @tagged-by: F509, F510, F514, F516, F517
// @spec: docs/specs/fx-work-observability/prd-v1.md §5.2.1 (End-to-end 시나리오 S1)

// ─── Mock payloads ───────────────────────────────────────────────────────────

const MOCK_SNAPSHOT = {
  summary: { backlog: 1, planned: 2, in_progress: 1, done_today: 3 },
  items: [
    { id: "F509", title: "fx-work-observability Walking Skeleton", status: "done",        sprint: "261", priority: "P0", req_code: "FX-REQ-526" },
    { id: "F999", title: "임의 PLANNED 작업 예시",                    status: "planned",     sprint: "262", priority: "P1", req_code: "FX-REQ-900" },
    { id: "F998", title: "임의 IN PROGRESS 작업",                      status: "in_progress", sprint: "261", priority: "P0", req_code: "FX-REQ-899" },
    { id: "F997", title: "임의 BACKLOG 작업",                          status: "backlog",                   priority: "P2", req_code: "FX-REQ-898" },
  ],
  prs: [
    { number: 503, title: "Sprint 261 — F509", state: "merged", url: "https://github.com/test/foo/pull/503", created_at: "2026-04-12T02:11:00Z" },
  ],
  commits: [],
  generated_at: "2026-04-12T11:00:00Z",
};

const MOCK_CLASSIFY = {
  track: "F" as const,
  priority: "P1" as const,
  title: "작업 관찰성 view에 burndown chart 추가",
  req_code: "FX-REQ-901",
  method: "llm" as const,
};

const MOCK_PHASE_PROGRESS = {
  phases: [
    { id: 33, name: "Phase 33", total: 1, done: 1, in_progress: 0, pct: 100 },
    { id: 36, name: "Phase 36", total: 4, done: 2, in_progress: 1, pct: 50 },
  ],
  current_phase: 36,
  generated_at: "2026-04-12T11:00:00Z",
};

const MOCK_BACKLOG_HEALTH = {
  total_backlog: 5,
  stale_items: [
    { id: "F112", title: "장기 백로그 항목 A", age_sprints: 15 },
  ],
  health_score: 75,
  warnings: ["장기 대기 항목 1개 검토 필요"],
  generated_at: "2026-04-12T11:00:00Z",
};

const MOCK_CHANGELOG = {
  content: "# Changelog\n\n## [Unreleased]\n\n### Added\n- Roadmap 뷰 추가\n- Changelog 웹 뷰 추가\n\n## [Phase 32] - 2026-04-11\n\n### Added\n- F501: GitHub Projects Board\n",
  generated_at: "2026-04-12T11:00:00Z",
};

// F516: Submit mock
const MOCK_SUBMIT_RESULT = {
  id: "BL-001",
  track: "F",
  priority: "P1",
  title: "대시보드에 번다운 차트 추가",
  classify_method: "llm",
  github_issue_number: 542,
  spec_row_added: true,
  status: "registered",
};

// F517: Trace mock
const MOCK_TRACE_CHAIN = {
  id: "FX-REQ-544",
  type: "req",
  label: "FX-REQ-544",
  f_items: [
    { id: "F516", title: "Backlog 인입 파이프라인", status: "done", sprint: "273", req_code: "FX-REQ-544", prs: [{ number: 538, title: "feat: F516 Backlog 인입", url: "https://github.com/test/foo/pull/538", state: "merged", commits: [] }] },
  ],
  sprints: [{ number: 273, branch: "sprint/273" }],
  commits: [],
};

// ─── Common setup — mock all /api/work/* endpoints ───────────────────────────

async function mockWorkApi(page: import("@playwright/test").Page) {
  await page.route("**/api/work/snapshot", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SNAPSHOT),
    }),
  );
  await page.route("**/api/work/classify", (route) => {
    if (route.request().method() !== "POST") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_CLASSIFY),
    });
  });
  await page.route("**/api/work/phase-progress", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_PHASE_PROGRESS),
    }),
  );
  await page.route("**/api/work/backlog-health", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_BACKLOG_HEALTH),
    }),
  );
  await page.route("**/api/work/changelog", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_CHANGELOG),
    }),
  );
  await page.route("**/api/work/submit", (route) => {
    if (route.request().method() !== "POST") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SUBMIT_RESULT),
    });
  });
  await page.route("**/api/work/trace?*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_TRACE_CHAIN),
    }),
  );
  await page.route("**/api/work/trace/sync", (route) => {
    if (route.request().method() !== "POST") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ synced: { spec: 15, prs: 8 } }),
    });
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Work Management (F509 Walking Skeleton)", () => {
  test("route renders heading and Foundry-X label", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await expect(page.getByRole("heading", { name: "작업 현황" })).toBeVisible();
    await expect(page.getByRole("main").getByText("Foundry-X")).toBeVisible();
  });

  test("kanban tab renders 4 columns with mocked items", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    // 4 column headers
    await expect(page.getByText("PLANNED", { exact: true })).toBeVisible();
    await expect(page.getByText("IN PROGRESS", { exact: true })).toBeVisible();
    await expect(page.getByText("DONE", { exact: true })).toBeVisible();
    await expect(page.getByText("BACKLOG", { exact: true })).toBeVisible();

    // Mock items
    await expect(page.getByText(/F509/).first()).toBeVisible();
    await expect(page.getByText("FX-REQ-526", { exact: true })).toBeVisible();
    await expect(page.getByText("fx-work-observability Walking Skeleton")).toBeVisible();
  });

  test("snapshot API is polled on mount and shows recent PR", async ({ authenticatedPage: page }) => {
    let snapshotCalls = 0;
    await page.route("**/api/work/snapshot", (route) => {
      snapshotCalls += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SNAPSHOT),
      });
    });

    await page.goto("/work-management");

    await expect(page.getByRole("heading", { name: "작업 현황" })).toBeVisible();
    await expect(page.getByText("Recent PRs")).toBeVisible();
    await expect(page.getByText("Sprint 261 — F509")).toBeVisible();

    expect(snapshotCalls).toBeGreaterThanOrEqual(1);
  });

  test("API error shows fallback UI with retry button", async ({ authenticatedPage: page }) => {
    await page.route("**/api/work/snapshot", (route) =>
      route.fulfill({ status: 500, body: "Internal Server Error" }),
    );
    await page.goto("/work-management");
    await expect(page.getByText("데이터를 불러올 수 없어요")).toBeVisible();
    await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
  });

  // ─── Roadmap Tab ──────────────────────────────────────────────────────────

  test("roadmap tab — shows phase timeline with active and completed sections", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await page.getByRole("button", { name: "Roadmap" }).click();

    // Current phase indicator
    await expect(page.getByText(/Phase 36 active/)).toBeVisible();
    // Active section — Phase 36 from MOCK_PHASE_PROGRESS (pct: 50)
    await expect(page.getByText("진행 중")).toBeVisible();
    await expect(page.getByText(/2\/4/)).toBeVisible();
    // Completed section — Phase 33 (pct: 100)
    await expect(page.getByText(/완료/)).toBeVisible();
  });

  // ─── Changelog Tab ────────────────────────────────────────────────────────

  test("changelog tab — renders sections from CHANGELOG.md", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await page.getByRole("button", { name: "Changelog" }).click();

    // Unreleased section with NEXT badge
    await expect(page.getByText("NEXT")).toBeVisible();
    await expect(page.getByText("[Unreleased]")).toBeVisible();
    // Content from mock changelog
    await expect(page.getByText(/Roadmap 뷰 추가/)).toBeVisible();
    // Phase 32 section
    await expect(page.getByText(/Phase 32/)).toBeVisible();
    await expect(page.getByText(/GitHub Projects Board/)).toBeVisible();
  });

  // ─── Backlog Tab ──────────────────────────────────────────────────────────

  test("backlog tab — shows health score and warnings", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await page.getByRole("button", { name: "Backlog" }).click();

    // total_backlog: 5 from MOCK_BACKLOG_HEALTH
    await expect(page.getByText(/5/).first()).toBeVisible();
    // warning
    await expect(page.getByText(/장기 대기 항목/)).toBeVisible();
    // stale item
    await expect(page.getByText(/F112/)).toBeVisible();
  });

  // ─── Classify Tab ─────────────────────────────────────────────────────────

  test("classify flow — 자연어 → track/priority/title", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await page.getByRole("button", { name: "작업 분류" }).click();

    const textarea = page.getByPlaceholder("예: 작업 관찰성 view에 burndown chart 추가 필요");
    await expect(textarea).toBeVisible();
    await textarea.fill("작업 관찰성 view에 burndown chart 추가 필요");

    const classifyBtn = page.getByRole("button", { name: "분류하기" });
    await expect(classifyBtn).toBeEnabled();
    await classifyBtn.click();

    await expect(page.getByText("작업 관찰성 view에 burndown chart 추가", { exact: true })).toBeVisible();
    await expect(page.getByText("FX-REQ-901")).toBeVisible();
    await expect(page.getByText("AI", { exact: true })).toBeVisible();
  });

  // ─── Tab Navigation ───────────────────────────────────────────────────────

  test("7 tabs are visible and switchable", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    // All 7 tab buttons visible (5 original + F516 아이디어 제출 + F517 추적)
    await expect(page.getByRole("button", { name: "작업 현황" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Roadmap" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Backlog" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Changelog" })).toBeVisible();
    await expect(page.getByRole("button", { name: "작업 분류" })).toBeVisible();
    await expect(page.getByRole("button", { name: "아이디어 제출" })).toBeVisible();
    await expect(page.getByRole("button", { name: "추적" })).toBeVisible();

    // Old tabs should NOT exist
    await expect(page.getByRole("button", { name: "Context Resume" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Sessions" })).not.toBeVisible();
  });

  // ─── Submit Tab (F516) ──────────────────────────────────────────────────────

  test("submit tab — 아이디어 제출 폼 입력→AI 분류→결과 표시", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await page.getByRole("button", { name: "아이디어 제출" }).click();

    // 폼이 보이는지 확인
    await expect(page.getByText("아이디어 / 피드백 제출")).toBeVisible();

    // 제목 입력
    const titleInput = page.getByPlaceholder("예: 웹에서 바로 아이디어를 제출할 수 없어요");
    await titleInput.fill("대시보드에 번다운 차트 추가");

    // 설명 입력
    const descInput = page.getByPlaceholder("어떤 문제인지, 어떤 기능을 원하는지 설명해 주세요");
    await descInput.fill("Sprint별 완료율을 시각화하면 좋겠어요");

    // 제출
    await page.getByRole("button", { name: "제출하기" }).click();

    // 결과 표시 확인
    await expect(page.getByText("등록 완료")).toBeVisible();
    await expect(page.getByText("BL-001")).toBeVisible();
    await expect(page.getByText("AI 분류")).toBeVisible();
  });

  test("submit tab — 제목 없이 제출 버튼 비활성화", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await page.getByRole("button", { name: "아이디어 제출" }).click();

    const submitBtn = page.getByRole("button", { name: "제출하기" });
    await expect(submitBtn).toBeDisabled();
  });

  // ─── Trace Tab (F517) ───────────────────────────────────────────────────────

  test("trace tab — REQ 검색→체인 시각화", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await page.getByRole("button", { name: "추적" }).click();

    // 검색 입력
    const searchInput = page.getByPlaceholder("FX-REQ-545 또는 F517");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("FX-REQ-544");

    // 검색 실행
    await page.getByRole("button", { name: "조회" }).click();

    // 체인 결과 확인 — F-item ID (PR 제목에도 F516 포함되므로 exact match)
    await expect(page.getByText("F516", { exact: true })).toBeVisible();
    await expect(page.getByText("Backlog 인입 파이프라인")).toBeVisible();
    // PR 연결 정보
    await expect(page.getByText("#538", { exact: true })).toBeVisible();
  });

  test("trace tab — 동기화 버튼 동작", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await page.getByRole("button", { name: "추적" }).click();

    // 동기화 버튼
    const syncBtn = page.getByRole("button", { name: /동기화/ });
    await expect(syncBtn).toBeVisible();
    await syncBtn.click();

    // 동기화 결과 메시지
    await expect(page.getByText(/동기화 완료/)).toBeVisible();
    await expect(page.getByText(/SPEC: 15건/)).toBeVisible();
  });

  // ─── F552: AI 검증 탭 (Sprint 303) ──────────────────────────────────────────

  test("8 tabs visible including AI 검증", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await expect(page.getByRole("button", { name: "작업 현황" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Roadmap" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Backlog" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Changelog" })).toBeVisible();
    await expect(page.getByRole("button", { name: "작업 분류" })).toBeVisible();
    await expect(page.getByRole("button", { name: "아이디어 제출" })).toBeVisible();
    await expect(page.getByRole("button", { name: "추적" })).toBeVisible();
    await expect(page.getByRole("button", { name: "AI 검증" })).toBeVisible();
  });

  test("AI 검증 tab — empty state shows guidance message", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    // Mock empty stats
    await page.route("**/api/verification/dual-reviews/stats", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total: 0,
          concordance_rate: 0,
          block_rate: 0,
          degraded_rate: 0,
          block_reasons: [],
          recent_reviews: [],
        }),
      }),
    );
    await page.goto("/work-management");

    await page.getByRole("button", { name: "AI 검증" }).click();

    // Empty state guidance
    await expect(page.getByText(/아직 Dual AI Review 데이터가 없어요/)).toBeVisible();
    await expect(page.getByText(/Sprint autopilot Phase 5c/)).toBeVisible();
  });

  test("AI 검증 tab — renders summary cards and review table with data", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    // Mock stats with data
    await page.route("**/api/verification/dual-reviews/stats", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total: 4,
          concordance_rate: 75,
          block_rate: 25,
          degraded_rate: 25,
          block_reasons: [
            { reason: "Missing null check", count: 3 },
            { reason: "SQL injection risk", count: 1 },
          ],
          recent_reviews: [
            { sprint_id: 303, claude_verdict: "PASS", codex_verdict: "PASS", decision: "PASS", divergence_score: 0.0, degraded: false, created_at: "2026-04-16T12:00:00Z" },
            { sprint_id: 302, claude_verdict: "PASS", codex_verdict: "BLOCK", decision: "BLOCK", divergence_score: 0.6, degraded: false, created_at: "2026-04-16T11:00:00Z" },
            { sprint_id: 301, claude_verdict: null, codex_verdict: "PASS-degraded", decision: "PASS-degraded", divergence_score: 0.0, degraded: true, created_at: "2026-04-16T10:00:00Z" },
          ],
        }),
      }),
    );
    await page.goto("/work-management");

    await page.getByRole("button", { name: "AI 검증" }).click();

    // Summary cards
    await expect(page.getByText("총 리뷰")).toBeVisible();
    await expect(page.getByText("75%")).toBeVisible();   // concordance_rate
    await expect(page.getByText("25%").first()).toBeVisible(); // block_rate or degraded_rate

    // Review table header
    await expect(page.getByText("최근 Sprint 리뷰")).toBeVisible();

    // Sprint rows
    await expect(page.getByText("#303")).toBeVisible();
    await expect(page.getByText("#302")).toBeVisible();

    // BLOCK reasons section
    await expect(page.getByText("BLOCK 사유 Top 5")).toBeVisible();
    await expect(page.getByText("Missing null check")).toBeVisible();
  });
});
