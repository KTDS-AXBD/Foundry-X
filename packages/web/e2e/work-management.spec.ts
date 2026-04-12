import { test, expect } from "./fixtures/auth";

// @service: portal
// @sprint: 261, 262, 265, 267
// @tagged-by: F509, F510, F514
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

const MOCK_ROADMAP = {
  content: "## 3. Mid-term (Phase 37~38)\n\n| 후보 | 방향 |\n|------|------|\n| 웹 대시보드 관리 기능 | F-item 상태 전이 |\n| 에이전트 자율 운영 강화 | autopilot Gap% E2E 측정 확장 |\n",
  generated_at: "2026-04-12T11:00:00Z",
};

const MOCK_CHANGELOG = {
  content: "# Changelog\n\n## [Unreleased]\n\n### Added\n- Roadmap 뷰 추가\n- Changelog 웹 뷰 추가\n\n## [Phase 32] - 2026-04-11\n\n### Added\n- F501: GitHub Projects Board\n",
  generated_at: "2026-04-12T11:00:00Z",
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
  await page.route("**/api/work/roadmap", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_ROADMAP),
    }),
  );
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
    // Future plans from ROADMAP.md
    await expect(page.getByText("향후 계획")).toBeVisible();
    await expect(page.getByText(/웹 대시보드 관리 기능/)).toBeVisible();
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

    // C45: 사용 방법 안내 표시 확인
    await expect(page.getByText("사용 방법")).toBeVisible();

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

  test("5 tabs are visible and switchable", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    // All 5 tab buttons visible
    await expect(page.getByRole("button", { name: "작업 현황" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Roadmap" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Backlog" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Changelog" })).toBeVisible();
    await expect(page.getByRole("button", { name: "작업 분류" })).toBeVisible();

    // Old tabs should NOT exist
    await expect(page.getByRole("button", { name: "Context Resume" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Sessions" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Pipeline" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Velocity" })).not.toBeVisible();
  });
});
