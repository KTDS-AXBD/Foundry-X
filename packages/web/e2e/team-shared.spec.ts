import { test, expect } from "./fixtures/org";

test.describe("Team Shared (F253)", () => {
  test.beforeEach(async ({ orgPage: { page } }) => {
    // Mock shared BMCs API
    await page.route("**/api/orgs/*/shared/bmcs*", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                id: "bmc-1",
                title: "AI 챗봇 서비스 BMC",
                authorName: "Alice",
                syncStatus: "synced",
                updatedAt: "2026-03-30T10:00:00Z",
              },
              {
                id: "bmc-2",
                title: "IoT 모니터링 BMC",
                authorName: "Bob",
                syncStatus: "draft",
                updatedAt: "2026-03-29T15:00:00Z",
              },
            ],
          }),
        });
      }
      return route.continue();
    });

    // Mock activity feed API
    await page.route("**/api/orgs/*/shared/activity*", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                type: "bmc_created",
                actorName: "Alice",
                title: "AI 챗봇 서비스 BMC 생성",
                resourceId: "bmc-1",
                timestamp: "2026-03-30T10:00:00Z",
              },
              {
                type: "feedback_submitted",
                actorName: "Bob",
                title: "NPS 피드백 제출",
                resourceId: "fb-1",
                timestamp: "2026-03-29T14:00:00Z",
              },
            ],
          }),
        });
      }
      return route.continue();
    });
  });

  test("팀 공유 페이지가 BMC 탭으로 렌더링된다", async ({
    orgPage: { page },
  }) => {
    await page.goto("/team-shared");

    await expect(page.getByRole("heading", { name: "팀 공유" })).toBeVisible();
    await expect(
      page.getByText("같은 조직 내 팀원들의 산출물과 활동을 확인하세요"),
    ).toBeVisible();

    // BMC tab is default active
    const bmcTab = page.getByRole("button", { name: "BMC" });
    await expect(bmcTab).toBeVisible();

    // BMC cards should be rendered
    await expect(page.getByText("AI 챗봇 서비스 BMC")).toBeVisible();
    await expect(page.getByText("IoT 모니터링 BMC")).toBeVisible();

    // Author and sync status
    await expect(page.getByText(/Alice/)).toBeVisible();
    await expect(page.getByText(/synced/)).toBeVisible();
  });

  test("활동 탭으로 전환하면 활동 피드가 표시된다", async ({
    orgPage: { page },
  }) => {
    await page.goto("/team-shared");

    // Switch to activity tab
    await page.getByRole("button", { name: "활동" }).click();

    // Activity feed items — type labels rendered by ActivityItem
    await expect(page.getByText("BMC 생성", { exact: true })).toBeVisible();
    await expect(page.getByText("피드백 제출", { exact: true })).toBeVisible();
    await expect(page.getByText("AI 챗봇 서비스 BMC 생성")).toBeVisible();
  });

  test("BMC가 없을 때 빈 상태 메시지를 표시한다", async ({
    orgPage: { page },
  }) => {
    // Override with empty response
    await page.route("**/api/orgs/*/shared/bmcs*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      }),
    );

    await page.goto("/team-shared");

    await expect(page.getByText("아직 팀 BMC가 없어요")).toBeVisible();
  });

  test("활동이 없을 때 빈 상태 메시지를 표시한다", async ({
    orgPage: { page },
  }) => {
    // Override with empty response
    await page.route("**/api/orgs/*/shared/activity*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      }),
    );

    await page.goto("/team-shared");
    await page.getByRole("button", { name: "활동" }).click();

    await expect(page.getByText("아직 팀 활동이 없어요")).toBeVisible();
  });
});
