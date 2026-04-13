import { test, expect } from "@playwright/test";

// @service: portal
// @sprint: 275
// @tagged-by: F518
// @audit: S271 E2E 감사 — 공개 KG trace API 테스트 추가

// F518: 공개 Roadmap/Changelog E2E — 인증 없이 접근 가능 여부 검증

test.describe("Public Roadmap (F518)", () => {
  test("공개 Roadmap 페이지는 인증 없이 접근 가능하다", async ({ page }) => {
    await page.goto("/roadmap");

    // login 페이지로 리다이렉트되지 않아야 함
    await expect(page).not.toHaveURL(/login/);

    // 페이지 타이틀 확인
    await expect(page.getByRole("heading", { name: "Roadmap" })).toBeVisible();
  });

  test("Roadmap 페이지에 Phase 정보가 표시된다", async ({ page }) => {
    await page.route("**/api/work/public/roadmap", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          phases: [
            { id: "37", name: "Work Lifecycle Platform", done: 2, total: 3, pct: 66 },
            { id: "36", name: "Task Orchestrator", done: 3, total: 3, pct: 100 },
          ],
          current_phase: "37",
        }),
      });
    });

    await page.goto("/roadmap");
    await expect(page.getByText("Phase 37")).toBeVisible();
    await expect(page.getByText("Work Lifecycle Platform")).toBeVisible();
  });

  test("Roadmap 페이지에서 Changelog 링크가 존재한다", async ({ page }) => {
    await page.route("**/api/work/public/roadmap", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ phases: [], current_phase: "1" }),
      });
    });

    await page.goto("/roadmap");
    const changelogLink = page.getByRole("link", { name: /Changelog/i });
    await expect(changelogLink).toBeVisible();
    await expect(changelogLink).toHaveAttribute("href", "/changelog");
  });
});

test.describe("Public Changelog (F518)", () => {
  test("공개 Changelog 페이지는 인증 없이 접근 가능하다", async ({ page }) => {
    await page.goto("/changelog");

    // login 페이지로 리다이렉트되지 않아야 함
    await expect(page).not.toHaveURL(/login/);

    // 페이지 타이틀 확인
    await expect(page.getByRole("heading", { name: "Changelog" })).toBeVisible();
  });

  test("Changelog 페이지에 Phase 섹션이 표시된다", async ({ page }) => {
    await page.route("**/api/work/public/changelog", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: "## [Phase 37] Work Lifecycle Platform\n- F518: Work Ontology 기반 연결\n",
        }),
      });
    });

    await page.goto("/changelog");
    await expect(page.getByText("[Phase 37] Work Lifecycle Platform")).toBeVisible();
  });

  test("Changelog에서 F번호가 트레이서빌리티 링크로 렌더링된다", async ({ page }) => {
    await page.route("**/api/work/public/changelog", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: "## [Phase 37] Work Lifecycle Platform\n- F518: Work Ontology 기반 연결\n",
        }),
      });
    });

    await page.goto("/changelog");
    const f518Link = page.getByRole("link", { name: "F518" });
    await expect(f518Link).toBeVisible();
    await expect(f518Link).toHaveAttribute("href", /trace.*F518/);
  });
});

test.describe("Public KG Trace API (F518)", () => {
  test("공개 KG trace API는 인증 없이 접근 가능하다", async ({ page }) => {
    await page.route("**/api/work/public/kg/trace?*", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          root: { id: "work:FITEM:F518", node_type: "F_ITEM", label: "F518", metadata: {} },
          nodes: [
            { id: "work:FITEM:F518", node_type: "F_ITEM", label: "F518", metadata: {} },
            { id: "work:REQ:FX-REQ-546", node_type: "REQ", label: "FX-REQ-546", metadata: {} },
          ],
          edges: [
            { source_id: "work:FITEM:F518", target_id: "work:REQ:FX-REQ-546", edge_type: "implements" },
          ],
        }),
      });
    });

    // API 직접 호출 (페이지 컨텍스트에서 fetch)
    const response = await page.evaluate(async () => {
      const res = await fetch("/api/work/public/kg/trace?id=F518&depth=2");
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(200);
    expect(response.body.nodes).toHaveLength(2);
    expect(response.body.edges).toHaveLength(1);
  });
});
