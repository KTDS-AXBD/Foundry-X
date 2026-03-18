import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("renders hero with Foundry-X branding", async ({ page }) => {
    await page.goto("/");

    // Hero headline visible
    await expect(
      page.getByRole("heading", { name: /Where Humans & AI/i }),
    ).toBeVisible();

    // "Forge Together" gradient text
    await expect(page.getByText("Forge Together")).toBeVisible();
  });

  test("navigation links are visible", async ({ page }) => {
    await page.goto("/");

    // Navbar brand
    await expect(page.getByText("Foundry-X").first()).toBeVisible();

    // Navigation links
    await expect(page.getByRole("link", { name: "Features" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
  });
});
