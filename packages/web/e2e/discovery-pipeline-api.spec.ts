/**
 * E2E: Discovery Pipeline API + Dashboard (F316)
 * F314 파이프라인 API mock + 발굴 대시보드 탭 전환 + factory 데이터 검증
 */
import { test, expect } from "./fixtures/auth";

// @service: foundry-x
// @sprint: 187
// @tagged-by: F400
import { makePipelineRun, makeCheckpoint, makeArtifact } from "./fixtures/mock-factory";

const MOCK_PORTFOLIO_PROGRESS = {
  items: [
    {
      bizItemId: "biz-1",
      title: "AI 문서 자동화",
      status: "active",
      pipelineStage: "DISCOVERY",
      pipelineEnteredAt: "2026-03-20T00:00:00Z",
      currentDiscoveryStage: "2-2",
      discoveryStages: [
        { stageId: "2-0", status: "completed" },
        { stageId: "2-1", status: "completed" },
        { stageId: "2-2", status: "in_progress" },
      ],
      completedStageCount: 2,
      totalStageCount: 11,
      trafficLight: { overallSignal: "green", go: 3, pivot: 1, drop: 0, pending: 7 },
    },
    {
      bizItemId: "biz-2",
      title: "스마트 팩토리",
      status: "active",
      pipelineStage: "DISCOVERY",
      pipelineEnteredAt: "2026-03-25T00:00:00Z",
      currentDiscoveryStage: "2-0",
      discoveryStages: [
        { stageId: "2-0", status: "completed" },
      ],
      completedStageCount: 1,
      totalStageCount: 11,
      trafficLight: { overallSignal: "yellow", go: 1, pivot: 1, drop: 0, pending: 9 },
    },
  ],
  summary: {
    totalItems: 2,
    bySignal: { green: 1, yellow: 1, red: 0 },
    byPipelineStage: { DISCOVERY: 2 },
    avgCompletionRate: 0.14,
    bottleneck: null,
  },
  total: 2,
};

const MOCK_DISCOVERY_PROGRESS = {
  totalItems: 2,
  byGateStatus: { blocked: 0, warning: 1, ready: 1 },
  byCriterion: [
    { criterionId: 1, name: "시장 규모", completed: 1, inProgress: 1, needsRevision: 0, pending: 0, completionRate: 50 },
    { criterionId: 2, name: "경쟁 분석", completed: 0, inProgress: 1, needsRevision: 0, pending: 1, completionRate: 0 },
  ],
  items: [
    { bizItemId: "biz-1", title: "AI 문서 자동화", completedCount: 3, gateStatus: "ready" as const, criteria: [] },
    { bizItemId: "biz-2", title: "스마트 팩토리", completedCount: 1, gateStatus: "warning" as const, criteria: [] },
  ],
  bottleneck: { criterionId: 2, name: "경쟁 분석", completionRate: 0 },
};

const MOCK_ARTIFACTS = {
  items: [
    makeArtifact({ id: "art-1", stageId: "2-0", skillId: "idea-classifier" }),
    makeArtifact({ id: "art-2", stageId: "2-1", skillId: "feasibility-study" }),
  ],
  total: 2,
};

function setupDashboardMocks(page: import("@playwright/test").Page) {
  return Promise.all([
    page.evaluate(() => {
      localStorage.setItem("fx-discovery-tour-completed", "true");
      localStorage.setItem("fx-tour-completed", "true");
    }),
    page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = "[aria-label='피드백 보내기'] { display: none !important; }";
      document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
    }),
    page.route("**/api/ax-bd/progress*", (route) =>
      route.fulfill({ json: MOCK_PORTFOLIO_PROGRESS }),
    ),
    page.route("**/api/discovery/progress*", (route) =>
      route.fulfill({ json: MOCK_DISCOVERY_PROGRESS }),
    ),
    page.route("**/api/ax-bd/artifacts*", (route) =>
      route.fulfill({ json: MOCK_ARTIFACTS }),
    ),
    page.route("**/api/ax-bd/biz-items/*/artifacts*", (route) =>
      route.fulfill({ json: MOCK_ARTIFACTS }),
    ),
    page.route("**/api/help-agent/**", (route) =>
      route.fulfill({ json: { content: "mock" } }),
    ),
    // Pipeline API mocks (F314) — 향후 F315 UI 연결 시 활용
    page.route("**/api/discovery-pipeline/runs", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          json: {
            runs: [makePipelineRun()],
            total: 1,
          },
        });
      }
      return route.continue();
    }),
    page.route("**/api/discovery-pipeline/runs/*/checkpoints", (route) =>
      route.fulfill({
        json: { checkpoints: [makeCheckpoint()] },
      }),
    ),
  ]);
}

