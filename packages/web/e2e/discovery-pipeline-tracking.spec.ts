/**
 * E2E: 파이프라인 추적 — F447 스테퍼 + F448 단계 전환 CTA
 * 시나리오: 스테퍼 4단계 표시 → CTA 조건 분기 → 클릭 → 단계 전환 확인
 *
 * @service: foundry-x
 * @sprint: 217
 * @tagged-by: F447 F448
 */
import { test, expect } from "./fixtures/auth";

const MOCK_BIZ_ITEM_ANALYZED = {
  id: "biz-1",
  title: "AI 문서 자동화",
  description: "문서 자동 분류 및 요약 서비스",
  discoveryType: "I",
  status: "analyzed",
  source: "wizard",
  orgId: "test-org-e2e",
  authorId: "test-user-id",
  classification: null,
  createdBy: "test-user-id",
  createdAt: "2026-03-20T00:00:00Z",
  updatedAt: "2026-03-30T00:00:00Z",
};

const MOCK_PIPELINE_DISCOVERY = {
  id: "pipe-1",
  title: "AI 문서 자동화",
  currentStage: "DISCOVERY",
  stageEnteredAt: "2026-03-20T00:00:00Z",
  stageHistory: [
    { id: "h1", bizItemId: "biz-1", stage: "DISCOVERY", enteredAt: "2026-03-20T00:00:00Z", exitedAt: null, enteredBy: "test-user-id", notes: null },
  ],
};

const MOCK_PIPELINE_FORMALIZATION = {
  id: "pipe-1",
  title: "AI 문서 자동화",
  currentStage: "FORMALIZATION",
  stageEnteredAt: "2026-04-05T00:00:00Z",
  stageHistory: [
    { id: "h1", bizItemId: "biz-1", stage: "DISCOVERY", enteredAt: "2026-03-20T00:00:00Z", exitedAt: "2026-04-05T00:00:00Z", enteredBy: "test-user-id", notes: null },
    { id: "h2", bizItemId: "biz-1", stage: "FORMALIZATION", enteredAt: "2026-04-05T00:00:00Z", exitedAt: null, enteredBy: "test-user-id", notes: null },
  ],
};

const MOCK_PIPELINE_OFFERING = {
  id: "pipe-1",
  title: "AI 문서 자동화",
  currentStage: "OFFERING",
  stageEnteredAt: "2026-04-06T00:00:00Z",
  stageHistory: [
    { id: "h1", bizItemId: "biz-1", stage: "DISCOVERY", enteredAt: "2026-03-20T00:00:00Z", exitedAt: "2026-04-05T00:00:00Z", enteredBy: "test-user-id", notes: null },
    { id: "h2", bizItemId: "biz-1", stage: "FORMALIZATION", enteredAt: "2026-04-05T00:00:00Z", exitedAt: "2026-04-06T00:00:00Z", enteredBy: "test-user-id", notes: null },
    { id: "h3", bizItemId: "biz-1", stage: "OFFERING", enteredAt: "2026-04-06T00:00:00Z", exitedAt: null, enteredBy: "test-user-id", notes: null },
  ],
};

