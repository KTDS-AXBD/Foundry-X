import { test, expect } from "@playwright/test";

// @service: infra/shared
// @sprint: 187
// @tagged-by: F400

test.describe("Landing Page", () => {
  test("renders hero with Foundry-X branding", async ({ page }) => {
    await page.goto("/");

    // Hero headline — 사업개발 자동화 직설형 메시지
    await expect(
      page.getByRole("heading", { name: /사업기회 발굴부터/i }),
    ).toBeVisible();

    // Hero 하단 텍스트
    await expect(page.getByText("AI가 자동화해요")).toBeVisible();
  });

  test("navigation links are visible", async ({ page }) => {
    await page.goto("/");

    // Navbar brand
    await expect(page.getByText("Foundry-X").first()).toBeVisible();

    // Navigation links — Sprint 70에서 한국어 전환
    await expect(page.getByRole("link", { name: "핵심 기능" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
  });
});
