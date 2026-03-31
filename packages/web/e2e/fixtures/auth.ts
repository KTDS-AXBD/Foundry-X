import { test as base, type Page } from "@playwright/test";

/**
 * Create a fake JWT with a future exp claim.
 * No signature verification — just enough structure for isTokenExpired() to pass.
 */
function makeFakeJwt(): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: "test-user-id",
      email: "test@foundry-x.dev",
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    }),
  );
  return `${header}.${payload}.fake-signature`;
}

const TEST_USER = {
  id: "test-user-id",
  email: "test@foundry-x.dev",
  name: "Test User",
  role: "admin",
};

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    const token = makeFakeJwt();

    // Navigate first to set up the page context
    await page.goto("/");

    // Store JWT + user in localStorage for hydrate() to find
    await page.evaluate(
      ({ t, u }) => {
        localStorage.setItem("token", t);
        localStorage.setItem("user", JSON.stringify(u));
      },
      { t: token, u: TEST_USER },
    );

    await use(page);
  },
});

export { expect } from "@playwright/test";