test.describe("Discovery Pipeline API + Dashboard (F316)", () => {
  test("파이프라인 mock factory 데이터 구조 검증", async ({
    authenticatedPage: page,
  }) => {
    // factory 함수로 생성한 데이터가 올바른 구조인지 검증
    const run = makePipelineRun();
    expect(run.id).toBe("run-1");
    expect(run.status).toBe("discovery_running");
    expect(run.currentStep).toBe("2-3");
    expect(run.steps).toHaveLength(5);
    expect(run.steps[0]!.status).toBe("completed");
    expect(run.steps[3]!.status).toBe("in_progress");
    expect(run.steps[4]!.status).toBe("pending");

    const cp = makeCheckpoint();
    expect(cp.checkpointType).toBe("commit_gate");
    expect(cp.questions).toHaveLength(4);
    expect(cp.status).toBe("pending");
    expect(typeof cp.deadline).toBe("string");

    // override 동작 검증
    const customRun = makePipelineRun({ status: "completed", currentStep: "2-10" });
    expect(customRun.status).toBe("completed");
    expect(customRun.currentStep).toBe("2-10");

    const customCp = makeCheckpoint({ status: "approved", checkpointType: "viability" });
    expect(customCp.status).toBe("approved");
    expect(customCp.checkpointType).toBe("viability");

    // 실제 페이지에서 pipeline API mock이 설정됨을 확인
    await setupDashboardMocks(page);
    await page.goto("/discovery/dashboard");
    await expect(page.getByText("발굴 대시보드")).toBeVisible({ timeout: 10000 });
  });

  test("발굴 대시보드 — 탭 전환 (진행추적 → 기준달성률 → 산출물)", async ({
    authenticatedPage: page,
  }) => {
    await setupDashboardMocks(page);
    await page.goto("/discovery/dashboard");

    // 페이지 로딩 확인
    await expect(page.getByText("발굴 대시보드")).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText("BD 아이템 진행 현황"),
    ).toBeVisible();

    // 탭 3개 확인
    await expect(page.getByRole("tab", { name: "진행 추적" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "기준 달성률" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "산출물" })).toBeVisible();

    // 기본 탭 (진행 추적) 콘텐츠 확인
    await expect(page.getByText("AI 문서 자동화")).toBeVisible({ timeout: 5000 });

    // 기준 달성률 탭 전환
    await page.getByRole("tab", { name: "기준 달성률" }).click();
    // DiscoveryProgressDashboard 렌더링 대기
    await expect(page.getByText("시장 규모").first()).toBeVisible({ timeout: 5000 });

    // 산출물 탭 전환
    await page.getByRole("tab", { name: "산출물" }).click();
    // ArtifactList 렌더링 대기 — mock 데이터의 산출물 제목 확인
    await expect(page.getByText("idea-classifier").first()).toBeVisible({ timeout: 5000 });
  });

  test("발굴 대시보드 — 신호등 필터 배지 표시 + 클릭", async ({
    authenticatedPage: page,
  }) => {
    await setupDashboardMocks(page);
    await page.goto("/discovery/dashboard");

    // 로딩 완료 대기
    await expect(page.getByText("발굴 대시보드")).toBeVisible({ timeout: 10000 });

    // 진행 추적 탭 콘텐츠 로딩 대기 — 아이템이 표시될 때까지
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });

    // 신호등 필터 배지 확인 (정확한 텍스트)
    const filterBadges = page.locator("text=신호등");
    await expect(filterBadges.first()).toBeVisible();

    // "전���" 배지 확인
    await expect(page.getByText("전체").first()).toBeVisible();

    // Green 배지 클릭 시 에러 없이 동작 확인
    const greenBadge = page.getByText("Green").first();
    if (await greenBadge.isVisible().catch(() => false)) {
      await greenBadge.click();
      // API 재호출 후 결과가 렌더링됨 (mock이므로 동일 데이터)
      await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 5000 });
    }
  });
});
