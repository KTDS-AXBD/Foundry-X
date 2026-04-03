/**
 * E2E: F290 Route Redirect 검증 — 기존 경로 → 새 경로 16건
 * Sprint 122 F300 Phase C
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
  { from: "/discovery", to: "/external/discovery-x" },
  { from: "/foundry", to: "/external/foundry" },
] as const;

test.describe("F290 Route Redirects (16건)", () => {
  for (const { from, to } of REDIRECTS) {
    test(`${from} → ${to}`, async ({ authenticatedPage: page }) => {
      await page.goto(from);
      await page.waitForURL(`**${to}`, { timeout: 5000 });
      expect(page.url()).toContain(to);
    });
  }
});
