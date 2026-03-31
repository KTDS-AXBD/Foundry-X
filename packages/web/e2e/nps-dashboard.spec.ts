import { test, expect } from "./fixtures/org";

test.describe("NPS Dashboard (F254)", () => {
  const mockSummary = {
    averageNps: 7.8,
    totalResponses: 42,
    responseRate: 0.65,
    weeklyTrend: [
      { week: "W13", avgNps: 8.1, count: 12 },
      { week: "W12", avgNps: 7.5, count: 15 },
      { week: "W11", avgNps: 7.9, count: 15 },
    ],
    recentFeedback: [
      {
        id: "fb-1",
        userId: "alice@test.dev",
        npsScore: 9,
        comment: "에이전트 자동화가 매우 편리합니다",
        createdAt: "2026-03-30T10:00:00Z",
      },
      {
        id: "fb-2",
        userId: "bob@test.dev",
        npsScore: 6,
        comment: null,
        createdAt: "2026-03-29T14:00:00Z",
      },
    ],
  };

  test.beforeEach(async ({ orgPage: { page, orgId } }) => {
    await page.route("**/api/orgs/*/nps/summary*", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockSummary),
        });
      }
      return route.continue();
    });
  });

  test("NPS 대시보드가 요약 통계 카드를 렌더링한다", async ({
    orgPage: { page },
  }) => {
    await page.goto("/settings/nps");

    // Page heading
    await expect(page.getByRole("heading", { name: "NPS 대시보드" })).toBeVisible();
    await expect(
      page.getByText("팀 만족도와 피드백 트렌드를 확인하세요"),
    ).toBeVisible();

    // Stat cards
    await expect(page.getByText("평균 NPS")).toBeVisible();
    await expect(page.getByText("7.8")).toBeVisible();

    await expect(page.getByText("총 응답")).toBeVisible();
    await expect(page.getByText("42")).toBeVisible();

    await expect(page.getByText("응답률")).toBeVisible();
    await expect(page.getByText("65%")).toBeVisible();
  });

  test("주간 트렌드 바가 표시된다", async ({
    orgPage: { page },
  }) => {
    await page.goto("/settings/nps");

    await expect(page.getByText("주간 트렌드")).toBeVisible();

    // Week labels
    await expect(page.getByText("W13")).toBeVisible();
    await expect(page.getByText("W12")).toBeVisible();
    await expect(page.getByText("W11")).toBeVisible();

    // Counts
    await expect(page.getByText("12건")).toBeVisible();
    await expect(page.getByText("15건").first()).toBeVisible();
  });

  test("최근 피드백 목록이 점수와 코멘트를 표시한다", async ({
    orgPage: { page },
  }) => {
    await page.goto("/settings/nps");

    await expect(page.getByText("최근 피드백")).toBeVisible();

    // Feedback entries with scores
    await expect(page.getByText("alice@test.dev")).toBeVisible();
    await expect(page.getByText("에이전트 자동화가 매우 편리합니다")).toBeVisible();

    await expect(page.getByText("bob@test.dev")).toBeVisible();
  });

  test("API 에러 시 에러 메시지를 표시한다", async ({
    orgPage: { page },
  }) => {
    // Override with error response
    await page.route("**/api/orgs/*/nps/summary*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      }),
    );

    await page.goto("/settings/nps");

    // Error message should be visible (the component catches and displays error)
    const errorText = page.locator(".text-destructive");
    await expect(errorText).toBeVisible({ timeout: 10000 });
  });

  test("피드백이 없을 때 트렌드와 피드백 섹션이 숨겨진다", async ({
    orgPage: { page },
  }) => {
    await page.route("**/api/orgs/*/nps/summary*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          averageNps: 0,
          totalResponses: 0,
          responseRate: 0,
          weeklyTrend: [],
          recentFeedback: [],
        }),
      }),
    );

    await page.goto("/settings/nps");

    // Stat cards still visible with zero values
    await expect(page.getByText("평균 NPS")).toBeVisible();
    await expect(page.getByText("총 응답")).toBeVisible();

    // Trend and feedback sections should not be visible
    await expect(page.getByText("주간 트렌드")).not.toBeVisible();
    await expect(page.getByText("최근 피드백")).not.toBeVisible();
  });
});
