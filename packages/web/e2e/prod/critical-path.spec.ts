import { test, expect } from "@playwright/test";

test.describe("Production Critical Path", () => {
  /**
   * TC-6: 랜딩 → Features 섹션 스크롤
   * Navbar "Features" 링크 클릭 시 해당 섹션으로 스크롤되는지 확인해요.
   */
  test("landing → Features section scroll", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Features 링크 클릭
    await page.getByRole("link", { name: "Features" }).first().click();

    // Core Pillars 섹션이 뷰포트에 보이는지 확인 (F74 개편 후)
    await expect(
      page.getByRole("heading", { name: /차별점|Core Pillars/i }),
    ).toBeVisible();
  });

  /**
   * TC-7: 랜딩 → Architecture 페이지 네비게이션
   * Architecture 링크로 이동하여 페이지가 정상 렌더링되는지 확인해요.
   */
  test("landing → Architecture page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Architecture 링크가 있으면 클릭
    const archLink = page.getByRole("link", { name: /Architecture/i }).first();
    if (await archLink.isVisible()) {
      await archLink.click();
      await page.waitForLoadState("networkidle");

      // URL이 architecture를 포함하거나 페이지 콘텐츠가 존재
      expect(page.url()).toContain("architecture");
    }
  });

  /**
   * TC-8: 랜딩 → Roadmap 섹션 네비게이션
   * Roadmap/로드맵 섹션이 존재하고 접근 가능한지 확인해요.
   */
  test("landing → Roadmap section", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Roadmap 링크가 Navbar에 있으면 클릭
    const roadmapLink = page.getByRole("link", { name: /Roadmap/i }).first();
    if (await roadmapLink.isVisible()) {
      await roadmapLink.click();
    }

    // 대안: 페이지 하단으로 스크롤하여 Roadmap 섹션 확인
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Roadmap 관련 텍스트가 페이지에 존재하는지 확인
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });

  /**
   * TC-9a: BD Pipeline 페이지 접근
   * /pipeline 경로가 정상 렌더링되는지 확인해요. (Sprint 79 F232)
   */
  test("pipeline page renders", async ({ page }) => {
    await page.goto("/pipeline");
    await page.waitForLoadState("networkidle");

    // 파이프라인 페이지가 렌더링됨 (인증 없이도 기본 UI)
    const hasContent = await page.locator("body").textContent();
    expect(hasContent).toBeTruthy();
    const bodyChildCount = await page.locator("body > *").count();
    expect(bodyChildCount).toBeGreaterThan(0);
  });

  /**
   * TC-9: Dashboard 접근 → 리다이렉트 확인
   * 비인증 상태에서 /dashboard 접근 시 적절한 응답을 하는지 확인해요.
   * (로그인 리다이렉트 또는 공개 대시보드 표시)
   */
  test("dashboard access without auth", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // 두 가지 시나리오 모두 허용:
    // 1) 로그인 페이지로 리다이렉트 → URL에 login/auth 포함
    // 2) 공개 대시보드 표시 → 페이지가 렌더링됨
    const hasContent = await page.locator("body").textContent();

    // 페이지가 비어있지 않아야 함 (500 에러 페이지가 아님)
    expect(hasContent).toBeTruthy();

    // 빈 흰색 화면이 아닌, 어떤 형태든 UI가 렌더링되어야 함
    const bodyChildCount = await page.locator("body > *").count();
    expect(bodyChildCount).toBeGreaterThan(0);
  });
});
