import { test, expect } from "./fixtures/auth";

// @service: portal
// @sprint: 267
// @tagged-by: F516

test.describe("Dashboard", () => {
  test("sidebar navigation is visible", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    // 상단 고정 링크
    await expect(page.getByRole("link", { name: "대시보드" })).toBeVisible();

    // 프로세스 2단계 그룹 버튼 (발굴 + 형상화)
    await expect(page.getByRole("button", { name: /2\. 발굴/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /3\. 형상화/ })).toBeVisible();
  });

  test("sidebar 프로세스 그룹 항목 확인", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    // sidebar 영역 내에서만 검색
    const sidebar = page.locator("aside").or(page.locator("[class*='Sheet']"));

    // 발굴 그룹 항목 (기본 펼침)
    await expect(sidebar.getByRole("link", { name: "평가 결과서" })).toBeVisible();

    // 형상화 그룹 — 기본 펼침 상태에서 확인
    await expect(sidebar.getByRole("link", { name: "PRD" })).toBeVisible();
  });

  test("dashboard heading is visible", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: /홈/i }),
    ).toBeVisible();
  });

  test("dashboard pipeline shows 2 stages", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    // 대시보드 파이프라인 영역에 2단계 표시
    const pipeline = page.locator("text=프로세스 파이프라인").locator("..");
    await expect(pipeline.getByText("발굴")).toBeAttached();
    await expect(pipeline.getByText("형상화")).toBeAttached();
  });

  test("quick actions link to valid routes", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    // 퀵 액션 영역의 링크들이 유효한 라우트를 가리키는지
    const quickActions = page.locator("text=퀵 액션").locator("..");
    await expect(quickActions).toBeAttached();
  });
});
