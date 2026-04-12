import { test, expect } from "./fixtures/auth";

// @service: portal
// @sprint: 261, 262
// @tagged-by: F509, F510
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

const MOCK_CONTEXT = {
  recent_commits: [
    { sha: "e942b87d", message: "feat: Sprint 261 — F509", date: "2026-04-12T02:11:00Z", author: "AX BD팀" },
  ],
  worktrees: [],
  daemon_events: [],
  next_actions: ["Sprint 261 F509 post-merge 검증", "fx.minu.best /work-management 실물 확인"],
  note: "test-only mock context",
};

const MOCK_SESSIONS = {
  sessions: [
    {
      id: "sprint-262", name: "sprint-262", status: "busy", profile: "coder",
      worktree: "/home/sinclair/work/worktrees/Foundry-X/sprint-262",
      branch: "sprint/262", windows: 2, last_activity: "2026-04-12T10:00:00Z",
      collected_at: "2026-04-12T10:00:00Z",
    },
    {
      id: "sprint-261", name: "sprint-261", status: "idle", profile: "reviewer",
      branch: "sprint/261", windows: 1, last_activity: "2026-04-12T09:30:00Z",
      collected_at: "2026-04-12T10:00:00Z",
    },
  ],
  worktrees: [
    { path: "/home/sinclair/work/worktrees/Foundry-X/sprint-262", branch: "sprint/262" },
  ],
  last_sync: "2026-04-12T10:00:00Z",
};

const MOCK_CLASSIFY = {
  track: "F" as const,
  priority: "P1" as const,
  title: "작업 관찰성 view에 burndown chart 추가",
  req_code: "FX-REQ-901",
  method: "llm" as const,
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
  await page.route("**/api/work/context", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_CONTEXT),
    }),
  );
  await page.route("**/api/work/sessions", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SESSIONS),
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
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Work Management (F509 Walking Skeleton)", () => {
  test("route renders heading + phase tag", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await expect(page.getByRole("heading", { name: "Work Management" })).toBeVisible();
    await expect(page.getByText("F509 · Phase 33")).toBeVisible();
  });

  test("kanban tab renders 4 columns with mocked items", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    // 4 column headers (대문자, 코드에서 label로 정의)
    await expect(page.getByText("PLANNED", { exact: true })).toBeVisible();
    await expect(page.getByText("IN PROGRESS", { exact: true })).toBeVisible();
    await expect(page.getByText("DONE", { exact: true })).toBeVisible();
    await expect(page.getByText("BACKLOG", { exact: true })).toBeVisible();

    // Mock 데이터가 올바른 컬럼에 들어갔는지
    // 주의: ItemCard의 id div는 "F509 #261" 형태(sprint span 병합)라 exact:true 불가
    await expect(page.getByText(/F509/).first()).toBeVisible();
    await expect(page.getByText("FX-REQ-526", { exact: true })).toBeVisible();
    // 아이템 타이틀도 검증
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
    await page.route("**/api/work/context", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CONTEXT) }),
    );

    await page.goto("/work-management");

    // Kanban 헤더가 나와야 첫 fetch 완료된 것
    await expect(page.getByRole("heading", { name: "Work Management" })).toBeVisible();
    await expect(page.getByText("Recent PRs")).toBeVisible();
    await expect(page.getByText("Sprint 261 — F509")).toBeVisible();

    expect(snapshotCalls).toBeGreaterThanOrEqual(1);
  });

  test("tab switching — Context Resume shows next_actions", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await page.getByRole("button", { name: "Context Resume" }).click();

    await expect(page.getByText("다음 가능 Action")).toBeVisible();
    await expect(page.getByText("Sprint 261 F509 post-merge 검증")).toBeVisible();
    await expect(page.getByText("fx.minu.best /work-management 실물 확인")).toBeVisible();
  });

  test("sessions tab — renders session cards and worktrees (F510 M4)", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await page.getByRole("button", { name: "Sessions" }).click();

    // Status summary bar
    await expect(page.getByText("Busy", { exact: true })).toBeVisible();
    await expect(page.getByText("Idle", { exact: true })).toBeVisible();

    // Session cards (sprint-262 appears in both card and worktree path, use .first())
    await expect(page.getByText("sprint-262").first()).toBeVisible();
    await expect(page.getByText("sprint-261")).toBeVisible();

    // Profile badges
    await expect(page.getByText("coder", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("reviewer", { exact: true }).first()).toBeVisible();

    // Worktrees section (sprint/262 appears in session card branch + worktree list)
    await expect(page.getByText("Worktrees (1)")).toBeVisible();
    await expect(page.getByText("sprint/262").first()).toBeVisible();
  });

  test("classify flow — PRD §5.2.1 S1 step 2 (자연어 → track/priority/title)", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await page.getByRole("button", { name: "Classify" }).click();

    // Textarea 입력
    const textarea = page.getByPlaceholder("예: 작업 관찰성 view에 burndown chart 추가 필요");
    await expect(textarea).toBeVisible();
    await textarea.fill("작업 관찰성 view에 burndown chart 추가 필요");

    // 분류 버튼 활성화 확인 후 클릭
    const classifyBtn = page.getByRole("button", { name: /분류/ });
    await expect(classifyBtn).toBeEnabled();
    await classifyBtn.click();

    // Mock 응답 검증 — Badge들과 타이틀
    await expect(page.getByText("작업 관찰성 view에 burndown chart 추가", { exact: true })).toBeVisible();
    await expect(page.getByText("FX-REQ-901")).toBeVisible();
    // 'F' track Badge — 짧은 텍스트라 여러 곳 매칭 가능하니 classify 결과 영역으로 스코프 제한 가능하지만
    // mock method="llm"이라 "AI" Badge가 나타나는지로 대체 검증
    await expect(page.getByText("AI", { exact: true })).toBeVisible();
  });
});
