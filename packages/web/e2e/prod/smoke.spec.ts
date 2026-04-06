import { test, expect } from "@playwright/test";

const API_URL =
  process.env.PROD_API_URL ||
  "https://foundry-x-api.ktds-axbd.workers.dev";

test.describe("Production Smoke", () => {
  /**
   * TC-1: API Health Check
   * Workers API가 정상 응답하는지 확인해요.
   * smoke-test.sh의 curl 체크를 브라우저 fetch로 보완해요.
   */
  test("API root returns 200", async ({ request }) => {
    const response = await request.get(`${API_URL}/`);
    expect(response.status()).toBe(200);
  });

  /**
   * TC-2: 랜딩 페이지 렌더링
   * Next.js SSR/hydration이 완료되고 Hero 텍스트가 보이는지 확인해요.
   * 기존 landing.spec.ts의 프로덕션 버전이에요.
   */
  test("landing page renders hero text", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Hero headline — 사업개발 자동화 직설형 메시지
    await expect(
      page.getByRole("heading", { name: /사업기회 발굴부터/i }),
    ).toBeVisible({ timeout: 10000 });

    // Hero 하단 텍스트 (br 태그로 분할됨)
    await expect(page.getByText("AI가 자동화해요")).toBeVisible();
  });

  /**
   * TC-3: 네비게이션 링크 존재
   * Navbar에 핵심 링크가 렌더링되는지 확인해요.
   */
  test("navigation links are visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Navbar brand
    await expect(page.getByText("Foundry-X").first()).toBeVisible();

    // 핵심 네비게이션 링크 (한국어 IA)
    await expect(
      page.getByRole("link", { name: "핵심 기능" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Dashboard" }).first(),
    ).toBeVisible();
  });

  /**
   * TC-4: 콘솔 에러 없음
   * 랜딩 페이지 로드 중 JS 콘솔 에러가 발생하지 않는지 확인해요.
   * hydration mismatch, 누락 모듈, API 연결 실패 등을 감지해요.
   */
  test("no console errors on landing page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 허용 목록: 알려진 무해한 에러 (필요 시 추가)
    const allowList = [
      /favicon/i,
      /third-party/i,
    ];

    const realErrors = errors.filter(
      (e) => !allowList.some((pattern) => pattern.test(e)),
    );

    expect(realErrors).toEqual([]);
  });

  /**
   * TC-5: 페이지 응답 시간
   * 랜딩 페이지 로드가 합리적 시간 내에 완료되는지 확인해요.
   * 성능 회귀를 조기에 감지하는 가드레일이에요.
   */
  test("landing page loads within acceptable time", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const elapsed = Date.now() - start;

    // 5초 이내 DOMContentLoaded — CDN + cold start 감안
    expect(elapsed).toBeLessThan(5_000);
  });
});
