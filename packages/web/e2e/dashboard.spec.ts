import { test, expect, dismissGuideModal } from "./fixtures/auth";

test.describe("Dashboard", () => {
  test("sidebar navigation is visible", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
    await dismissGuideModal(page);

    // 상단 고정 링크
    await expect(page.getByRole("link", { name: "대시보드" })).toBeVisible();
    await expect(page.getByRole("link", { name: "시작하기" })).toBeVisible();

    // 프로세스 6단계 그룹 버튼
    await expect(page.getByRole("button", { name: /1\. 수집/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /2\. 발굴/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /3\. 형상화/ })).toBeVisible();
  });

  test("sidebar 프로세스 6단계 그룹 항목 확인", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
    await dismissGuideModal(page);

    // sidebar 영역 내에서만 검색
    const sidebar = page.locator("aside").or(page.locator("[class*='Sheet']"));

    // 발굴 그룹 항목 (기본 펼침)
    await expect(sidebar.getByRole("link", { name: "발굴" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "평가 결과서" })).toBeVisible();

    // 형상화 그룹 — 기본 펼침 상태에서 확인
    await expect(sidebar.getByRole("link", { name: "PRD" })).toBeVisible();

    // 검증/공유 그룹 — 기본 펼침 상태에서 확인
    await expect(sidebar.getByRole("link", { name: "검증" })).toBeVisible();
  });

  test("dashboard heading is visible", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: /홈/i }),
    ).toBeVisible();
  });
});
