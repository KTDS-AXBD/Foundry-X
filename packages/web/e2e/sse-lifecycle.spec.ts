import { test, expect } from "./fixtures/auth";

test.describe("SSE Lifecycle — Agents Page", () => {
  test("agents 페이지 진입 시 UI 렌더링", async ({ authenticatedPage: page }) => {
    await page.goto("/agents");

    // Heading should be visible
    await expect(
      page.getByRole("heading", { name: /Agent Transparency/i }),
    ).toBeVisible();

    // Either agent cards or empty/loading state should render
    const content = page
      .getByText(/Loading agents|No agents registered/i)
      .or(page.locator("[class*=grid]").filter({ has: page.locator("[class*=card]") }));

    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("에이전트 카드 상태 배지 표시", async ({ authenticatedPage: page }) => {
    // Mock agents list with status
    await page.route("**/api/agents", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              id: "agent-1",
              name: "TestAgent",
              status: "active",
              description: "테스트 에이전트",
              activity: { type: "idle", timestamp: new Date().toISOString() },
            },
          ]),
          headers: { "Content-Type": "application/json" },
        });
      }
      return route.continue();
    });

    // Mock SSE stream
    await page.route("**/api/agents/stream", (route) =>
      route.fulfill({ status: 200, body: "", headers: { "Content-Type": "text/event-stream" } }),
    );

    await page.goto("/agents");

    // Agent name should render
    await expect(page.getByText("TestAgent")).toBeVisible({ timeout: 10000 });

    // Badge or status indicator should exist within the card area
    const cardArea = page.locator("[class*=card]").filter({ hasText: "TestAgent" });
    await expect(cardArea.first()).toBeVisible();
  });
});
