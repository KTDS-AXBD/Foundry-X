import { test as authTest } from "./auth";
import type { Page } from "@playwright/test";

interface OrgContext {
  page: Page;
  orgId: string;
  orgName: string;
}

export const test = authTest.extend<{ orgPage: OrgContext }>({
  orgPage: async ({ authenticatedPage: page }, use) => {
    const orgName = `test-org-${Date.now()}`;
    const createRes = await page.request.post("/api/orgs", {
      data: { name: orgName },
      headers: {
        Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem("fx-token"))}`,
      },
    });
    let orgId = "test-org-id";
    if (createRes.ok()) {
      const body = await createRes.json();
      orgId = body.id ?? orgId;
    }
    await page.evaluate((id) => {
      localStorage.setItem("fx-active-org", id);
    }, orgId);
    await use({ page, orgId, orgName });
  },
});

export { expect } from "@playwright/test";
