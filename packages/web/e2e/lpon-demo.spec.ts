/**
 * E2E: AI Foundry OS — LPON Type 1 데모 (F547)
 * 공개 라우트(인증 불필요) — 대표 시연 동선 회귀 방지
 * 라우트: /ai-foundry-os/demo/lpon
 */
import { test, expect } from "@playwright/test";

// @service: foundry-x
// @sprint: 298
// @tagged-by: F547

const MOCK_SUMMARY = {
  score: 87,
  summary: "온누리상품권 취소(LPON) 프로세스 분석 완료.",
  counts: { nodes: 12, edges: 11 },
};

const MOCK_FINDINGS = {
  items: [
    { id: "f1", type: "gap", severity: "high", message: "취소 사유 코드 표준화 필요" },
    { id: "f2", type: "improvement", severity: "medium", message: "감사 로그 보강" },
  ],
};

const MOCK_COMPARISON = {
  spec: { totalRules: 14, covered: 12 },
  code: { totalEndpoints: 9, matched: 8 },
  matchRate: 0.91,
};

test.describe("AI Foundry OS — LPON 데모 (F547)", () => {
  test.beforeEach(async ({ page }) => {
    // Decode-X 3-Pass API mocks
    await page.route("**/api/decode/analysis/lpon-001/summary", (route) =>
      route.fulfill({ json: MOCK_SUMMARY }),
    );
    await page.route("**/api/decode/analysis/lpon-001/findings", (route) =>
      route.fulfill({ json: MOCK_FINDINGS }),
    );
    await page.route("**/api/decode/analysis/lpon-001/compare", (route) =>
      route.fulfill({ json: MOCK_COMPARISON }),
    );
  });

  test("LPON 데모 페이지가 렌더링된다 — 인증 없이 접근 가능", async ({ page }) => {
    await page.goto("/ai-foundry-os/demo/lpon");

    // h1 — 시연 핵심 타이틀
    await expect(
      page.getByRole("heading", { level: 1, name: "온누리상품권 취소 (LPON)" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("3-Pass 탭(Scoring/Diagnosis/Comparison)이 모두 존재한다", async ({ page }) => {
    await page.goto("/ai-foundry-os/demo/lpon");
    await expect(page.getByRole("button", { name: /Scoring/ })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("button", { name: /Diagnosis/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Comparison/ })).toBeVisible();
  });

  test("기본 탭은 Scoring — AI-Ready 6기준 헤더 노출", async ({ page }) => {
    await page.goto("/ai-foundry-os/demo/lpon");
    await expect(
      page.getByText("Scoring Pass — AI-Ready 6기준 점수"),
    ).toBeVisible({ timeout: 10000 });
  });

  test("Diagnosis 탭 클릭 → 갭/개선 제안 헤더 노출", async ({ page }) => {
    await page.goto("/ai-foundry-os/demo/lpon");
    await page.getByRole("button", { name: /Diagnosis/ }).click();
    await expect(
      page.getByText("Diagnosis Pass — 갭 및 개선 제안"),
    ).toBeVisible({ timeout: 5000 });
  });

  test("Comparison 탭 클릭 → Spec ↔ Code 정합성 헤더 노출", async ({ page }) => {
    await page.goto("/ai-foundry-os/demo/lpon");
    await page.getByRole("button", { name: /Comparison/ }).click();
    await expect(
      page.getByText("Comparison Pass — Spec ↔ Code 정합성"),
    ).toBeVisible({ timeout: 5000 });
  });
});
