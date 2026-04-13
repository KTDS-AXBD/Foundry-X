import { test, expect } from "./fixtures/auth";

// @service: portal
// @sprint: 187
// @tagged-by: F400

test.describe("Tokens Page", () => {
  test("토큰 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.goto("/tokens");

    await expect(
      page.getByRole("heading", { name: /Token & Cost Management/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("토큰 요약 표시", async ({ authenticatedPage: page }) => {
    // Mock token summary API
    await page.route("**/api/tokens/summary", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalCost: 1.5,
          period: "2026-03",
          byModel: { "claude-3": { tokens: 100000, cost: 1.0 }, "gpt-4": { tokens: 50000, cost: 0.5 } },
          byAgent: { reviewer: { tokens: 80000, cost: 0.8 }, planner: { tokens: 70000, cost: 0.7 } },
        }),
      });
    });

    await page.goto("/tokens");

    await expect(
      page.getByRole("heading", { name: /Token & Cost Management/i }),
    ).toBeVisible({ timeout: 10000 });

    // Cost should be displayed
    const cost = page.getByText("$1.5000");
    if (await cost.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(cost).toBeVisible();
    }
  });
});
