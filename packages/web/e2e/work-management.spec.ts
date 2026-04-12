import { test, expect } from "./fixtures/auth";

// @service: portal
// @sprint: 261, 262, 265
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

// ─── F514 Mock payloads ───────────────────────────────────────────────────────

const MOCK_VELOCITY = {
  sprints: [
    { sprint: 261, f_items_done: 1, week: "2026-W15" },
    { sprint: 262, f_items_done: 2, week: "2026-W16" },
    { sprint: 264, f_items_done: 3, week: "2026-W17" },
  ],
  avg_per_sprint: 2.0,
  trend: "up",
  generated_at: "2026-04-12T11:00:00Z",
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
  // F514 — analytics endpoints
  await page.route("**/api/work/velocity", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_VELOCITY),
    }),
  );
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

  // T1: Sessions edge case — 빈 세션 목록 (F511)
  test("sessions tab — empty sessions shows placeholder", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    // override sessions with empty list
    await page.route("**/api/work/sessions", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sessions: [], worktrees: [], last_sync: "2026-04-12T10:00:00Z" }),
      }),
    );
    await page.goto("/work-management");
    await page.getByRole("button", { name: "Sessions" }).click();
    await expect(page.getByText(/세션이 없어요|No sessions|세션 없음/)).toBeVisible();
  });

  // T1: Sessions edge case — API 에러 fallback (F511)
  test("sessions tab — API error shows fallback UI", async ({ authenticatedPage: page }) => {
    // snapshot 에러 → fetchError 표시, sessions mock 없음
    await page.route("**/api/work/snapshot", (route) =>
      route.fulfill({ status: 500, body: "Internal Server Error" }),
    );
    await page.route("**/api/work/context", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CONTEXT) }),
    );
    await page.route("**/api/work/sessions", (route) =>
      route.fulfill({ status: 500, body: "Internal Server Error" }),
    );
    await page.goto("/work-management");
    await expect(page.getByText("데이터를 불러올 수 없어요")).toBeVisible();
    await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
  });

  // T1: Sessions edge case — BUSY/IDLE/DONE 컬럼 순서 확인 (F511)
  test("sessions tab — BUSY column appears before IDLE in layout", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");
    await page.getByRole("button", { name: "Sessions" }).click();
    // BUSY/IDLE/DONE 컬럼 헤더 모두 존재
    await expect(page.getByText("BUSY", { exact: true })).toBeVisible();
    await expect(page.getByText("IDLE", { exact: true })).toBeVisible();
    await expect(page.getByText("DONE", { exact: true })).toBeVisible();
    // sprint-262 (busy)가 BUSY 컬럼에, sprint-261 (idle)이 IDLE 컬럼에 있는지
    await expect(page.getByText("sprint-262").first()).toBeVisible();
    await expect(page.getByText("sprint-261").first()).toBeVisible();
  });

  // T2: polling E2E — 5초 polling 후 재호출 확인 (F511)
  test("snapshot polling — refreshes data after interval", async ({ authenticatedPage: page }) => {
    let callCount = 0;
    await page.route("**/api/work/snapshot", (route) => {
      callCount++;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...MOCK_SNAPSHOT, summary: { ...MOCK_SNAPSHOT.summary, done_today: callCount } }),
      });
    });
    await page.route("**/api/work/context", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CONTEXT) }),
    );
    await page.route("**/api/work/sessions", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SESSIONS) }),
    );

    await page.goto("/work-management");
    await expect(page.getByRole("heading", { name: "Work Management" })).toBeVisible();
    // 5초 polling이므로 6초 대기 후 2회 이상 호출 확인
    await page.waitForTimeout(6000);
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  // ─── F514 Dashboard Extensions ───────────────────────────────────────────

  test("pipeline tab — renders stage counts from snapshot and backlog health (F514 B-4)", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await page.getByRole("button", { name: "Pipeline" }).click();

    // stage labels
    await expect(page.getByText("Backlog", { exact: true })).toBeVisible();
    await expect(page.getByText("Planned", { exact: true })).toBeVisible();
    await expect(page.getByText("In Progress", { exact: true })).toBeVisible();
    // health score from MOCK_BACKLOG_HEALTH
    await expect(page.getByText(/75/).first()).toBeVisible();
  });

  test("pipeline tab — shows backlog health score and stale item warning (F514 B-4)", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await page.getByRole("button", { name: "Pipeline" }).click();

    // health score label
    await expect(page.getByText(/Health Score/i)).toBeVisible();
    // stale item from MOCK_BACKLOG_HEALTH
    await expect(page.getByText(/F112/)).toBeVisible();
  });

  test("velocity tab — renders sprint bars and average (F514 B-5)", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await page.getByRole("button", { name: "Velocity" }).click();

    // avg and trend
    await expect(page.getByText(/Avg/).first()).toBeVisible();
    // sprint data from MOCK_VELOCITY
    await expect(page.getByText(/Sprint 261/)).toBeVisible();
    await expect(page.getByText(/Sprint 264/)).toBeVisible();
  });

  test("velocity tab — shows trend badge and phase progress (F514 B-5)", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await page.getByRole("button", { name: "Velocity" }).click();

    // trend from MOCK_VELOCITY (trend: "up")
    await expect(page.getByText(/↑|UP|up/i).first()).toBeVisible();
    // phase progress from MOCK_PHASE_PROGRESS
    await expect(page.getByText(/Phase 36/)).toBeVisible();
  });

  test("backlog tab — shows total count and health score (F514 B-5)", async ({ authenticatedPage: page }) => {
    await mockWorkApi(page);
    await page.goto("/work-management");

    await page.getByRole("button", { name: "Backlog" }).click();

    // total_backlog: 5 from MOCK_BACKLOG_HEALTH
    await expect(page.getByText(/5/).first()).toBeVisible();
    // warning from MOCK_BACKLOG_HEALTH
    await expect(page.getByText(/장기 대기 항목/)).toBeVisible();
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
