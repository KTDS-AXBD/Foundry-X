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

  test("sidebar AX BD 그룹 + 현황 그룹 항목 확인", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    // AX BD 사업개발 그룹 펼치기 (기본 접힘)
    const axBdGroup = page.getByText("AX BD 사업개발");
    if (await axBdGroup.isVisible({ timeout: 3000 }).catch(() => false)) {
      await axBdGroup.click();
      await expect(page.getByRole("link", { name: "아이디어 관리" })).toBeVisible();
      await expect(page.getByRole("link", { name: "BMC" })).toBeVisible();
    }

    // 현황 그룹 (기본 펼침)
    await expect(page.getByRole("link", { name: "Discovery 진행률" })).toBeVisible();
    await expect(page.getByRole("link", { name: "방법론 관리" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Analytics" })).toBeVisible();
  });

  test("dashboard heading is visible", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: /Foundry-X Dashboard/i }),
    ).toBeVisible();
  });
});
