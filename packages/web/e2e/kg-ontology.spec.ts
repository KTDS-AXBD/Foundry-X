/**
 * E2E: KG Ontology 탐색기 — Sprint 92 (F255) + Sprint 93 (F256+F257)
 * API mock 기반 — Property Graph 탐색 + 시나리오 시뮬레이션
 */
import { test, expect } from "./fixtures/auth";

const MOCK_STATS = {
  totalNodes: 12,
  totalEdges: 18,
  nodesByType: { PRODUCT: 4, INDUSTRY: 3, COUNTRY: 2, COMPANY: 3 },
};

const MOCK_NODES = [
  { id: "node-1", orgId: "org-1", type: "PRODUCT", name: "반도체", name_en: "Semiconductor", description: null, metadata: null, created_at: "2026-01-01", updated_at: "2026-01-01" },
  { id: "node-2", orgId: "org-1", type: "INDUSTRY", name: "전자산업", name_en: "Electronics", description: null, metadata: null, created_at: "2026-01-01", updated_at: "2026-01-01" },
];

const MOCK_PRESETS = {
  presets: [
    { id: "preset-1", name: "반도체 공급 위기", nameEn: "Semiconductor Supply Crisis", description: "반도체 공급망 충격 시나리오", eventNodeIds: ["node-1"], category: "semiconductor" },
    { id: "preset-2", name: "에너지 전환", nameEn: "Energy Transition", description: "에너지 전환 시나리오", eventNodeIds: ["node-2"], category: "petrochemical" },
  ],
};

const MOCK_SCENARIO_RESULT = {
  events: [{ id: "node-1", name: "반도체", nameEn: "Semiconductor" }],
  affectedNodes: [
    { id: "node-2", type: "INDUSTRY", name: "전자산업", nameEn: "Electronics", combinedScore: 0.85, impactLevel: "HIGH", eventContributions: [{ eventId: "node-1", eventName: "반도체", score: 0.85 }], eventCount: 1, isHotspot: false },
    { id: "node-3", type: "COMPANY", name: "삼성전자", nameEn: "Samsung", combinedScore: 0.4, impactLevel: "MEDIUM", eventContributions: [{ eventId: "node-1", eventName: "반도체", score: 0.4 }], eventCount: 1, isHotspot: false },
  ],
  hotspots: [],
  totalAffected: 2,
  hotspotCount: 0,
  byLevel: { high: 1, medium: 1, low: 0 },
};

const MOCK_IMPACT = {
  sourceNode: { id: "node-1", type: "PRODUCT", name: "반도체" },
  affected: [
    { id: "node-2", type: "INDUSTRY", name: "전자산업", score: 0.85, level: "HIGH", depth: 1 },
  ],
  totalAffected: 1,
  byLevel: { high: 1, medium: 0, low: 0 },
};

function setupKgMocks(page: import("@playwright/test").Page) {
  return page.route("**/api/ax-bd/kg/**", (route) => {
    const url = route.request().url();
    if (url.includes("/kg/stats")) {
      return route.fulfill({ json: MOCK_STATS });
    }
    if (url.includes("/kg/nodes/search")) {
      return route.fulfill({ json: { items: MOCK_NODES } });
    }
    if (url.match(/\/kg\/nodes(\?|$)/) && !url.includes("/neighbors")) {
      return route.fulfill({ json: { items: MOCK_NODES, total: MOCK_NODES.length } });
    }
    if (url.includes("/kg/nodes/") && url.includes("/neighbors")) {
      return route.fulfill({ json: { nodes: MOCK_NODES, edges: [] } });
    }
    if (url.includes("/kg/impact")) {
      return route.fulfill({ json: MOCK_IMPACT });
    }
    if (url.includes("/kg/path")) {
      return route.fulfill({ json: { paths: [{ nodes: ["node-1", "node-2"], edges: ["e-1"], length: 1 }] } });
    }
    if (url.includes("/kg/seed")) {
      return route.fulfill({ json: { ok: true, nodes: 12, edges: 18 } });
    }
    if (url.includes("/kg/scenario/presets") && !url.includes("/presets/")) {
      return route.fulfill({ json: MOCK_PRESETS });
    }
    if (url.includes("/kg/scenario/simulate")) {
      return route.fulfill({ json: MOCK_SCENARIO_RESULT });
    }
    return route.fulfill({ json: {} });
  });
}

