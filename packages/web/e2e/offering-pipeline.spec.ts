/**
 * F383: Offering Pipeline E2E Tests (Sprint 174)
 * 발굴→형상화→검증 전체 흐름 자동 검증
 */
import { test, expect } from "./fixtures/auth";
import {
  makeOffering,
  makeOfferingSection,
  makeOfferingValidation,
  makeOfferingMetrics,
  makeBizItem,
} from "./fixtures/mock-factory";

const OFFERING = makeOffering();
const SECTIONS = [
  makeOfferingSection({ id: "s1", sectionKey: "hero", title: "Hero", sortOrder: 0 }),
  makeOfferingSection({ id: "s2", sectionKey: "exec_summary", title: "Executive Summary", sortOrder: 1 }),
  makeOfferingSection({ id: "s3", sectionKey: "s01", title: "추진 배경 및 목적", sortOrder: 2 }),
];

function setupOfferingMocks(page: import("@playwright/test").Page) {
  return Promise.all([
    // Offerings list
    page.route("**/api/offerings*", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          json: { offerings: [OFFERING], total: 1, page: 1, limit: 20 },
        });
      }
      return route.fulfill({ json: OFFERING, status: 201 });
    }),
    // Offering detail
    page.route("**/api/offerings/offering-1", (route) =>
      route.fulfill({ json: { ...OFFERING, sections: SECTIONS } }),
    ),
    // Sections
    page.route("**/api/offerings/offering-1/sections*", (route) =>
      route.fulfill({ json: { sections: SECTIONS } }),
    ),
    // Design tokens
    page.route("**/api/offerings/offering-1/tokens*", (route) =>
      route.fulfill({
        json: {
          tokens: [
            { tokenKey: "--color-primary", tokenValue: "#2563eb", tokenCategory: "color" },
            { tokenKey: "--font-size-base", tokenValue: "16px", tokenCategory: "typography" },
          ],
        },
      }),
    ),
    // Export
    page.route("**/api/offerings/offering-1/export*", (route) =>
      route.fulfill({ json: { url: "https://example.com/export.html", format: "html" } }),
    ),
    // Validate
    page.route("**/api/offerings/offering-1/validate*", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ json: makeOfferingValidation(), status: 201 });
      }
      return route.fulfill({ json: { validations: [makeOfferingValidation()] } });
    }),
    // Prototype
    page.route("**/api/offerings/offering-1/prototype*", (route) =>
      route.fulfill({ json: { jobId: "job-1", status: "queued" }, status: 201 }),
    ),
    // HTML preview
    page.route("**/api/offerings/offering-1/html*", (route) =>
      route.fulfill({ body: "<html><body><h1>Preview</h1></body></html>", contentType: "text/html" }),
    ),
    // Metrics
    page.route("**/api/offerings/metrics*", (route) =>
      route.fulfill({ json: makeOfferingMetrics() }),
    ),
    // BizItem for wizard
    page.route("**/api/biz-items*", (route) =>
      route.fulfill({ json: { items: [makeBizItem()] } }),
    ),
  ]);
}

test.describe("Offering Pipeline E2E", () => {
  test("offerings-list — 목록 + 상태 badge + 필터", async ({
    authenticatedPage: page,
  }) => {
    await setupOfferingMocks(page);

    await page.goto("/offerings");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("AI 헬스케어 사업기획서")).toBeVisible();
    // Status badge
    await expect(page.getByText("초안")).toBeVisible();
    // Format indicator
    await expect(page.getByText("보고용").or(page.locator("text=report"))).toBeVisible();
  });

  test("offering-create-wizard — 위자드 1단계 표시", async ({
    authenticatedPage: page,
  }) => {
    await setupOfferingMocks(page);

    await page.goto("/offerings/create");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    // Wizard should show biz item selection or title input
    await expect(
      page.getByText("사업 아이템").or(page.getByPlaceholder(/제목|title/i)),
    ).toBeVisible();
  });

  test("offering-editor — 섹션 리스트 + 에디터", async ({
    authenticatedPage: page,
  }) => {
    await setupOfferingMocks(page);

    await page.goto("/offerings/offering-1/edit");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("AI 헬스케어 사업기획서")).toBeVisible();
    // Section list visible
    await expect(page.getByText("Executive Summary").or(page.getByText("Hero"))).toBeVisible();
  });

  test("offering-tokens — 디자인 토큰 에디터", async ({
    authenticatedPage: page,
  }) => {
    await setupOfferingMocks(page);

    await page.goto("/offerings/offering-1/tokens");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    // Token categories or token values should be visible
    await expect(
      page.getByText("color").or(page.getByText("#2563eb")).or(page.getByText("디자인 토큰")),
    ).toBeVisible();
  });

  test("offering-validate — 검증 대시보드", async ({
    authenticatedPage: page,
  }) => {
    await setupOfferingMocks(page);

    await page.goto("/offerings/offering-1/validate");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("AI 헬스케어 사업기획서")).toBeVisible();
    // Validation score or status
    await expect(
      page.getByText("82").or(page.getByText("completed").or(page.getByText("검증"))),
    ).toBeVisible();
  });

  test("offering-editor — Export 버튼 존재", async ({
    authenticatedPage: page,
  }) => {
    await setupOfferingMocks(page);

    await page.goto("/offerings/offering-1/edit");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    // Export or download button/link
    await expect(
      page.getByRole("button", { name: /export|내보내기|다운로드/i })
        .or(page.getByRole("link", { name: /export|내보내기/i }))
        .or(page.locator('[data-testid="export-btn"]'))
        .or(page.locator('a[href*="export"]')),
    ).toBeVisible();
  });

  test("offering-editor — Prototype 패널 존재", async ({
    authenticatedPage: page,
  }) => {
    await setupOfferingMocks(page);

    await page.goto("/offerings/offering-1/edit");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    // Prototype panel or button
    await expect(
      page.getByText(/프로토타입|prototype/i)
        .or(page.getByRole("button", { name: /프로토타입|prototype/i })),
    ).toBeVisible();
  });
});
