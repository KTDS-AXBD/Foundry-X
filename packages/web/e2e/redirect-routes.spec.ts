/**
 * E2E: Route Redirect 검증 — 기존 경로 → 새 경로
 * Sprint 122 F300 Phase C + Sprint 139 F322 Phase 13 갱신
 */
import { test, expect } from "./fixtures/auth";

const REDIRECTS = [
  { from: "/sr", to: "/collection/sr" },
  { from: "/discovery/collection", to: "/collection/field" },
  { from: "/ir-proposals", to: "/collection/ideas" },
  { from: "/ax-bd/discovery", to: "/discovery/items" },
  { from: "/ax-bd/ideas-bmc", to: "/discovery/ideas-bmc" },
  { from: "/ax-bd/discover-dashboard", to: "/discovery/dashboard" },
  { from: "/discovery-progress", to: "/discovery/progress" },
  { from: "/spec-generator", to: "/shaping/prd" },
  { from: "/ax-bd", to: "/shaping/proposal" },
  { from: "/ax-bd/shaping", to: "/shaping/review" },
  { from: "/offering-packs", to: "/shaping/offering" },
  { from: "/pipeline", to: "/validation/pipeline" },
  { from: "/mvp-tracking", to: "/product/mvp" },
  { from: "/projects", to: "/gtm/projects" },
  // F322: /discovery는 실제 라우트로 전환 (redirect 아님)
  { from: "/foundry", to: "/external/foundry" },
] as const;

test.describe("Route Redirects (15건)", () => {
  for (const { from, to } of REDIRECTS) {
    test(`${from} → ${to}`, async ({ authenticatedPage: page }) => {
      await page.goto(from);
      await page.waitForURL(`**${to}`, { timeout: 5000 });
      expect(page.url()).toContain(to);
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
