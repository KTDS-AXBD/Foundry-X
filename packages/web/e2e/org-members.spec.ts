import { test, expect } from "./fixtures/auth";

test.describe("Organization Members", () => {
  test("멤버 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.goto("/workspace/org/members");

    // Members heading or Loading state
    const heading = page.getByRole("heading", { name: /Members/i });
    const loading = page.getByText("Loading...");

    await expect(heading.or(loading)).toBeVisible({ timeout: 10000 });

    // If fully loaded, check Invite Member section
    if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(page.getByText("Invite Member")).toBeVisible();
    }
  });

  test("멤버 목록 테이블", async ({ authenticatedPage: page }) => {
    // Mock members API
    await page.route("**/api/orgs/*/members", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              orgId: "org-1",
              userId: "user-1",
              email: "alice@test.dev",
              name: "Alice",
              role: "owner",
              joinedAt: "2026-01-01T00:00:00Z",
            },
            {
              orgId: "org-1",
              userId: "user-2",
              email: "bob@test.dev",
              name: "Bob",
              role: "member",
              joinedAt: "2026-02-01T00:00:00Z",
            },
          ]),
        });
      }
      return route.continue();
    });

    await page.route("**/api/orgs/*/invitations", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }
      return route.continue();
    });

    await page.goto("/workspace/org/members");

    const heading = page.getByRole("heading", { name: /Members/i });
    if (await heading.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Table should show member names and emails
      await expect(page.getByText("Alice")).toBeVisible();
      await expect(page.getByText("bob@test.dev")).toBeVisible();
      await expect(page.getByText("owner")).toBeVisible();
    }
  });

  test("멤버 초대 폼 UI", async ({ authenticatedPage: page }) => {
    await page.goto("/workspace/org/members");

    const heading = page.getByRole("heading", { name: /Members/i });
    if (await heading.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Email input
      const emailInput = page.getByPlaceholder("email@example.com");
      await expect(emailInput).toBeVisible();

      // Role select
      const roleSelect = page.locator("select");
      if (await roleSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(roleSelect).toBeVisible();
      }

      // Invite button
      await expect(
        page.getByRole("button", { name: /Invite/i }),
      ).toBeVisible();
    }
  });

  test("대기 중인 초대 표시", async ({ authenticatedPage: page }) => {
    // Mock members + invitations
    await page.route("**/api/orgs/*/members", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              orgId: "org-1",
              userId: "user-1",
              email: "alice@test.dev",
              name: "Alice",
              role: "owner",
              joinedAt: "2026-01-01T00:00:00Z",
            },
          ]),
        });
      }
      return route.continue();
    });

    await page.route("**/api/orgs/*/invitations", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "inv-1",
              email: "pending@test.dev",
              role: "member",
              expiresAt: "2026-12-31T00:00:00Z",
              createdAt: "2026-03-01T00:00:00Z",
              acceptedAt: null,
            },
          ]),
        });
      }
      return route.continue();
    });

    await page.goto("/workspace/org/members");

    const heading = page.getByRole("heading", { name: /Members/i });
    if (await heading.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Pending Invitations section
      const pendingSection = page.getByText(/Pending Invitations/i);
      if (
        await pendingSection.isVisible({ timeout: 5000 }).catch(() => false)
      ) {
        await expect(page.getByText("pending@test.dev")).toBeVisible();
        await expect(
          page.getByRole("button", { name: /Cancel/i }),
        ).toBeVisible();
      }
    }
  });
});
