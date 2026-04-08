/**
 * E2E: Discovery 편집기 — F444 기획서 생성→편집→저장 흐름
 * 시나리오: 형상화 탭에서 편집 버튼 → 섹션 편집 → 저장 → 뷰어 복귀
 *
 * @service: foundry-x
 * @sprint: 215
 * @tagged-by: F444
 */
import { test, expect } from "./fixtures/auth";

const MOCK_BIZ_ITEM = {
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

const MOCK_BDP = {
  id: "bdp-1",
  bizItemId: "biz-1",
  versionNum: 1,
  content: "# AI 문서 자동화 사업기획서\n\n## 개요\n본 사업은 문서 자동 분류 및 요약 서비스입니다.",
  isFinal: false,
  createdBy: "test-user-id",
  createdAt: "2026-04-07T00:00:00Z",
};

const MOCK_SECTIONS = {
  sections: [
    { id: "sec-1", draftId: "draft-1", bizItemId: "biz-1", sectionNum: 1, title: "사업 개요", content: "AI 기반 문서 자동화 사업입니다.", updatedAt: null },
    { id: "sec-2", draftId: "draft-1", bizItemId: "biz-1", sectionNum: 2, title: "시장 분석", content: "문서 자동화 시장은 연 20% 성장 중입니다.", updatedAt: null },
    { id: "sec-3", draftId: "draft-1", bizItemId: "biz-1", sectionNum: 3, title: "수익 모델", content: "SaaS 구독 모델로 운영합니다.", updatedAt: null },
  ],
};

const MOCK_SAVED_RESULT = {
  id: "bdp-2",
  bizItemId: "biz-1",
  versionNum: 2,
  content: "# AI 문서 자동화 사업기획서 (수정본)",
  createdAt: "2026-04-08T00:00:00Z",
};

const MOCK_PIPELINE_DETAIL = {
  id: "pipe-1",
  title: "AI 문서 자동화",
  currentStage: "FORMALIZATION",
  stageEnteredAt: "2026-04-05T00:00:00Z",
  stageHistory: [
    { id: "h1", bizItemId: "biz-1", stage: "DISCOVERY", enteredAt: "2026-03-20T00:00:00Z", exitedAt: "2026-04-05T00:00:00Z", enteredBy: "test-user-id", notes: null },
    { id: "h2", bizItemId: "biz-1", stage: "FORMALIZATION", enteredAt: "2026-04-05T00:00:00Z", exitedAt: null, enteredBy: "test-user-id", notes: null },
  ],
};

async function setupEditorMocks(page: import("@playwright/test").Page) {
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
      if (route.request().method() === "GET") return route.fulfill({ json: MOCK_BIZ_ITEM });
      return route.continue();
    }),
    page.route("**/api/biz-items", (route) => {
      if (route.request().method() === "GET")
        return route.fulfill({ json: { items: [MOCK_BIZ_ITEM], total: 1, page: 1, limit: 20 } });
      return route.continue();
    }),
    page.route("**/api/biz-items/biz-1/shaping-artifacts", (route) =>
      route.fulfill({ json: { businessPlan: { versionNum: 1, createdAt: "2026-04-07T00:00:00Z" }, offering: null, prd: null, prototype: null } }),
    ),
    page.route("**/api/biz-items/biz-1/discovery-criteria", (route) =>
      route.fulfill({ json: { total: 9, completed: 3, gateStatus: "warning", criteria: [] } }),
    ),
    page.route("**/api/biz-items/biz-1/next-guide", (route) =>
      route.fulfill({ json: { step: "2-3", description: "mock" } }),
    ),
    page.route("**/api/biz-items/biz-1/discovery-progress", (route) =>
      route.fulfill({ json: { stages: [], currentStage: null, completedCount: 0, totalCount: 0 } }),
    ),
    page.route("**/api/bdp/biz-1", (route) =>
      route.fulfill({ json: MOCK_BDP }),
    ),
    page.route("**/api/pipeline/items/biz-1", (route) =>
      route.fulfill({ json: MOCK_PIPELINE_DETAIL }),
    ),
    page.route("**/api/help-agent/**", (route) =>
      route.fulfill({ json: { content: "mock" } }),
    ),
  ]);
}

