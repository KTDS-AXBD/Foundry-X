import { test, expect } from "./fixtures/auth";

// @service: gate-x
// @sprint: 187
// @tagged-by: F400

test.describe("Agents Page", () => {
  test("Agent Transparency heading is visible", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/agents");

    await expect(
      page.getByRole("heading", { name: /Agent Transparency/i }),
    ).toBeVisible();
  });

  test("agent list or empty state renders", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/agents");

    // Wait for either agent cards or "No agents" / "Loading" state
    const agentContent = page
      .getByText(/Loading agents|No agents registered/i)
      .or(page.locator("[class*=grid]").filter({ has: page.locator("[class*=card]") }));

    await expect(agentContent.first()).toBeVisible({ timeout: 10000 });
  });
});
