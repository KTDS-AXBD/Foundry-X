import { test, expect } from "@playwright/test";

// @service: portal
// @sprint: 187
// @tagged-by: F400

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    // 매 테스트 전 localStorage 초기화
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    });
  });

  test("미인증 사용자 → /dashboard 접근 시 /login으로 리다이렉트", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login", { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("미인증 사용자 → /agents 접근 시 /login으로 리다이렉트", async ({ page }) => {
    await page.goto("/agents");
    await page.waitForURL("**/login", { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("미인증 사용자 → /offering-packs 접근 시 /login으로 리다이렉트", async ({ page }) => {
    await page.goto("/shaping/offering");
    await page.waitForURL("**/login", { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("로그인 폼이 올바르게 렌더링됨", async ({ page }) => {
    await page.goto("/login");

    // 이메일, 비밀번호 입력 필드
    await expect(page.getByLabel("이메일")).toBeVisible();
    await expect(page.getByLabel("비밀번호")).toBeVisible();

    // 로그인 버튼 (폼 내부의 submit 버튼)
    await expect(page.getByRole("button", { name: "로그인" }).first()).toBeVisible();

    // 회원가입 모드 전환
    await page.getByRole("button", { name: "회원가입" }).click();
    await expect(page.getByLabel("이름")).toBeVisible();
    await expect(page.getByRole("button", { name: "가입하기" })).toBeVisible();
  });

  test("랜딩 페이지(/)는 인증 없이 접근 가능", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    // 랜딩 페이지는 리다이렉트 없이 유지 — networkidle로 안정화 대기
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL("/");
  });

  test("/login 페이지는 인증 없이 접근 가능", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
  });

  test("로그인 페이지 로드 시 콘솔 에러 없음 (HydrateFallback, COOP, refresh)", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // HydrateFallback 경고, COOP 차단, auth/refresh 401이 없어야 함
    const criticalErrors = errors.filter(
      (e) =>
        /HydrateFallback/i.test(e) ||
        /Cross-Origin-Opener-Policy/i.test(e) ||
        /auth\/refresh/i.test(e),
    );

    expect(criticalErrors).toEqual([]);
  });

  test("Google 로그인 버튼이 렌더링됨", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // GIS SDK가 로드되면 Google 버튼 iframe 또는 div가 생성됨
    // 최소한 Google 버튼 컨테이너가 존재해야 함
    const googleBtnContainer = page.locator("[data-client_id], iframe[src*='accounts.google.com'], div.g_id_signin").first();
    // GIS SDK 로드가 느릴 수 있으므로 5초 대기
    const isVisible = await googleBtnContainer.isVisible({ timeout: 5000 }).catch(() => false);
    // GIS SDK가 외부 의존이라 CI에서 차단될 수 있음 — soft assert
    if (!isVisible) {
      console.warn("Google Sign-In button not rendered — GIS SDK may be blocked in test environment");
    }
  });

  test("잘못된 자격 증명으로 로그인 시 에러 표시", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("이메일").fill("wrong@example.com");
    await page.getByLabel("비밀번호").fill("wrong-password");
    await page.getByRole("button", { name: "로그인" }).first().click();

    // 에러 메시지가 표시되어야 함 — 로그인 페이지에 머물러야 함
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/login/);
  });

  test("localStorage에 만료된 토큰이 있으면 /login으로 리다이렉트", async ({ page }) => {
    await page.goto("/");

    // 만료된 JWT 토큰 생성 (exp: 과거 시간)
    const expiredPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 }));
    const expiredToken = `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.${expiredPayload}.fake-signature`;

    await page.evaluate((t) => {
      localStorage.setItem("token", t);
      localStorage.setItem("user", JSON.stringify({ id: "1", email: "test@test.com", name: "Test", role: "admin" }));
      // refreshToken 없음 → refresh 실패 → 로그아웃
    }, expiredToken);

    await page.goto("/dashboard");
    await page.waitForURL("**/login", { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
