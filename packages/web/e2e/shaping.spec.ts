/**
 * E2E: BD 형상화 — 실행 목록 + PRD 에디터 + 승인 워크플로
 * API mock 기반 — API 서버 없이도 동작
 */
import { test, expect } from "./fixtures/auth";

const mockRunList = {
  items: [
    {
      id: "run-1",
      tenantId: "org_test",
      discoveryPrdId: "prd-001",
      status: "running",
      mode: "hitl",
      currentPhase: "E",
      totalIterations: 2,
      maxIterations: 3,
      qualityScore: 0.87,
      tokenCost: 150000,
      tokenLimit: 500000,
      gitPath: null,
      createdAt: "2026-04-03T14:00:00Z",
      completedAt: null,
    },
  ],
  total: 1,
};

const mockRunDetail = {
  ...mockRunList.items[0],
  phaseLogs: [
    { id: "pl-1", runId: "run-1", phase: "A", round: 1, inputSnapshot: null, outputSnapshot: null, verdict: "PASS", qualityScore: 0.9, findings: null, durationMs: 5000, createdAt: "2026-04-03T14:01:00Z" },
  ],
  expertReviews: [
    { id: "er-1", runId: "run-1", expertRole: "TA", reviewBody: "Architecture is solid", findings: null, qualityScore: 0.9, createdAt: "2026-04-03T14:02:00Z" },
  ],
  sixHats: [
    { id: "sh-1", runId: "run-1", hatColor: "white", round: 1, opinion: "Factual analysis complete", verdict: "accept", createdAt: "2026-04-03T14:03:00Z" },
  ],
};

test.describe("BD 형상화", () => {
  test("형상화 목록 페이지 접근 + 카드 표시", async ({ authenticatedPage: page }) => {
    await page.route("**/api/shaping/runs*", (route) =>
      route.fulfill({ json: mockRunList }),
    );

    await page.goto("/shaping/review");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("BD 형상화")).toBeVisible();
    await expect(page.getByText("prd-001")).toBeVisible();
  });

  test("형상화 상세 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/shaping/runs/run-1", (route) =>
      route.fulfill({ json: mockRunDetail }),
    );

    await page.goto("/shaping/review/run-1");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Phase E")).toBeVisible();
  });

  test("전문가 리뷰 사이드 패널 표시", async ({ authenticatedPage: page }) => {
    await page.route("**/api/shaping/runs/run-1", (route) =>
      route.fulfill({ json: mockRunDetail }),
    );

    await page.goto("/shaping/review/run-1");
    await expect(page.getByText("전문가 리뷰")).toBeVisible({ timeout: 10000 });
    // expertRole "TA" displayed as badge + full name
    await expect(page.getByText(/TA|Technical Architect/).first()).toBeVisible();
  });

  test("Six Hats 토론 표시", async ({ authenticatedPage: page }) => {
    await page.route("**/api/shaping/runs/run-1", (route) =>
      route.fulfill({ json: mockRunDetail }),
    );

    await page.goto("/shaping/review/run-1");
    await expect(page.getByText("Six Hats 토론")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("white")).toBeVisible();
  });

  test("자동 리뷰 버튼 표시", async ({ authenticatedPage: page }) => {
    await page.route("**/api/shaping/runs/run-1", (route) =>
      route.fulfill({ json: mockRunDetail }),
    );

    await page.goto("/shaping/review/run-1");
    await expect(page.getByText("자동 리뷰 실행")).toBeVisible({ timeout: 10000 });
  });
});
