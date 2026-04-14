import { test, expect } from "./fixtures/auth";

// @service: infra/shared
// @sprint: 187
// @tagged-by: F400

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
    // Override auth fixture's agents mock
    await page.unroute("**/api/agents");
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

    // Agent name and status badge should render (use heading role to avoid strict-mode violation with tab button)
    await expect(page.getByRole("heading", { name: "TestAgent" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("idle")).toBeVisible();
  });
});
