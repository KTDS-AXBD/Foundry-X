/**
 * F383: Offering Pipeline E2E Tests (Sprint 174)
 * 발굴→형상화→검증 전체 흐름 자동 검증
 */
import { test, expect, dismissGuideModal } from "./fixtures/auth";
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
    // Dismiss onboarding/tour/guide overlays
    page.addInitScript(() => {
      localStorage.setItem("fx-tour-completed", "true");
      localStorage.setItem("fx-guide-dismissed", "true");
      localStorage.setItem("fx-onboarding-completed", "true");
      localStorage.setItem("fx-process-guide-dismissed", "true");
    }),
    // Offering detail (더 구체적인 경로 먼저 등록)
    page.route("**/api/offerings/offering-1", (route) => {
      const url = route.request().url();
      // /offerings/offering-1 정확히 매칭 (sub-paths 제외)
      if (url.endsWith("/offering-1") || url.includes("/offering-1?")) {
        return route.fulfill({ json: { ...OFFERING, sections: SECTIONS } });
      }
      return route.continue();
    }),
    // Offerings list (less specific — must come after detail)
    page.route("**/api/offerings", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          json: { items: [OFFERING], total: 1 },
        });
      }
      return route.fulfill({ json: OFFERING, status: 201 });
    }),
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
    // Export (HTML preview — returns raw HTML text)
    page.route("**/api/offerings/offering-1/export*", (route) =>
      route.fulfill({ body: "<html><body><h1>AI 헬스케어 사업기획서</h1><p>Preview Content</p></body></html>", contentType: "text/html" }),
    ),
    // Validate
    page.route("**/api/offerings/offering-1/validate*", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ json: makeOfferingValidation(), status: 201 });
      }
      return route.fulfill({ json: { validations: [makeOfferingValidation()] } });
    }),
    // Prototype: GET /prototypes (list) + POST /prototype (create)
    page.route("**/api/offerings/offering-1/prototypes**", (route) =>
      route.fulfill({ json: { items: [] } }),
    ),
    page.route("**/api/offerings/offering-1/prototype", (route) =>
      route.fulfill({ json: { jobId: "job-1", status: "queued" }, status: 201 }),
    ),
    // HTML preview (별도 엔드포인트가 있으면)
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

    await page.goto("/shaping/offerings");
    await dismissGuideModal(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("AI 헬스케어 사업기획서")).toBeVisible();
    // Status badge (span, not filter button)
    await expect(page.locator("span").filter({ hasText: "초안" }).first()).toBeVisible();
    // Format indicator
    await expect(page.getByText("보고용").first()).toBeVisible();
  });

  test("offering-create-wizard — 위자드 1단계 표시", async ({
    authenticatedPage: page,
  }) => {
    await setupOfferingMocks(page);

    await page.goto("/shaping/offerings/new");
    await dismissGuideModal(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    // Wizard step 1: 발굴 아이템 선택
    await expect(
      page.getByText("발굴 아이템 선택").or(page.getByText("새 사업기획서 만들기")).first(),
    ).toBeVisible();
  });

  test("offering-editor — 섹션 리스트 + 에디터", async ({
    authenticatedPage: page,
  }) => {
    await setupOfferingMocks(page);

    await page.goto("/shaping/offering/offering-1/edit");
    await dismissGuideModal(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("AI 헬스케어 사업기획서")).toBeVisible();
    // Section list visible
    await expect(page.getByText("Executive Summary").or(page.getByText("Hero")).first()).toBeVisible();
  });

  test("offering-tokens — 디자인 토큰 에디터", async ({
    authenticatedPage: page,
  }) => {
    await setupOfferingMocks(page);

    await page.goto("/shaping/offering/offering-1/tokens");
    await dismissGuideModal(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    // Token categories or token values should be visible
    await expect(
      page.getByText("color").or(page.getByText("#2563eb")).or(page.getByText("디자인 토큰")).first(),
    ).toBeVisible();
  });

  test.fixme("offering-validate — 검증 대시보드", /* TODO: mock route 매칭 개선 필요 — /shaping/offering/:id/validate 경로에서 detail fetch 누락 */ async ({
    authenticatedPage: page,
  }) => {
    await setupOfferingMocks(page);

    await page.goto("/shaping/offering/offering-1/validate");
    await dismissGuideModal(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("AI 헬스케어 사업기획서").first()).toBeVisible();
    // Validation score or status
    await expect(
      page.getByText("82").or(page.getByText("completed")).or(page.getByText("검증")).first(),
    ).toBeVisible();
  });

  test("offering-editor — 에디터 탭 + 섹션 편집 UI", async ({
    authenticatedPage: page,
  }) => {
    await setupOfferingMocks(page);

    await page.goto("/shaping/offering/offering-1/edit");
    await dismissGuideModal(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    // Editor/Tokens/Validate tab links
    await expect(
      page.getByRole("button", { name: /에디터/i })
        .or(page.getByRole("link", { name: /에디터/i })).first(),
    ).toBeVisible();
    // Section count heading
    await expect(page.getByText(/섹션/).first()).toBeVisible();
  });

  test.fixme("offering-editor — Prototype 패널 존재", /* TODO: offering detail mock route 매칭 불안정 — retry 시 간헐적 성공 */ async ({
    authenticatedPage: page,
  }) => {
    await setupOfferingMocks(page);

    await page.goto("/shaping/offering/offering-1/edit");
    await dismissGuideModal(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    // Prototype panel or button
    await expect(
      page.getByText(/프로토타입|prototype/i)
        .or(page.getByRole("button", { name: /프로토타입|prototype/i })),
    ).toBeVisible();
  });
});
