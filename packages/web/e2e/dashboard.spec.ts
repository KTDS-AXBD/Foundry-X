import { test, expect } from "./fixtures/auth";

test.describe("Dashboard", () => {
  test("sidebar navigation is visible", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    // Sidebar nav items (desktop viewport) — IA 재설계 후 한국어 레이블
    await expect(page.getByRole("link", { name: "홈" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "에이전트" })).toBeVisible();
    await expect(page.getByRole("link", { name: "지식베이스" })).toBeVisible();
    await expect(page.getByRole("link", { name: "토큰 비용" })).toBeVisible();
    await expect(page.getByRole("link", { name: "아키텍처" })).toBeVisible();
  });

  test("dashboard heading is visible", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: /Foundry-X Dashboard/i }),
    ).toBeVisible();
  });
});
