import { test, expect } from "./fixtures/auth";

// @service: portal
// @sprint: 187
// @tagged-by: F400

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

    // Members 페이지가 렌더되면 heading이 보임
    // OrgSwitcher mock이 org를 제공하므로 Members heading이 나와야 함
    await expect(
      page.getByRole("heading", { name: "Members", exact: true }),
    ).toBeVisible({ timeout: 10000 });
  });
});