test.describe("F444 — 기획서 편집기 E2E", () => {
  test("편집 버튼 클릭 → 편집 모드 진입 + 섹션 textarea 표시", async ({ authenticatedPage: page }) => {
    await setupEditorMocks(page);

    // 섹션 API mock
    await page.route("**/api/biz-items/biz-1/business-plan/sections", (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: MOCK_SECTIONS });
      return route.continue();
    });

    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });

    // 형상화 탭 이동
    await page.getByRole("tab", { name: "형상화" }).click();
    await expect(page.getByText("사업기획서").first()).toBeVisible({ timeout: 10000 });

    // 편집 버튼 클릭
    await page.getByRole("button", { name: "편집" }).click();

    // 편집 모드 진입 확인 — "편집 모드" 배지
    await expect(page.getByText("편집 모드")).toBeVisible({ timeout: 5000 });

    // 3개 섹션 textarea 표시
    await expect(page.getByLabel("섹션 1: 사업 개요")).toBeVisible();
    await expect(page.getByLabel("섹션 2: 시장 분석")).toBeVisible();
    await expect(page.getByLabel("섹션 3: 수익 모델")).toBeVisible();

    // 섹션 번호 표시
    await expect(page.getByText("§1")).toBeVisible();
    await expect(page.getByText("§2")).toBeVisible();
    await expect(page.getByText("§3")).toBeVisible();

    // 저장/취소 버튼 표시
    await expect(page.getByRole("button", { name: /저장/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /취소/ })).toBeVisible();
  });

  test("섹션 편집 → 변경사항 표시 + 저장 버튼 활성화", async ({ authenticatedPage: page }) => {
    await setupEditorMocks(page);
    await page.route("**/api/biz-items/biz-1/business-plan/sections", (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: MOCK_SECTIONS });
      return route.continue();
    });

    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: "형상화" }).click();
    await expect(page.getByText("사업기획서").first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "편집" }).click();
    await expect(page.getByText("편집 모드")).toBeVisible({ timeout: 5000 });

    // 저장 버튼은 처음에 비활성 (변경사항 없음)
    const saveBtn = page.getByRole("button", { name: /^저장$/ });
    await expect(saveBtn).toBeDisabled();

    // 섹션 1 편집
    const section1 = page.getByLabel("섹션 1: 사업 개요");
    await section1.fill("AI 기반 문서 자동화 사업입니다. (수정됨)");

    // 변경사항 표시
    await expect(page.getByText("저장되지 않은 변경사항이 있어요")).toBeVisible();

    // 저장 버튼 활성화
    await expect(saveBtn).toBeEnabled();
  });

  test("편집 후 저장 → 뷰어 모드 복귀", async ({ authenticatedPage: page }) => {
    await setupEditorMocks(page);
    await page.route("**/api/biz-items/biz-1/business-plan/sections", (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: MOCK_SECTIONS });
      return route.continue();
    });

    // 섹션 업데이트 API
    await page.route("**/api/biz-items/biz-1/business-plan/sections/*", (route) => {
      if (route.request().method() === "PATCH") return route.fulfill({ json: { success: true } });
      return route.continue();
    });

    // 저장 API
    await page.route("**/api/biz-items/biz-1/business-plan/save", (route) => {
      if (route.request().method() === "POST") return route.fulfill({ json: MOCK_SAVED_RESULT });
      return route.continue();
    });

    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: "형상화" }).click();
    await expect(page.getByText("사업기획서").first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "편집" }).click();
    await expect(page.getByText("편집 모드")).toBeVisible({ timeout: 5000 });

    // 섹션 편집
    await page.getByLabel("섹션 1: 사업 개요").fill("수정된 사업 개요");

    // 저장 클릭
    await page.getByRole("button", { name: /^저장$/ }).click();

    // 편집 모드 종료 — "편집 모드" 배지 사라짐
    await expect(page.getByText("편집 모드")).not.toBeVisible({ timeout: 5000 });

    // 뷰어 모드 복귀 — 편집/재생성 버튼 다시 표시
    await expect(page.getByRole("button", { name: "편집" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "사업기획서 재생성" })).toBeVisible();
  });

  test("취소 버튼 → 변경 취소 + 뷰어 복귀", async ({ authenticatedPage: page }) => {
    await setupEditorMocks(page);
    await page.route("**/api/biz-items/biz-1/business-plan/sections", (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: MOCK_SECTIONS });
      return route.continue();
    });

    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: "형상화" }).click();
    await expect(page.getByText("사업기획서").first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "편집" }).click();
    await expect(page.getByText("편집 모드")).toBeVisible({ timeout: 5000 });

    // 편집 후 취소
    await page.getByLabel("섹션 1: 사업 개요").fill("이건 취소될 텍스트");
    await page.getByRole("button", { name: /취소/ }).click();

    // 뷰어 모드 복귀
    await expect(page.getByText("편집 모드")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "편집" })).toBeVisible({ timeout: 5000 });
  });

  test("AI 재생성 버튼 → 섹션 콘텐츠 갱신", async ({ authenticatedPage: page }) => {
    await setupEditorMocks(page);
    await page.route("**/api/biz-items/biz-1/business-plan/sections", (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: MOCK_SECTIONS });
      return route.continue();
    });

    // 재생성 API
    await page.route("**/api/biz-items/biz-1/business-plan/sections/1/regenerate", (route) => {
      if (route.request().method() === "POST")
        return route.fulfill({ json: { sectionNum: 1, content: "AI가 재생성한 사업 개요 내용" } });
      return route.continue();
    });
    // 재생성 후 서버 반영
    await page.route("**/api/biz-items/biz-1/business-plan/sections/1", (route) => {
      if (route.request().method() === "PATCH") return route.fulfill({ json: { success: true } });
      return route.continue();
    });

    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: "형상화" }).click();
    await expect(page.getByText("사업기획서").first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "편집" }).click();
    await expect(page.getByText("편집 모드")).toBeVisible({ timeout: 5000 });

    // AI 재생성 버튼 클릭 (첫 번째 섹션)
    const regenButtons = page.getByRole("button", { name: "AI 재생성" });
    await regenButtons.first().click();

    // 재생성된 콘텐츠가 textarea에 반영
    await expect(page.getByLabel("섹션 1: 사업 개요")).toHaveValue("AI가 재생성한 사업 개요 내용", { timeout: 5000 });
  });
});