test.describe("KG Ontology 탐색기 (Sprint 92 — F255)", () => {
  test("페이지 렌더링 + 통계 표시", async ({ authenticatedPage: page }) => {
    await setupKgMocks(page);
    await page.goto("/ax-bd/ontology");

    // 타이틀
    await expect(page.locator("h1")).toContainText("Ontology 탐색기");

    // 통계 배지
    await expect(page.getByText("노드 12")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("관계 18")).toBeVisible();
  });

  test("시드 데이터 로드 버튼", async ({ authenticatedPage: page }) => {
    await setupKgMocks(page);
    await page.goto("/ax-bd/ontology");

    const seedBtn = page.getByRole("button", { name: /시드 데이터 로드/ });
    await expect(seedBtn).toBeVisible({ timeout: 10000 });
    await seedBtn.click();

    // 로드 후 통계가 다시 표시됨
    await expect(page.getByText("노드 12")).toBeVisible({ timeout: 10000 });
  });

  test("노드 검색", async ({ authenticatedPage: page }) => {
    await setupKgMocks(page);
    await page.goto("/ax-bd/ontology");

    // KgNodeSearch는 마운트 시 자동 로드 (debounce 300ms)
    // 노드 목록이 왼쪽 패널에 표시됨
    await expect(page.getByText("반도체").first()).toBeVisible({ timeout: 10000 });

    // 검색 입력으로 필터링
    const searchInput = page.locator("input[placeholder]").first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill("전자");

    // debounce 후 결과 갱신 — 전자산업 표시
    await expect(page.getByText("전자산업").first()).toBeVisible({ timeout: 10000 });
  });

  test("탭 2개 표시 (Explorer + Scenario)", async ({ authenticatedPage: page }) => {
    await setupKgMocks(page);
    await page.goto("/ax-bd/ontology");

    // 탐색기 탭 (기본 활성)
    const explorerTab = page.getByRole("button", { name: /탐색기/ }).or(page.locator("button").filter({ hasText: "탐색기" }));
    await expect(explorerTab).toBeVisible({ timeout: 10000 });

    // 시나리오 탭
    const scenarioTab = page.getByRole("button", { name: /시나리오/ }).or(page.locator("button").filter({ hasText: "시나리오" }));
    await expect(scenarioTab).toBeVisible();
  });
});

test.describe("KG 시나리오 시뮬레이션 (Sprint 93 — F256)", () => {
  test("시나리오 탭 전환 + 프리셋 목록", async ({ authenticatedPage: page }) => {
    await setupKgMocks(page);
    await page.goto("/ax-bd/ontology");

    // 시나리오 탭 클릭
    const scenarioTab = page.locator("button").filter({ hasText: "시나리오" });
    await expect(scenarioTab).toBeVisible({ timeout: 10000 });
    await scenarioTab.click();

    // 프리셋 카드 표시
    await expect(page.getByText("반도체 공급 위기")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("에너지 전환").first()).toBeVisible();
  });

  test("프리셋 선택 + 시뮬레이션 실행", async ({ authenticatedPage: page }) => {
    await setupKgMocks(page);
    await page.goto("/ax-bd/ontology");

    // 시나리오 탭 전환
    await page.locator("button").filter({ hasText: "시나리오" }).click();
    await expect(page.getByText("반도체 공급 위기")).toBeVisible({ timeout: 10000 });

    // 프리셋 카드 클릭
    await page.getByText("반도체 공급 위기").click();

    // 시뮬레이션 실행 버튼
    const runBtn = page.getByRole("button", { name: /시뮬레이션|실행|simulate/i });
    await expect(runBtn).toBeVisible({ timeout: 5000 });
    await runBtn.click();

    // 결과 표시: 영향 노드
    await expect(page.getByText("전자산업").first()).toBeVisible({ timeout: 10000 });
  });

  test("시뮬레이션 결과 영향도 배지 표시", async ({ authenticatedPage: page }) => {
    await setupKgMocks(page);
    await page.goto("/ax-bd/ontology");

    await page.locator("button").filter({ hasText: "시나리오" }).click();
    await expect(page.getByText("반도체 공급 위기")).toBeVisible({ timeout: 10000 });
    await page.getByText("반도체 공급 위기").click();

    const runBtn = page.getByRole("button", { name: /시뮬레이션|실행|simulate/i });
    await expect(runBtn).toBeVisible({ timeout: 5000 });
    await runBtn.click();

    // HIGH / MEDIUM 배지 확인
    await expect(page.getByText("HIGH").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("MEDIUM").first()).toBeVisible();
  });
});
