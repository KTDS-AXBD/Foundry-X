import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("renders hero with Foundry-X branding", async ({ page }) => {
    await page.goto("/");

    // Hero headline — PRD v8 정체성 반영
    await expect(
      page.getByRole("heading", { name: /AI 에이전트가/i }),
    ).toBeVisible();

    // 그래디언트 텍스트
    await expect(page.getByText("일하는 방식을 설계하다")).toBeVisible();
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
