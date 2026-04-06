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
    // Offerings list (exact path — no sub-path)
    page.route("**/api/offerings", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: { items: [OFFERING], total: 1 } });
      }
      return route.fulfill({ json: OFFERING, status: 201 });
    }),
    // All /api/offerings/* sub-paths
    page.route("**/api/offerings/**", (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace(/^.*\/api\/offerings/, "");
      const method = route.request().method();

      // GET /offerings/metrics
      if (path.startsWith("/metrics")) {
        return route.fulfill({ json: makeOfferingMetrics() });
      }

      // /offerings/offering-1/...
      if (path.startsWith("/offering-1")) {
        const subpath = path.replace("/offering-1", "");

        // /offerings/offering-1 (detail)
        if (subpath === "" || subpath === "/") {
          return route.fulfill({ json: { ...OFFERING, sections: SECTIONS } });
        }
        // /offerings/offering-1/sections
        if (subpath.startsWith("/sections")) {
          return route.fulfill({ json: { sections: SECTIONS } });
        }
        // /offerings/offering-1/tokens
        if (subpath.startsWith("/tokens")) {
          return route.fulfill({
            json: {
              tokens: [
                { tokenKey: "--color-primary", tokenValue: "#2563eb", tokenCategory: "color" },
                { tokenKey: "--font-size-base", tokenValue: "16px", tokenCategory: "typography" },
              ],
            },
          });
        }
        // /offerings/offering-1/export
        if (subpath.startsWith("/export")) {
          return route.fulfill({
            body: "<html><body><h1>AI 헬스케어 사업기획서</h1><p>Preview</p></body></html>",
            contentType: "text/html",
          });
        }
        // /offerings/offering-1/validations (GET list) or /offerings/offering-1/validate (POST)
        if (subpath.startsWith("/validations")) {
          return route.fulfill({ json: { validations: [makeOfferingValidation()], total: 1 } });
        }
        if (subpath.startsWith("/validate")) {
          return route.fulfill({ json: makeOfferingValidation(), status: 201 });
        }
        // /offerings/offering-1/prototypes (list)
        if (subpath.startsWith("/prototypes")) {
          return route.fulfill({ json: { items: [] } });
        }
        // /offerings/offering-1/prototype (create)
        if (subpath === "/prototype") {
          return route.fulfill({ json: { jobId: "job-1", status: "queued" }, status: 201 });
        }
        // /offerings/offering-1/html
        if (subpath.startsWith("/html")) {
          return route.fulfill({
            body: "<html><body><h1>Preview</h1></body></html>",
            contentType: "text/html",
          });
        }
      }

      // Fallback: 404
      return route.fulfill({ status: 404, json: { error: "Not found" } });
    }),
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

  test("offering-validate — 검증 대시보드", async ({
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

  test("offering-editor — Prototype 패널 존재", async ({
    authenticatedPage: page,
  }) => {
    await setupOfferingMocks(page);

    await page.goto("/shaping/offering/offering-1/edit");
    await dismissGuideModal(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    // Prototype panel or button
    await expect(
      page.getByText(/프로토타입|prototype/i)
        .or(page.getByRole("button", { name: /프로토타입|prototype/i })).first(),
    ).toBeVisible();
  });
});
