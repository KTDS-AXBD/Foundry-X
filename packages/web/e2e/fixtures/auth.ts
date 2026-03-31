import { test as base, type Page } from "@playwright/test";

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // POST login to get JWT token
    const response = await page.request.post("/api/auth/login", {
      data: {
        email: "test@foundry-x.dev",
        password: "test-password-123",
      },
    });

    let token = "test-jwt-token";
    if (response.ok()) {
      const body = await response.json();
      token = body.token ?? token;
    }

    // Store JWT in localStorage before navigating
    await page.goto("/");
    await page.evaluate((t) => {
      localStorage.setItem("token", t);
    }, token);

    await use(page);
  },
});

export { expect } from "@playwright/test";
