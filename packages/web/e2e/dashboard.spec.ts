import { test, expect } from "./fixtures/auth";

test.describe("Dashboard", () => {
  test("sidebar navigation is visible", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    // 프로세스 6단계 기반 IA — 상단 + 관리 그룹 항목
    await expect(page.getByRole("link", { name: "홈" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "에이전트" })).toBeVisible();
    await expect(page.getByRole("link", { name: "지식베이스" })).toBeVisible();
    await expect(page.getByRole("link", { name: "토큰 비용" })).toBeVisible();
    await expect(page.getByRole("link", { name: "아키텍처" })).toBeVisible();
  });

  test("sidebar 프로세스 6단계 그룹 항목 확인", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    // 수집 그룹 (기본 펼침)
    await expect(page.getByRole("link", { name: "SR 목록" })).toBeVisible();

    // 발굴 그룹 (기본 펼침)
    await expect(page.getByRole("link", { name: "아이디어 관리" })).toBeVisible();
    await expect(page.getByRole("link", { name: "BMC" })).toBeVisible();
    await expect(page.getByRole("link", { name: "진행률" })).toBeVisible();

    // 형상화 그룹 (기본 펼침)
    await expect(page.getByRole("link", { name: "Spec 생성" })).toBeVisible();

    // 검증/공유 그룹 (기본 펼침)
    await expect(page.getByRole("link", { name: "파이프라인" })).toBeVisible();
  });

  test("dashboard heading is visible", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: /홈/i }),
    ).toBeVisible();
  });
});
