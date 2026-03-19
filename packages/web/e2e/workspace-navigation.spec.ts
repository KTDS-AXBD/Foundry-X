import { test, expect } from "./fixtures/auth";

test.describe("Workspace Navigation", () => {
  test("workspace 페이지 접근", async ({ authenticatedPage: page }) => {
    await page.goto("/workspace");

    await expect(
      page.getByRole("heading", { name: /Workspace/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("org settings 네비게이션", async ({ authenticatedPage: page }) => {
    await page.goto("/workspace/org/settings");

    await expect(
      page.getByRole("heading", { name: /Organization Settings/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("org members 네비게이션", async ({ authenticatedPage: page }) => {
    await page.goto("/workspace/org/members");

    // Members heading or Loading state (depends on org being selected)
    const heading = page.getByRole("heading", { name: /Members/i });
    const loading = page.getByText("Loading...");
    const noOrg = page.getByText("No organization selected.");

    await expect(heading.or(loading).or(noOrg)).toBeVisible({
      timeout: 10000,
    });
  });
});
