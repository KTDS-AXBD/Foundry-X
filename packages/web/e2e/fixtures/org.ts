import { test as authTest, TEST_ORG } from "./auth";
import type { Page } from "@playwright/test";

interface OrgContext {
  page: Page;
  orgId: string;
  orgName: string;
}

export const test = authTest.extend<{ orgPage: OrgContext }>({
  orgPage: async ({ authenticatedPage: page }, use) => {
    // Mock /api/orgs to return our test org — OrgSwitcher calls fetchOrgs() on mount
    await page.route("**/api/orgs", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([TEST_ORG]),
        });
      }
      // POST — org creation
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(TEST_ORG),
        });
      }
      return route.continue();
    });

    await use({ page, orgId: TEST_ORG.id, orgName: TEST_ORG.name });
  },
});

export { expect } from "@playwright/test";
