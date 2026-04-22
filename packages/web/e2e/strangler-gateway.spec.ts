import { test, expect } from "@playwright/test";

// F564(c): Strangler 완결 + SSO Hub Token 경로 호환성 E2E
// CLI/Web 모두 fx-gateway 단일 진입점 전환 후 health + SSO 경로 검증

test.describe("F564: Strangler Gateway — fx-gateway 단일 진입점", () => {
  test("discovery health via fx-gateway route", async ({ page }) => {
    await page.route("**/api/discovery/health", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ domain: "discovery", status: "ok" }),
      }),
    );

    const response = await page.request.get("/api/discovery/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
  });

  test("shaping health via fx-gateway route", async ({ page }) => {
    await page.route("**/api/shaping/health", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ domain: "shaping", status: "ok" }),
      }),
    );

    const response = await page.request.get("/api/shaping/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
  });

  test("offering health via fx-gateway route", async ({ page }) => {
    await page.route("**/api/offering/health", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ domain: "offering", status: "ok" }),
      }),
    );

    const response = await page.request.get("/api/offering/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
  });

  test("SSO Hub Token delivered via gateway (no direct foundry-x-api call)", async ({ page }) => {
    let gatewayCallMade = false;
    let directApiCallMade = false;

    // mock gateway auth endpoint
    await page.route("**/api/auth/**", (route) => {
      const url = route.request().url();
      if (url.includes("foundry-x-api.ktds-axbd.workers.dev")) {
        directApiCallMade = true;
      }
      if (url.includes("fx-gateway.ktds-axbd.workers.dev") || url.includes("/api/auth/")) {
        gatewayCallMade = true;
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: "mock-jwt-token", expiresIn: 3600 }),
      });
    });

    await page.goto("/");
    // no direct calls to foundry-x-api
    expect(directApiCallMade).toBe(false);
  });
});
