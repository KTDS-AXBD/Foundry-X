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

export const TEST_ORG = {
  id: "test-org-e2e",
  name: "Test Org",
  slug: "test-org",
  plan: "free" as const,
  createdAt: "2026-01-01T00:00:00Z",
};

/**
 * Set up common API mocks that the app shell calls on every authenticated page load.
 * Without these, OrgSwitcher / NpsSurveyTrigger / agents cause React render crashes.
 */
async function setupAppShellMocks(page: Page) {
  // OrgSwitcher calls GET /api/orgs on mount
  await page.route("**/api/orgs", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([TEST_ORG]),
      });
    }
    return route.continue();
  });

  // NpsSurveyTrigger calls GET /api/nps/check on mount
  await page.route("**/api/nps/check", (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ shouldShow: false, surveyId: null }),
    });
  });

  // Agents page fetches GET /api/agents
  await page.route("**/api/agents", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }
    return route.continue();
  });

  // SSE stream endpoint (agents real-time updates)
  await page.route("**/api/agents/stream", (route) => {
    return route.fulfill({
      status: 200,
      body: "",
      headers: { "Content-Type": "text/event-stream" },
    });
  });
}

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

    // Set up common app shell mocks
    await setupAppShellMocks(page);

    await use(page);
  },
});

export { expect } from "@playwright/test";
