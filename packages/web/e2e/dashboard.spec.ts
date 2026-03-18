import { test, expect } from "./fixtures/auth";

test.describe("Dashboard", () => {
  test("sidebar navigation is visible", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    // Sidebar nav items (desktop viewport)
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Agents" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Wiki" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tokens" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Architecture" })).toBeVisible();
  });

  test("dashboard heading is visible", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: /Foundry-X Dashboard/i }),
    ).toBeVisible();
  });
});
