import { test, expect, dismissGuideModal } from "./fixtures/auth";

test.describe("Spec Generator", () => {
  test("spec generator page renders input area", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/shaping/prd");
    await dismissGuideModal(page);

    // Heading
    await expect(
      page.getByRole("heading", { name: /PRD/i }),
    ).toBeVisible();

    // Textarea for requirements input
    const textarea = page.getByRole("textbox").first();
    await expect(textarea).toBeVisible();
  });

  test("input field accepts text", async ({ authenticatedPage: page }) => {
    await page.goto("/shaping/prd");
    await dismissGuideModal(page);

    const textarea = page.getByRole("textbox").first();
    await textarea.fill("사용자가 에이전트별 토큰 사용량을 확인할 수 있어야 합니다");

    await expect(textarea).toHaveValue(
      "사용자가 에이전트별 토큰 사용량을 확인할 수 있어야 합니다",
    );
  });
});
