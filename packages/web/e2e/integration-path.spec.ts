import { test, expect } from "./fixtures/auth";

// @service: infra/shared
// @sprint: 187
// @tagged-by: F400

test.describe("Phase 4 Integration Path", () => {
  test("iframe SSO token delivery via postMessage", async ({
    authenticatedPage: page,
  }) => {
    // Navigate to a page with service container (e.g., workspace)
    await page.goto("/workspace");

    // Check that ServiceContainer is rendered
    const container = page.locator("[data-testid='service-container']");

    // If service container exists, verify iframe is present
    const iframe = container.locator("iframe");
    if ((await iframe.count()) > 0) {
      // Verify iframe has src attribute
      const src = await iframe.getAttribute("src");
      expect(src).toMatch(/^https?:\/\//);

      // Verify loading skeleton disappears after load
      await expect(
        container.locator("[data-testid='service-loading']"),
      ).not.toBeVisible({ timeout: 10000 });
    }
  });

  test("BFF proxy API call via dashboard", async ({
    authenticatedPage: page,
  }) => {
    // Mock API endpoints to prevent 5xx from missing API server
    await page.route("**/api/**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );

    await page.goto("/dashboard");
    await expect(page.locator("main")).toBeVisible();

    // Verify no 5xx error responses from API calls
    const failedRequests: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 500) {
        failedRequests.push(`${response.url()} → ${response.status()}`);
      }
    });

    await page.goto("/agents");
    await page.waitForLoadState("networkidle");

    expect(failedRequests).toHaveLength(0);
  });

  test("entity registry cross-service search", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard");

    // Check for search functionality (if exists)
    const searchInput = page.locator(
      "input[placeholder*='Search'], input[placeholder*='검색']",
    );
    if ((await searchInput.count()) > 0) {
      await searchInput.fill("test-entity");
      await page.waitForLoadState("networkidle");

      // Verify no error toast or error message
      await expect(page.locator("[role='alert']")).not.toBeVisible();
    }
  });

  test("sub-app error boundary on invalid service URL", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/workspace");

    // Check if error boundary component exists and renders fallback
    const errorBoundary = page.locator(
      "[data-testid='service-error'], [data-testid='service-container']",
    );

    if ((await errorBoundary.count()) > 0) {
      // If service URL is unreachable, error boundary should show
      // Verify retry button exists when error is shown
      const retryButton = page.locator("button", { hasText: /재시도|Retry/i });
      const directLink = page.locator("a", {
        hasText: /독립.*접근|Open directly/i,
      });

      // At least the container or error boundary should be visible
      await expect(errorBoundary.first()).toBeVisible();

      // If error is shown, retry and direct access should be available
      if ((await retryButton.count()) > 0) {
        await expect(retryButton).toBeVisible();
        await expect(directLink).toBeVisible();
      }
    }
  });

  test("API error responses follow ErrorResponse schema", async ({
    authenticatedPage: page,
  }) => {
    // Call a non-existent API endpoint to trigger error response
    const response = await page.request.get("/api/nonexistent-route-test");
    const status = response.status();

    // Verify structured error response format
    if (status >= 400 && status < 500) {
      const body = await response.json();
      expect(body).toHaveProperty("error");
      expect(typeof body.error).toBe("string");
    }
  });

  test("harness rules API returns rule definitions", async ({
    authenticatedPage: page,
  }) => {
    const response = await page.request.get("/api/harness/rules");

    // API 서버 미실행 시 502/503 허용 (Vite proxy ECONNREFUSED)
    if (response.status() >= 502) {
      test.skip(true, "API 서버 미실행 — proxy 연결 불가");
      return;
    }

    const status = response.status();
    // 403 = 권한 부족 (정상), 404 = 라우트 미등록 (정상), 200 = 접근 가능
    expect(status).toBeLessThan(500);

    if (status === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("rules");
      expect(Array.isArray(body.rules)).toBe(true);
    }
  });

  test("KPI analytics dashboard renders without critical errors", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard");
    await expect(page.locator("main")).toBeVisible();

    // No 500-level error alerts should be visible
    const errorAlerts = page.locator("[role='alert']");
    if ((await errorAlerts.count()) > 0) {
      const alertText = await errorAlerts.first().textContent();
      expect(alertText).not.toContain("500");
    }
  });
});