async function setupPipelineMocks(
  page: import("@playwright/test").Page,
  opts: {
    pipelineDetail: typeof MOCK_PIPELINE_DISCOVERY;
    bizItem?: typeof MOCK_BIZ_ITEM_ANALYZED;
    hasBusinessPlan?: boolean;
  },
) {
  const { pipelineDetail, bizItem = MOCK_BIZ_ITEM_ANALYZED, hasBusinessPlan = false } = opts;

  await Promise.all([
    page.evaluate(() => {
      localStorage.setItem("fx-discovery-tour-completed", "true");
      localStorage.setItem("fx-tour-completed", "true");
    }),
    page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = "[aria-label='피드백 보내기'] { display: none !important; }";
      document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
    }),
    page.route("**/api/biz-items/biz-1", (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: bizItem });
      return route.continue();
    }),
    page.route("**/api/biz-items", (route) => {
      if (route.request().method() === "GET")
        return route.fulfill({ json: { items: [bizItem], total: 1, page: 1, limit: 20 } });
      return route.continue();
    }),
    page.route("**/api/biz-items/biz-1/shaping-artifacts", (route) =>
      route.fulfill({
        json: hasBusinessPlan
          ? { businessPlan: { versionNum: 1, createdAt: "2026-04-07T00:00:00Z" }, offering: null, prd: null, prototype: null }
          : { businessPlan: null, offering: null, prd: null, prototype: null },
      }),
    ),
    page.route("**/api/biz-items/biz-1/discovery-criteria", (route) =>
      route.fulfill({ json: { total: 9, completed: 9, gateStatus: "passed", criteria: [] } }),
    ),
    page.route("**/api/biz-items/biz-1/next-guide", (route) =>
      route.fulfill({ json: { step: null, description: "모든 분석이 완료됐어요." } }),
    ),
    page.route("**/api/biz-items/biz-1/discovery-progress", (route) =>
      route.fulfill({ json: { stages: [], currentStage: null, completedCount: 0, totalCount: 0 } }),
    ),
    page.route("**/api/bdp/biz-1", (route) =>
      route.fulfill(
        hasBusinessPlan
          ? { json: { id: "bdp-1", bizItemId: "biz-1", versionNum: 1, content: "# 기획서", isFinal: false, createdBy: "test-user-id", createdAt: "2026-04-07T00:00:00Z" } }
          : { json: { error: "not found" }, status: 404 },
      ),
    ),
    page.route("**/api/pipeline/items/biz-1", (route) =>
      route.fulfill({ json: pipelineDetail }),
    ),
    page.route(/\/api\/files(\?|$)/, (route) =>
      route.fulfill({ json: { files: [] } }),
    ),
    page.route("**/api/help-agent/**", (route) =>
      route.fulfill({ json: { content: "mock" } }),
    ),
  ]);
}

test.describe("F447 — 파이프라인 스테퍼 표시", () => {
  test("DISCOVERY 단계 — 1단계 현재, 나머지 미래", async ({ authenticatedPage: page }) => {
    await setupPipelineMocks(page, { pipelineDetail: MOCK_PIPELINE_DISCOVERY });
    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });

    // 파이프라인 진행률 헤딩
    await expect(page.getByText("파이프라인 진행률")).toBeVisible();

    // F495: 2단계만 표시 (Offering/MVP 제거)
    await expect(page.getByText("발굴").first()).toBeVisible();
    await expect(page.getByText("형상화").first()).toBeVisible();

    // 현재 단계 (발굴) — blue 스타일의 원
    const stepperArea = page.locator(".rounded-lg.border.bg-card").filter({ hasText: "파이프라인 진행률" });
    await expect(stepperArea.locator(".ring-blue-100")).toBeAttached();

    // 진입 날짜 표시
    await expect(stepperArea.getByText(/3월/)).toBeVisible();
  });

  test("FORMALIZATION 단계 — 발굴 완료(체크), 형상화 현재", async ({ authenticatedPage: page }) => {
    await setupPipelineMocks(page, { pipelineDetail: MOCK_PIPELINE_FORMALIZATION });
    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });

    const stepperArea = page.locator(".rounded-lg.border.bg-card").filter({ hasText: "파이프라인 진행률" });

    // 발굴 단계 완료 — green 체크 아이콘 (bg-green-500)
    await expect(stepperArea.locator(".bg-green-500").first()).toBeAttached();

    // 형상화 단계 현재 — blue ring
    await expect(stepperArea.locator(".ring-blue-100")).toBeAttached();

    // 완료 구간 연결선 (bg-green-500)
    await expect(stepperArea.locator(".bg-green-500").first()).toBeAttached();
  });

  test.skip("OFFERING 단계 — F495: Offering/MVP 단계 제거됨 (2단계로 축소)", async ({ authenticatedPage: page }) => {
    await setupPipelineMocks(page, { pipelineDetail: MOCK_PIPELINE_OFFERING });
    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });

    const stepperArea = page.locator(".rounded-lg.border.bg-card").filter({ hasText: "파이프라인 진행률" });

    // F495: 2단계만 표시되므로 완료 노드는 최대 2개
    const greenNodes = stepperArea.locator(".bg-green-500");
    await expect(greenNodes).toHaveCount(2);

    // 현재 단계 ring
    await expect(stepperArea.locator(".ring-blue-200")).toBeAttached();
  });
});

