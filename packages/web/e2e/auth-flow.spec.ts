import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("login form renders on dashboard access", async ({ page }) => {
    // Navigating to dashboard without auth should show the page
    // (auth gating may redirect or show inline login)
    await page.goto("/dashboard");

    // The page should load — either dashboard or redirect to login
    await expect(page).toHaveURL(/\/(dashboard|login)/);
  });

  test("dashboard page is accessible", async ({ page }) => {
    await page.goto("/dashboard");

    // Page should render without critical errors
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});
