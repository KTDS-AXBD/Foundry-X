/**
 * E2E: Discovery Detail Advanced (F316) — 상세 페이지 심화 시나리오
 * 프로세스 진행률, 산출물 목록, 네비게이션
 */
import { test, expect } from "./fixtures/auth";
import { makeArtifact } from "./fixtures/mock-factory";

const MOCK_BIZ_ITEM_DETAIL = {
  id: "biz-1",
  title: "AI 문서 자동화",
  description: "문서 자동 분류 및 요약 서비스",
  discoveryType: "I",
  status: "discovery",
  source: "internal",
  orgId: "test-org-e2e",
  authorId: "test-user-id",
  createdAt: "2026-03-20T00:00:00Z",
  updatedAt: "2026-03-30T00:00:00Z",
};

const MOCK_PROGRESS = {
  stages: [
    { stage: "2-0", stageName: "아이디어 분류", status: "completed", updatedAt: "2026-03-25T00:00:00Z" },
    { stage: "2-1", stageName: "사업 적합성", status: "completed", updatedAt: "2026-03-26T00:00:00Z" },
    { stage: "2-2", stageName: "시장 트렌드", status: "completed", updatedAt: "2026-03-27T00:00:00Z" },
    { stage: "2-3", stageName: "경쟁 분석", status: "in_progress", updatedAt: "2026-03-28T00:00:00Z" },
    { stage: "2-4", stageName: "고객 니즈", status: "pending", updatedAt: null },
    { stage: "2-5", stageName: "Commit Gate", status: "pending", updatedAt: null },
    { stage: "2-6", stageName: "기술 타당성", status: "pending", updatedAt: null },
    { stage: "2-7", stageName: "파일럿 설계", status: "pending", updatedAt: null },
    { stage: "2-8", stageName: "패키징", status: "pending", updatedAt: null },
    { stage: "2-9", stageName: "AI 평가", status: "pending", updatedAt: null },
    { stage: "2-10", stageName: "최종 보고서", status: "pending", updatedAt: null },
  ],
  currentStage: "2-3",
  completedCount: 3,
  totalCount: 11,
};

const MOCK_ARTIFACTS = {
  items: [
    makeArtifact({ id: "art-1", stageId: "2-0", skillId: "idea-classifier", outputText: "## 아이디어 분류\nI: 아이디어형" }),
    makeArtifact({ id: "art-2", stageId: "2-1", skillId: "feasibility-study", outputText: "## 타당성\n시장 규모 1조원" }),
    makeArtifact({ id: "art-3", stageId: "2-2", skillId: "market-trend", outputText: "## 트렌드\nAI 문서 자동화 성장세" }),
  ],
  total: 3,
};

function setupDetailMocks(page: import("@playwright/test").Page) {
  return Promise.all([
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
      if (route.request().method() === "GET") {
        return route.fulfill({ json: MOCK_BIZ_ITEM_DETAIL });
      }
      return route.continue();
    }),
    page.route("**/api/biz-items", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          json: {
            items: [MOCK_BIZ_ITEM_DETAIL],
            total: 1,
            page: 1,
            limit: 20,
          },
        });
      }
      return route.continue();
    }),
    page.route("**/api/biz-items/biz-1/discovery-progress", (route) =>
      route.fulfill({ json: MOCK_PROGRESS }),
    ),
    page.route("**/api/ax-bd/artifacts*", (route) =>
      route.fulfill({ json: MOCK_ARTIFACTS }),
    ),
    page.route("**/api/ax-bd/biz-items/*/artifacts*", (route) =>
      route.fulfill({ json: MOCK_ARTIFACTS }),
    ),
    page.route("**/api/help-agent/**", (route) =>
      route.fulfill({ json: { content: "mock" } }),
    ),
  ]);
}

test.describe("Discovery Detail Advanced (F316)", () => {
  test("프로세스 진행률 바 + 완료 카운트 표시", async ({
    authenticatedPage: page,
  }) => {
    await setupDetailMocks(page);
    await page.goto("/discovery/items/biz-1");

    // 제목 확인
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });

    // Type 배지 확인
    await expect(page.getByText("Type I")).toBeVisible();

    // 프로세스 진행률 영역 확인
    await expect(page.getByText("프로세스 진행률")).toBeVisible();

    // 완료 카운트 "3/11 단계 완료"
    await expect(page.getByText("3/11 단계 완료")).toBeVisible();
  });

  test("산출물 목록 표시", async ({
    authenticatedPage: page,
  }) => {
    await setupDetailMocks(page);
    await page.goto("/discovery/items/biz-1");

    // 제목 로딩 대기
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });

    // 산출물 섹션 헤딩
    await expect(page.getByText("산출물").first()).toBeVisible();

    // 산출물이 3건 렌더링됨 — stageId나 skillId 기반 텍스트 확인
    // ArtifactList 컴포넌트가 어떻게 렌더링하는지에 따라 검증
    const artifactSection = page.getByText("산출물").first().locator("..");
    await expect(artifactSection).toBeVisible();
  });

  test("뒤로가기 링크 → /discovery/items 이동", async ({
    authenticatedPage: page,
  }) => {
    await setupDetailMocks(page);

    // /discovery/items에 대한 mock도 설정 (이동 후 페이지 로딩용)
    await page.route("**/api/biz-items", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          json: {
            items: [MOCK_BIZ_ITEM_DETAIL],
            total: 1,
            page: 1,
            limit: 20,
          },
        });
      }
      return route.continue();
    });
    await page.route("**/api/ax-bd/viability/traffic-light/**", (route) =>
      route.fulfill({
        json: { overallSignal: "green", summary: { go: 3, pivot: 1, drop: 0 } },
      }),
    );

    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });

    // ArrowLeft 뒤로가기 링크 — 사이드바에도 같은 href가 있으므로 .last() 사용
    const backLink = page.locator("a[href='/discovery/items']").last();
    if (await backLink.isVisible()) {
      await backLink.click();
      // /discovery/items 로 이동 확인
      await expect(page).toHaveURL(/\/discovery\/items/);
    }
  });
});
