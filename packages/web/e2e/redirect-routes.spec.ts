/**
 * E2E: Route Redirect 검증 — 기존 경로 → 새 경로
 * Sprint 122 F300 Phase C + Sprint 139 F322 Phase 13 갱신
 * Sprint 209 F434: 1/4/5/6단계 제거, 구 단축 경로 → /discovery
 */
import { test, expect } from "./fixtures/auth";

// @service: infra/shared
// @sprint: 209
// @tagged-by: F434

// F434: 구 1/4/5/6단계 단축 경로가 /discovery로 변경됨
const REDIRECTS_TO_DISCOVERY = [
  { from: "/sr" },
  { from: "/pipeline" },
  { from: "/mvp-tracking" },
  { from: "/projects" },
] as const;

// 여전히 유효한 경로 리다이렉트
const REDIRECTS_VALID = [
  { from: "/ax-bd/discovery", to: "/discovery/items" },
  { from: "/ax-bd/ideas-bmc", to: "/discovery/ideas-bmc" },
  { from: "/ax-bd/discover-dashboard", to: "/discovery/dashboard" },
  { from: "/discovery-progress", to: "/discovery/progress" },
  { from: "/spec-generator", to: "/shaping/prd" },
  { from: "/ax-bd", to: "/shaping/proposal" },
  { from: "/ax-bd/shaping", to: "/shaping/review" },
  { from: "/offering-packs", to: "/shaping/offering" },
] as const;

test.describe("Route Redirects — 유효한 경로", () => {
  for (const { from, to } of REDIRECTS_VALID) {
    test(`${from} → ${to}`, async ({ authenticatedPage: page }) => {
      await page.goto(from);
      await page.waitForURL(`**${to}`, { timeout: 5000 });
      expect(page.url()).toContain(to);
    });
  }
});

test.describe("F434 — 구 1/4/5/6단계 단축 경로 → /discovery", () => {
  for (const { from } of REDIRECTS_TO_DISCOVERY) {
    test(`${from} → /discovery`, async ({ authenticatedPage: page }) => {
      await page.goto(from);
      await page.waitForURL("**/discovery", { timeout: 5000 });
      expect(page.url()).toContain("/discovery");
    });
  }
});

test.describe("F322 Phase 13 — /discovery is direct route", () => {
  test("/discovery loads discover dashboard (not redirect)", async ({ authenticatedPage: page }) => {
    await page.goto("/discovery");
    expect(page.url()).toContain("/discovery");
    await expect(page.locator("h1, h2, [data-testid]").first()).toBeVisible({ timeout: 5000 });
  });
});

// ── F434: 제거된 경로 catch-all 리다이렉트 검증 ──

test.describe("F434 — collection/validation/product/gtm → /discovery (catch-all)", () => {
  test("collection/field → /discovery", async ({ authenticatedPage: page }) => {
    await page.goto("/collection/field");
    await page.waitForURL("**/discovery", { timeout: 5000 });
    expect(page.url()).toContain("/discovery");
  });

  test("validation/pipeline → /discovery", async ({ authenticatedPage: page }) => {
    await page.goto("/validation/pipeline");
    await page.waitForURL("**/discovery", { timeout: 5000 });
    expect(page.url()).toContain("/discovery");
  });

  test("product/mvp → /discovery", async ({ authenticatedPage: page }) => {
    await page.goto("/product/mvp");
    await page.waitForURL("**/discovery", { timeout: 5000 });
    expect(page.url()).toContain("/discovery");
  });

  test("gtm/outreach → /discovery", async ({ authenticatedPage: page }) => {
    await page.goto("/gtm/outreach");
    await page.waitForURL("**/discovery", { timeout: 5000 });
    expect(page.url()).toContain("/discovery");
  });
});
