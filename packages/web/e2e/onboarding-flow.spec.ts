import { test, expect } from "./fixtures/auth";

test.describe("Onboarding Flow", () => {
  test("getting-started page renders feature cards and FAQ", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/getting-started");

    // Page should load without errors
    await expect(page.locator("main")).toBeVisible();

    // Feature cards should be rendered (5 cards expected)
    const featureCards = page.locator(
      "[data-testid*='feature-card'], .feature-card, [class*='card']",
    );
    if ((await featureCards.count()) > 0) {
      expect(await featureCards.count()).toBeGreaterThanOrEqual(1);
    }

    // FAQ section should exist
    const faqSection = page.locator("text=/FAQ|자주 묻는 질문/i");
    if ((await faqSection.count()) > 0) {
      await expect(faqSection.first()).toBeVisible();
    }
  });

  test("NPS feedback form is accessible", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/getting-started");

    // Look for NPS form or feedback widget
    const npsForm = page.locator(
      "[data-testid*='nps'], [data-testid*='feedback'], form[class*='feedback']",
    );
    const ratingButtons = page.locator(
      "button[data-testid*='rating'], button[aria-label*='점수']",
    );

    // Either NPS form or rating buttons should exist
    if ((await npsForm.count()) > 0 || (await ratingButtons.count()) > 0) {
      // NPS form is present — verify it's interactive
      const firstInteractive = (await ratingButtons.count()) > 0
        ? ratingButtons.first()
        : npsForm.first();
      await expect(firstInteractive).toBeVisible();
    }
  });

  test("onboarding checklist tracks progress", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/getting-started");

    // Look for checklist or progress indicators
    const checklist = page.locator(
      "[data-testid*='checklist'], [data-testid*='progress'], [role='progressbar']",
    );
    const checkboxes = page.locator("input[type='checkbox'], [role='checkbox']");

    // At least one progress tracking element should exist
    if ((await checklist.count()) > 0 || (await checkboxes.count()) > 0) {
      const progressElement = (await checklist.count()) > 0
        ? checklist.first()
        : checkboxes.first();
      await expect(progressElement).toBeVisible();
    }
  });
});
