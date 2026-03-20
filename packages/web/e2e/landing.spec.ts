import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("renders hero with Foundry-X branding", async ({ page }) => {
    await page.goto("/");

    // Hero headline — 한국어 헤드라인 (F74 이후)
    await expect(
      page.getByRole("heading", { name: /사람과 AI가/i }),
    ).toBeVisible();

    // 그래디언트 텍스트
    await expect(page.getByText("함께 만드는 곳")).toBeVisible();
  });

  test("navigation links are visible", async ({ page }) => {
    await page.goto("/");

    // Navbar brand
    await expect(page.getByText("Foundry-X").first()).toBeVisible();

    // Navigation links
    await expect(page.getByRole("link", { name: "Features" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
  });
});
