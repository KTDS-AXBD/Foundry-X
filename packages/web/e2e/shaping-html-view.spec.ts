/**
 * E2E: 형상화 HTML 미리보기 — 사업기획서 / Offering / PRD
 * 카드 클릭 → iframe 표시 + 새 창 열기 검증
 */
import { test, expect } from "./fixtures/auth";
import { makeBizItem, makeOffering } from "./fixtures/mock-factory";

// ── Mock Data ──

const BIZ_ITEMS = [
  makeBizItem({ id: "item-1", title: "AI 헬스케어 플랫폼", status: "analyzed" }),
  makeBizItem({ id: "item-2", title: "스마트 팩토리 솔루션", status: "shaping" }),
];

const SAMPLE_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>사업기획서</title></head><body><h1>테스트 기획서</h1><p>AI 헬스케어 플랫폼 사업기획서입니다.</p></body></html>`;

const OFFERINGS = [
  makeOffering({ id: "off-1", title: "AI 헬스케어 제안서", status: "draft", format: "html" }),
  makeOffering({ id: "off-2", title: "스마트 팩토리 보고서", status: "approved", purpose: "report", format: "html" }),
];

const PRD_ITEMS = [
  { id: "prd-1", biz_item_id: "item-1", version: 1, status: "draft", content: "## PRD v1\n\n### 개요\n- AI 헬스케어 플랫폼 PRD", generated_at: 1711929600 },
  { id: "prd-2", biz_item_id: "item-1", version: 2, status: "confirmed", content: "## PRD v2\n\n### 개요\n- 확정된 PRD 버전", generated_at: 1711932000 },
];

// ── Helper: suppress onboarding overlays ──

async function dismissOverlays(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem("fx-tour-completed", "true");
    localStorage.setItem("fx-guide-dismissed", "true");
    localStorage.setItem("fx-onboarding-completed", "true");
    localStorage.setItem("fx-process-guide-dismissed", "true");
  });
}

// ════════════════════════════════════════════════════════════
// 1. 사업기획서 (/shaping/business-plan)
// ════════════════════════════════════════════════════════════

test.describe("사업기획서 HTML 미리보기", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await dismissOverlays(page);

    await page.route("**/api/biz-items", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: { items: BIZ_ITEMS, total: BIZ_ITEMS.length } });
      }
      return route.continue();
    });

    await page.route("**/api/biz-items/*/business-plan/export*", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: SAMPLE_HTML,
      });
    });
  });

  test("목록에 아이템 카드가 표시돼요", async ({ authenticatedPage: page }) => {
    await page.goto("/shaping/business-plan");
    await expect(page.locator("main h1")).toContainText("사업기획서", { timeout: 10000 });
    await expect(page.getByText("AI 헬스케어 플랫폼")).toBeVisible();
    await expect(page.getByText("스마트 팩토리 솔루션")).toBeVisible();
  });

  test("카드 클릭 시 iframe으로 HTML이 표시돼요", async ({ authenticatedPage: page }) => {
    await page.goto("/shaping/business-plan");
    await expect(page.getByText("AI 헬스케어 플랫폼")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("bp-card-item-1").click();

    const iframe = page.getByTestId("bp-iframe-item-1");
    await expect(iframe).toBeVisible({ timeout: 10000 });

    // Verify iframe has content
    const frame = iframe.contentFrame();
    await expect(frame.locator("body")).toContainText("테스트 기획서", { timeout: 5000 });
  });

  test("카드를 다시 클릭하면 iframe이 닫혀요", async ({ authenticatedPage: page }) => {
    await page.goto("/shaping/business-plan");
    await expect(page.getByText("AI 헬스케어 플랫폼")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("bp-card-item-1").click();
    await expect(page.getByTestId("bp-iframe-item-1")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("bp-card-item-1").click();
    await expect(page.getByTestId("bp-iframe-item-1")).not.toBeVisible();
  });

  test("새 창 버튼 클릭 시 window.open이 호출돼요", async ({ authenticatedPage: page }) => {
    await page.goto("/shaping/business-plan");
    await expect(page.getByText("AI 헬스케어 플랫폼")).toBeVisible({ timeout: 10000 });

    // Intercept window.open to verify it's called with blob URL
    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>).__openedUrls = [];
      const origOpen = window.open;
      window.open = (url?: string | URL, ...args: unknown[]) => {
        (window as unknown as Record<string, string[]>).__openedUrls.push(String(url));
        return origOpen.call(window, "about:blank", ...args) as WindowProxy;
      };
    });

    const newWindowBtn = page.getByTestId("bp-new-window-item-1");
    await expect(newWindowBtn).toBeVisible();
    await newWindowBtn.click();

    // Wait for the API call + window.open to complete
    await page.waitForFunction(
      () => (window as unknown as Record<string, string[]>).__openedUrls?.length > 0,
      { timeout: 10000 },
    );
    const urls = await page.evaluate(() => (window as unknown as Record<string, string[]>).__openedUrls);
    expect(urls[0]).toContain("blob:");
  });

  test("검색 필터가 동작해요", async ({ authenticatedPage: page }) => {
    await page.goto("/shaping/business-plan");
    await expect(page.getByText("AI 헬스케어 플랫폼")).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder("아이템 검색...").fill("스마트");
    await expect(page.getByText("스마트 팩토리 솔루션")).toBeVisible();
    await expect(page.getByText("AI 헬스케어 플랫폼")).not.toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════
// 2. Offering (/shaping/offerings)
// ════════════════════════════════════════════════════════════

test.describe("Offering HTML 미리보기", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await dismissOverlays(page);

    await page.route("**/api/offerings?**", (route) => {
      if (route.request().method() === "GET") {
        const url = new URL(route.request().url());
        const statusParam = url.searchParams.get("status");
        if (statusParam) {
          const filtered = OFFERINGS.filter((o) => o.status === statusParam);
          return route.fulfill({ json: { items: filtered, total: filtered.length } });
        }
        return route.fulfill({ json: { items: OFFERINGS, total: OFFERINGS.length } });
      }
      return route.continue();
    });

    await page.route("**/api/offerings", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: { items: OFFERINGS, total: OFFERINGS.length } });
      }
      return route.continue();
    });

    await page.route("**/api/offerings/*/export*", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: SAMPLE_HTML,
      });
    });
  });

  test("목록에 Offering 카드가 표시돼요", async ({ authenticatedPage: page }) => {
    await page.goto("/shaping/offerings");
    await expect(page.locator("main h1")).toContainText("Offerings", { timeout: 10000 });
    await expect(page.getByText("AI 헬스케어 제안서")).toBeVisible();
    await expect(page.getByText("스마트 팩토리 보고서")).toBeVisible();
  });

  test("카드 클릭 시 미리보기 패널에 iframe이 표시돼요", async ({ authenticatedPage: page }) => {
    await page.goto("/shaping/offerings");
    await expect(page.getByText("AI 헬스케어 제안서")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("offering-card-off-1").click();

    const panel = page.getByTestId("offering-preview-panel");
    await expect(panel).toBeVisible({ timeout: 10000 });
    await expect(panel.getByText("HTML 미리보기")).toBeVisible();

    const iframe = page.getByTestId("offering-iframe-off-1");
    await expect(iframe).toBeVisible({ timeout: 10000 });
  });

  test("새 창에서 열기 버튼이 동작해요", async ({ authenticatedPage: page }) => {
    await page.goto("/shaping/offerings");
    await expect(page.getByText("AI 헬스케어 제안서")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("offering-card-off-1").click();
    await expect(page.getByTestId("offering-iframe-off-1")).toBeVisible({ timeout: 10000 });

    // Intercept window.open
    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>).__openedUrls = [];
      const origOpen = window.open;
      window.open = (url?: string | URL, ...args: unknown[]) => {
        (window as unknown as Record<string, string[]>).__openedUrls.push(String(url));
        return origOpen.call(window, "about:blank", ...args) as WindowProxy;
      };
    });

    await page.getByTestId("offering-open-new-window").click();

    await page.waitForFunction(
      () => (window as unknown as Record<string, string[]>).__openedUrls?.length > 0,
      { timeout: 10000 },
    );
    const urls = await page.evaluate(() => (window as unknown as Record<string, string[]>).__openedUrls);
    expect(urls[0]).toContain("blob:");
  });

  test("미리보기 패널 닫기가 동작해요", async ({ authenticatedPage: page }) => {
    await page.goto("/shaping/offerings");
    await expect(page.getByText("AI 헬스케어 제안서")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("offering-card-off-1").click();
    const panel = page.getByTestId("offering-preview-panel");
    await expect(panel).toBeVisible({ timeout: 10000 });

    // Close via X button (last button in the panel header)
    await panel.locator("button").last().click();
    await expect(panel).not.toBeVisible();
  });

  test("다른 카드 클릭 시 미리보기가 전환돼요", async ({ authenticatedPage: page }) => {
    await page.goto("/shaping/offerings");
    await expect(page.getByText("AI 헬스케어 제안서")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("offering-card-off-1").click();
    const panel = page.getByTestId("offering-preview-panel");
    await expect(panel).toBeVisible({ timeout: 10000 });
    await expect(panel.getByText("AI 헬스케어 제안서")).toBeVisible();

    await page.getByTestId("offering-card-off-2").click();
    await expect(panel.getByText("스마트 팩토리 보고서")).toBeVisible({ timeout: 10000 });
  });

  test("상태 필터 탭이 동작해요", async ({ authenticatedPage: page }) => {
    await page.goto("/shaping/offerings");
    await expect(page.getByText("AI 헬스케어 제안서")).toBeVisible({ timeout: 10000 });

    // Click "승인" tab
    await page.locator("button").filter({ hasText: "승인" }).click();
    // After filtering, only approved offering visible
    await expect(page.getByText("스마트 팩토리 보고서")).toBeVisible({ timeout: 10000 });
  });
});

// ════════════════════════════════════════════════════════════
// 3. PRD (/shaping/prd)
// ════════════════════════════════════════════════════════════

test.describe("PRD HTML 미리보기", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await dismissOverlays(page);

    await page.route("**/api/biz-items", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: { items: BIZ_ITEMS, total: BIZ_ITEMS.length } });
      }
      return route.continue();
    });

    await page.route("**/api/biz-items/*/prds", (route) => {
      return route.fulfill({ json: { prds: PRD_ITEMS } });
    });
  });

  test("아이템 목록이 표시돼요", async ({ authenticatedPage: page }) => {
    await page.goto("/shaping/prd");
    await expect(page.locator("main h1")).toContainText("PRD 관리", { timeout: 10000 });
    await expect(page.getByText("AI 헬스케어 플랫폼")).toBeVisible();
  });

  test("아이템 클릭 시 PRD 목록이 마크다운으로 렌더돼요", async ({ authenticatedPage: page }) => {
    await page.goto("/shaping/prd");
    await expect(page.getByText("AI 헬스케어 플랫폼")).toBeVisible({ timeout: 10000 });

    await page.getByText("AI 헬스케어 플랫폼").click();

    await expect(page.getByText("1차 PRD")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("2차 PRD")).toBeVisible();

    // react-markdown으로 렌더된 PRD 본문 — heading "개요"가 실제 <h3>로 표시되는지 확인
    const content = page.getByTestId("prd-content-prd-1");
    await expect(content).toBeVisible({ timeout: 10000 });
    await expect(content.getByRole("heading", { name: "개요" })).toBeVisible();
    await expect(content).toContainText("AI 헬스케어 플랫폼 PRD");
  });

  test("PRD 관리 버튼은 내 아이템 페이지로 이동해요", async ({ authenticatedPage: page }) => {
    await page.goto("/shaping/prd");
    await expect(page.getByText("AI 헬스케어 플랫폼")).toBeVisible({ timeout: 10000 });

    // PRD 관리 링크가 /discovery/items/:id 로 이동 (version 관리 페이지가 아님)
    const link = page.getByRole("link", { name: /PRD 관리/ }).first();
    await expect(link).toHaveAttribute("href", /\/discovery\/items\/item-1$/);
  });

  test("PRD 상태 배지가 올바르게 표시돼요", async ({ authenticatedPage: page }) => {
    await page.goto("/shaping/prd");
    await expect(page.getByText("AI 헬스케어 플랫폼")).toBeVisible({ timeout: 10000 });
    await page.getByText("AI 헬스케어 플랫폼").click();

    // Wait for PRD list to load
    await expect(page.getByText("1차 PRD")).toBeVisible({ timeout: 10000 });

    // Check status badges within the PRD cards
    const prd1Card = page.getByTestId("prd-card-prd-1");
    const prd2Card = page.getByTestId("prd-card-prd-2");
    await expect(prd1Card.getByText("초안")).toBeVisible();
    await expect(prd2Card.getByText("확정")).toBeVisible();
  });

  test("검색 필터가 동작해요", async ({ authenticatedPage: page }) => {
    await page.goto("/shaping/prd");
    await expect(page.getByText("AI 헬스케어 플랫폼")).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder("아이템 검색...").fill("없는 검색어");
    await expect(page.getByText("검색 결과가 없어요.")).toBeVisible();
  });
});
