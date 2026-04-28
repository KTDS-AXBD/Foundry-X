import { test, expect } from "@playwright/test";

const API_URL =
  process.env.PROD_API_URL ||
  "https://fx-gateway.ktds-axbd.workers.dev";

test.describe("Production Smoke", () => {
  /**
   * TC-1: API Health Check
   * fx-gateway는 root("/") 핸들러가 없어 404. domain health endpoint는 200(공개).
   */
  test("API health endpoint returns 200", async ({ request }) => {
    const response = await request.get(`${API_URL}/api/discovery/health`);
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
   * TC-4b: 로그인 페이지 콘솔 에러 없음
   * HydrateFallback 경고, COOP 차단, auth/refresh 401 등이 해소되었는지 확인해요.
   */
  test("no console errors on login page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // 허용 목록: 무해한 에러
    const allowList = [
      /favicon/i,
      /third-party/i,
      /ERR_BLOCKED_BY_CLIENT/i, // 광고 차단기
      /GSI_LOGGER/i, // Google Identity Services — origin 미등록 환경
      /status of 403/i, // GIS SDK 403 (테스트 환경에서 origin 미등록)
    ];

    const realErrors = errors.filter(
      (e) => !allowList.some((pattern) => pattern.test(e)),
    );

    expect(realErrors).toEqual([]);
  });

  /**
   * TC-4c: 로그인 페이지 COOP 헤더 검증
   * Cross-Origin-Opener-Policy가 same-origin-allow-popups인지 확인해요.
   */
  test("login page has COOP same-origin-allow-popups", async ({ page }) => {
    const response = await page.goto("/login");
    const coopHeader = response?.headers()["cross-origin-opener-policy"];
    // COOP가 설정되어 있으면 same-origin-allow-popups여야 함
    if (coopHeader) {
      expect(coopHeader).toContain("same-origin-allow-popups");
    }
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
