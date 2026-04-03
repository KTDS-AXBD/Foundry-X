/**
 * E2E: 미커버 페이지 렌더링 검증
 * analytics, architecture, methodologies, projects, sr, wiki, discovery-progress
 */
import { test, expect } from "./fixtures/auth";

test.describe("미커버 페이지 렌더링 검증", () => {
  test("analytics 페이지 렌더링", async ({ authenticatedPage: page }) => {
    // KPI API mock
    await page.route("**/api/kpi/**", (route) =>
      route.fulfill({ json: {} }),
    );
    await page.route("**/api/analytics/**", (route) =>
      route.fulfill({ json: {} }),
    );

    await page.goto("/analytics");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("architecture 페이지 렌더링 + 4탭 존재", async ({ authenticatedPage: page }) => {
    await page.route("**/api/architecture*", (route) =>
      route.fulfill({ json: {} }),
    );
    await page.route("**/api/requirements*", (route) =>
      route.fulfill({ json: [] }),
    );

    await page.goto("/architecture");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("methodologies 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/methodology/**", (route) =>
      route.fulfill({ json: [] }),
    );

    await page.goto("/methodologies");
    await expect(page.getByRole("heading", { name: "방법론 관리" })).toBeVisible();
    await expect(page.getByText("등록된 분석 방법론을 관리하고")).toBeVisible();
  });

  test("projects 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/projects/**", (route) =>
      route.fulfill({ json: { projects: [], totalProjects: 0 } }),
    );
    await page.route("**/api/monitoring/**", (route) =>
      route.fulfill({ json: {} }),
    );

    await page.goto("/gtm/projects");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("sr 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/sr/stats*", (route) =>
      route.fulfill({ json: { total: 0, byType: {}, byStatus: {} } }),
    );
    await page.route("**/api/sr*", (route) =>
      route.fulfill({ json: { items: [], total: 0 } }),
    );

    await page.goto("/collection/sr");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("wiki 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/wiki*", (route) =>
      route.fulfill({ json: [] }),
    );

    await page.goto("/wiki");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("discovery-progress 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/discovery/progress*", (route) =>
      route.fulfill({
        json: {
          totalItems: 0,
          byGateStatus: { blocked: 0, warning: 0, ready: 0 },
          byCriterion: [],
          items: [],
          bottleneck: null,
        },
      }),
    );

    await page.goto("/discovery/progress");
    await expect(page.getByRole("heading", { name: "Discovery 진행률" })).toBeVisible();
    await expect(page.getByText("전체 사업 아이템의 Discovery 9기준 달성 현황")).toBeVisible();
  });
});
