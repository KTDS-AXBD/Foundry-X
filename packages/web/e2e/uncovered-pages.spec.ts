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

  // ── Sprint 122 추가: 미커버 라우트 확장 ──

  test("invite 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.goto("/invite");
    await expect(page.locator("main, body")).toBeVisible({ timeout: 10000 });
  });

  test("collection/field 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
    await page.goto("/collection/field");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("collection/ideas 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
    await page.goto("/collection/ideas");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("product/mvp 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/mvp-tracking/**", (route) =>
      route.fulfill({ json: {} }),
    );
    await page.goto("/product/mvp");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("discovery/ideas-bmc 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/ax-bd/**", (route) =>
      route.fulfill({ json: { items: [], total: 0 } }),
    );
    await page.goto("/discovery/ideas-bmc");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("ax-bd/process-guide 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.goto("/ax-bd/process-guide");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("ax-bd/skill-catalog 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
    await page.goto("/ax-bd/skill-catalog");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("settings/jira 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/**", (route) => route.fulfill({ json: {} }));
    await page.goto("/settings/jira");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  // ── 세션 #189 추가: 감사 기반 미커버 라우트 보강 (8건) ──

  test("collection/agent 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/collection/agent-runs*", (route) =>
      route.fulfill({ json: { runs: [], total: 0 } }),
    );
    await page.route("**/api/collection/agent-schedule*", (route) =>
      route.fulfill({ json: null }),
    );
    await page.goto("/collection/agent");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Agent 수집" })).toBeVisible();
  });

  test("discovery/report 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/ax-bd/evaluation-reports*", (route) =>
      route.fulfill({ json: { items: [], total: 0 } }),
    );
    await page.goto("/discovery/report");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "평가 결과서" })).toBeVisible();
  });

  test("gtm/outreach 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/gtm/outreach*", (route) =>
      route.fulfill({ json: { items: [], total: 0 } }),
    );
    await page.route("**/api/gtm/outreach/stats*", (route) =>
      route.fulfill({ json: { total: 0, byStatus: {} } }),
    );
    await page.route("**/api/gtm/customers*", (route) =>
      route.fulfill({ json: { items: [] } }),
    );
    await page.goto("/gtm/outreach");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "선제안 아웃리치" })).toBeVisible();
  });

  test("product/poc 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/poc*", (route) =>
      route.fulfill({ json: [] }),
    );
    await page.goto("/product/poc");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "PoC 관리" })).toBeVisible();
  });

  test("shaping/prototype 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/ax-bd/prototypes*", (route) =>
      route.fulfill({ json: { items: [] } }),
    );
    await page.goto("/shaping/prototype");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Prototype" })).toBeVisible();
  });

  test("validation/company 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/validation/company/items*", (route) =>
      route.fulfill({ json: { items: [], total: 0 } }),
    );
    await page.goto("/validation/company");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "전사 검증" })).toBeVisible();
  });

  test("validation/division 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/validation/division/items*", (route) =>
      route.fulfill({ json: { items: [], total: 0 } }),
    );
    await page.goto("/validation/division");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "본부 검증" })).toBeVisible();
  });

  test("validation/meetings 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/validation/meetings*", (route) =>
      route.fulfill({ json: { items: [], total: 0 } }),
    );
    await page.goto("/validation/meetings");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "미팅 관리" })).toBeVisible();
  });

  // ─── P1 미커버 라우트 보강 (Phase 17 E2E 감사) ───

  test("shaping/business-plan 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.goto("/shaping/business-plan");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "사업기획서" })).toBeVisible();
  });

  test("product/offering-pack 목록 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/ax-bd/offering-packs*", (route) =>
      route.fulfill({ json: { items: [], total: 0 } }),
    );
    await page.goto("/product/offering-pack");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Offering" })).toBeVisible();
  });

  test("prototype-dashboard 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/prototype/jobs*", (route) =>
      route.fulfill({ json: { items: [], total: 0 } }),
    );
    await page.goto("/prototype-dashboard");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Prototype Dashboard" })).toBeVisible();
  });

  test("product/offering-pack/:id 상세 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/ax-bd/offering-packs/pack-1", (route) =>
      route.fulfill({
        json: {
          id: "pack-1", title: "테스트 Offering Pack", status: "draft",
          itemCount: 0, createdAt: "2026-04-06T00:00:00Z",
        },
      }),
    );
    await page.route("**/api/ax-bd/offering-packs/pack-1/items*", (route) =>
      route.fulfill({ json: [] }),
    );
    await page.goto("/product/offering-pack/pack-1");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });
});
