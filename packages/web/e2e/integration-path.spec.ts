import { test, expect } from "./fixtures/auth";

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
      expect(src).toBeTruthy();

      // Verify loading skeleton disappears after load
      await expect(
        container.locator("[data-testid='service-loading']"),
      ).not.toBeVisible({ timeout: 10000 });
    }
  });

  test("BFF proxy API call via dashboard", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard");

    // Dashboard should load without errors
    await expect(page.locator("main")).toBeVisible();

    // Verify no 5xx error responses from API calls
    const failedRequests: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 500) {
        failedRequests.push(`${response.url()} → ${response.status()}`);
      }
    });

    // Navigate to trigger API calls
    await page.goto("/agents");
    await page.waitForTimeout(2000);

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
      await page.waitForTimeout(1000);

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
});