test.describe("F448 — 파이프라인 단계 전환 CTA", () => {
  test("발굴 완료 + DISCOVERY 단계 → 형상화 전환 CTA 표시", async ({ authenticatedPage: page }) => {
    await setupPipelineMocks(page, {
      pipelineDetail: MOCK_PIPELINE_DISCOVERY,
      bizItem: { ...MOCK_BIZ_ITEM_ANALYZED, status: "analyzed" },
    });
    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });

    // 발굴분석 탭에서 CTA 표시
    await page.getByRole("tab", { name: "발굴분석" }).click();

    // CTA 텍스트
    await expect(page.getByText("발굴 분석 완료 — 형상화를 시작할 수 있어요")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("9기준 발굴 분석이 완료됐어요")).toBeVisible();

    // 전환 버튼
    await expect(page.getByRole("button", { name: "형상화 단계로 이동" })).toBeVisible();
  });

  test("형상화 단계 전환 CTA 클릭 → API 호출 + 처리 중 표시", async ({ authenticatedPage: page }) => {
    let advanceCalled = false;
    await setupPipelineMocks(page, {
      pipelineDetail: MOCK_PIPELINE_DISCOVERY,
      bizItem: { ...MOCK_BIZ_ITEM_ANALYZED, status: "analyzed" },
    });

    // 단계 전환 API mock
    await page.route("**/api/pipeline/items/biz-1/stage", (route) => {
      if (route.request().method() === "PATCH") {
        advanceCalled = true;
        return route.fulfill({ json: { success: true } });
      }
      return route.continue();
    });

    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: "발굴분석" }).click();
    await expect(page.getByText("형상화를 시작할 수 있어요")).toBeVisible({ timeout: 5000 });

    // 응답 대기를 먼저 설정한 뒤 클릭 (race condition 방지)
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/pipeline/items/biz-1/stage"),
      { timeout: 10000 },
    );
    await page.getByRole("button", { name: "형상화 단계로 이동" }).click();
    await responsePromise;
    expect(advanceCalled).toBe(true);
  });

  test("형상화 + 기획서 있음 → Offering 전환 CTA 표시", async ({ authenticatedPage: page }) => {
    await setupPipelineMocks(page, {
      pipelineDetail: MOCK_PIPELINE_FORMALIZATION,
      bizItem: { ...MOCK_BIZ_ITEM_ANALYZED, status: "shaping" },
      hasBusinessPlan: true,
    });

    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: "발굴분석" }).click();

    // Offering CTA
    await expect(page.getByText("사업기획서 완성 — Offering 단계로 이동해요")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "Offering 단계로 이동" })).toBeVisible();
  });

  test("분석 미완료(draft) + DISCOVERY → CTA 미표시", async ({ authenticatedPage: page }) => {
    await setupPipelineMocks(page, {
      pipelineDetail: MOCK_PIPELINE_DISCOVERY,
      bizItem: { ...MOCK_BIZ_ITEM_ANALYZED, status: "draft" },
    });

    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: "발굴분석" }).click();

    // 분석 스텝퍼는 보이지만 CTA는 없음
    await expect(page.getByText("발굴 분석 실행")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("형상화를 시작할 수 있어요")).not.toBeVisible();
  });

  test("단계 전환 실패 → 에러 메시지 표시", async ({ authenticatedPage: page }) => {
    await setupPipelineMocks(page, {
      pipelineDetail: MOCK_PIPELINE_DISCOVERY,
      bizItem: { ...MOCK_BIZ_ITEM_ANALYZED, status: "analyzed" },
    });

    // 전환 API 실패
    await page.route("**/api/pipeline/items/biz-1/stage", (route) => {
      if (route.request().method() === "PATCH")
        return route.fulfill({ status: 500, json: { error: "서버 오류" } });
      return route.continue();
    });

    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: "발굴분석" }).click();
    await expect(page.getByText("형상화를 시작할 수 있어요")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "형상화 단계로 이동" }).click();

    // 에러 메시지 표시 (patchApi가 HTTP 에러를 throw하므로 500/서버 관련 텍스트)
    await expect(page.locator("text=/실패|500|서버|Error/")).toBeVisible({ timeout: 5000 });
  });
});
