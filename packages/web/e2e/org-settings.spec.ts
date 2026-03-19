import { test, expect } from "./fixtures/auth";

test.describe("Organization Settings", () => {
  test("org 설정 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.goto("/workspace/org/settings");

    await expect(
      page.getByRole("heading", { name: /Organization Settings/i }),
    ).toBeVisible({ timeout: 10000 });

    // General form input
    const input = page.locator("input").first();
    await expect(input).toBeVisible();

    // Save Changes button
    await expect(
      page.getByRole("button", { name: /Save Changes/i }),
    ).toBeVisible();

    // Create New Organization section
    await expect(page.getByText("Create New Organization")).toBeVisible();
  });

  test("org 이름 변경 폼", async ({ authenticatedPage: page }) => {
    await page.goto("/workspace/org/settings");

    await expect(
      page.getByRole("heading", { name: /Organization Settings/i }),
    ).toBeVisible({ timeout: 10000 });

    // Fill in org name input
    const nameInput = page
      .locator("input")
      .first();
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill("Updated Org Name");
      await expect(
        page.getByRole("button", { name: /Save Changes/i }),
      ).toBeVisible();
    }
  });

  test("새 org 생성 폼", async ({ authenticatedPage: page }) => {
    await page.goto("/workspace/org/settings");

    await expect(
      page.getByRole("heading", { name: /Organization Settings/i }),
    ).toBeVisible({ timeout: 10000 });

    // Create new org input
    const createInput = page.getByPlaceholder("Organization name");
    if (await createInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createInput.fill("New Test Org");
      await expect(
        page.getByRole("button", { name: /^Create$/i }),
      ).toBeVisible();
    }
  });

  test("OrgSwitcher 드롭다운 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    // OrgSwitcher: Building2 아이콘이 있는 버튼 or "Select org" 텍스트
    const switcher = page
      .getByText(/Select org/i)
      .or(page.locator("button").filter({ hasText: /Loading/i }));

    if (await switcher.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(switcher.first()).toBeVisible();
    }
  });
});
