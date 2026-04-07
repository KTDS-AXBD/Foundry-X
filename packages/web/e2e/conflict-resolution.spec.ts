import { test, expect } from "./fixtures/auth";

// @service: gate-x
// @sprint: 187
// @tagged-by: F400

const MOCK_SPEC_RESULT = {
  spec: {
    title: "에이전트 토큰 사용량 차트",
    description: "사용자가 에이전트별 토큰 사용량을 일별 차트로 확인할 수 있어야 합니다",
    acceptanceCriteria: ["일별 차트 표시", "에이전트별 필터링"],
    priority: "P1",
    estimatedEffort: "M",
    category: "feature",
  },
  model: "mock-model",
  confidence: 0.92,
  markdown: "# 에이전트 토큰 사용량 차트\n\n에이전트별 토큰 사용량을 일별 차트로 표시",
};

const MOCK_CONFLICT = {
  type: "direct" as const,
  severity: "warning" as const,
  existingSpec: {
    id: "F42",
    title: "토큰 사용량 대시보드",
    field: "title",
    value: "토큰 사용량 대시보드",
  },
  newSpec: { field: "title", value: "에이전트 토큰 사용량 차트" },
  description: '새 Spec "에이전트 토큰 사용량 차트"이(가) 기존 "토큰 사용량 대시보드"과(와) 유사해요 (유사도: 65%)',
  suggestion: "기존 F42을(를) 확장하거나 범위를 좁혀보세요",
};

test.describe("Conflict Resolution Flow", () => {
  test("충돌 없는 Spec 생성", async ({ authenticatedPage: page }) => {
    // Mock spec/generate with no conflicts
    await page.route("**/api/spec/generate", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ ...MOCK_SPEC_RESULT, conflicts: [] }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    await page.goto("/shaping/prd");

    await expect(
      page.getByRole("heading", { name: /PRD/i }),
    ).toBeVisible();

    // Fill in requirements text (min 10 chars)
    const textarea = page.getByRole("textbox").first();
    await textarea.fill("사용자가 에이전트별 토큰 사용량을 일별 차트로 확인할 수 있어야 합니다");

    // Click generate button
    await page.getByRole("button", { name: /Spec 생성/ }).click();

    // Result should display
    await expect(page.getByText("에이전트 토큰 사용량 차트").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Acceptance Criteria/)).toBeVisible();
  });

  test("충돌 감지 → ConflictCard 표시", async ({ authenticatedPage: page }) => {
    // Mock spec/generate with 1 conflict
    await page.route("**/api/spec/generate", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          ...MOCK_SPEC_RESULT,
          conflicts: [MOCK_CONFLICT],
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    await page.goto("/shaping/prd");

    const textarea = page.getByRole("textbox").first();
    await textarea.fill("사용자가 에이전트별 토큰 사용량을 일별 차트로 확인할 수 있어야 합니다");

    await page.getByRole("button", { name: /Spec 생성/ }).click();

    // Wait for result
    await expect(page.getByText("에이전트 토큰 사용량 차트").first()).toBeVisible({ timeout: 10000 });

    // Conflict section should appear
    await expect(page.getByText(/충돌이 감지되었습니다/)).toBeVisible();
    await expect(page.getByText(/Conflict #1/)).toBeVisible();
    await expect(page.getByText(/직접 충돌/)).toBeVisible();
  });

  test("충돌 해결 — 수락", async ({ authenticatedPage: page }) => {
    // Mock spec/generate with conflict
    await page.route("**/api/spec/generate", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          ...MOCK_SPEC_RESULT,
          conflicts: [MOCK_CONFLICT],
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    // Mock resolve API
    await page.route("**/api/spec/conflicts/resolve", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    await page.goto("/shaping/prd");

    const textarea = page.getByRole("textbox").first();
    await textarea.fill("사용자가 에이전트별 토큰 사용량을 일별 차트로 확인할 수 있어야 합니다");

    await page.getByRole("button", { name: /Spec 생성/ }).click();

    // Wait for conflict card
    await expect(page.getByText(/충돌이 감지되었습니다/)).toBeVisible({ timeout: 10000 });

    // Click accept button
    await page.getByRole("button", { name: /수락/ }).click();

    // Should show resolved state
    await expect(page.getByText(/해결됨/)).toBeVisible({ timeout: 5000 });
  });
});
