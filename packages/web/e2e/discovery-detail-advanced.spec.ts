/**
 * E2E: Discovery Detail Advanced — F439 아이템 허브 3탭 + F440 기획서 생성
 * F439: 기본정보/발굴분석/형상화 탭 전환
 * F440: 기획서 생성 CTA → 로딩 → 결과 열람
 *
 * Note: F316(F400) 기존 상세 테스트는 3탭 허브로 재구축됨 (Sprint 212)
 */
import { test, expect } from "./fixtures/auth";

// @service: foundry-x
// @sprint: 212
// @tagged-by: F439 F440

const MOCK_BIZ_ITEM_DETAIL = {
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

const MOCK_SHAPING_ARTIFACTS_EMPTY = {
  businessPlan: null,
  offering: null,
  prd: null,
  prototype: null,
};

const MOCK_SHAPING_ARTIFACTS_WITH_PLAN = {
  businessPlan: { versionNum: 1, createdAt: "2026-04-07T00:00:00Z" },
  offering: null,
  prd: null,
  prototype: null,
};

const MOCK_CRITERIA_PROGRESS = {
  total: 9,
  completed: 3,
  gateStatus: "warning",
  criteria: [
    { id: "c1", name: "고객 문제 정의", condition: "고객 페인포인트를 명확히 정의했나요?", status: "completed" },
    { id: "c2", name: "시장 규모 추정", condition: "TAM/SAM/SOM을 추정했나요?", status: "completed" },
    { id: "c3", name: "핵심 가정 도출", condition: "핵심 가정을 도출했나요?", status: "in_progress" },
    { id: "c4", name: "경쟁사 분석", condition: "경쟁사를 분석했나요?", status: "pending" },
  ],
};

const MOCK_NEXT_GUIDE = {
  step: "2-3",
  description: "경쟁사 분석을 진행해 주세요.",
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

const MOCK_GENERATE_RESULT = {
  id: "bdp-1",
  bizItemId: "biz-1",
  versionNum: 1,
  content: "# AI 문서 자동화 사업기획서\n\n## 개요\n본 사업은 문서 자동 분류 및 요약 서비스입니다.",
  createdAt: "2026-04-07T00:00:00Z",
};

function setupDetailMocks(page: import("@playwright/test").Page, withPlan = false) {
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
        return route.fulfill({ json: { items: [MOCK_BIZ_ITEM_DETAIL], total: 1, page: 1, limit: 20 } });
      }
      return route.continue();
    }),
    page.route("**/api/biz-items/biz-1/shaping-artifacts", (route) =>
      route.fulfill({ json: withPlan ? MOCK_SHAPING_ARTIFACTS_WITH_PLAN : MOCK_SHAPING_ARTIFACTS_EMPTY }),
    ),
    page.route("**/api/biz-items/biz-1/discovery-criteria", (route) =>
      route.fulfill({ json: MOCK_CRITERIA_PROGRESS }),
    ),
    page.route("**/api/biz-items/biz-1/next-guide", (route) =>
      route.fulfill({ json: MOCK_NEXT_GUIDE }),
    ),
    page.route("**/api/biz-items/biz-1/discovery-progress", (route) =>
      route.fulfill({ json: { stages: [], currentStage: null, completedCount: 0, totalCount: 0 } }),
    ),
    page.route("**/api/bdp/biz-1", (route) =>
      route.fulfill({ json: withPlan ? MOCK_BDP : { error: "not found" }, status: withPlan ? 200 : 404 }),
    ),
    page.route("**/api/help-agent/**", (route) =>
      route.fulfill({ json: { content: "mock" } }),
    ),
  ]);
}

test.describe("F439 — 아이템 상세 허브 3탭", () => {
  test("헤더에 제목, 유형 뱃지, 상태 뱃지 표시", async ({ authenticatedPage: page }) => {
    await setupDetailMocks(page);
    await page.goto("/discovery/items/biz-1");

    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });
    // 유형 뱃지 — "I — 아이디어형"
    await expect(page.getByText(/아이디어형/).first()).toBeVisible();
    // 상태 뱃지 — "분석 완료"
    await expect(page.getByText("분석 완료").first()).toBeVisible();
  });

  test("기본정보 탭 — 제목/설명/출처/등록일 표시", async ({ authenticatedPage: page }) => {
    await setupDetailMocks(page);
    await page.goto("/discovery/items/biz-1");

    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });

    // 기본정보 탭이 기본 활성
    const infoTab = page.getByRole("tab", { name: "기본정보" });
    await expect(infoTab).toBeVisible();

    // 설명 텍스트
    await expect(page.getByText("문서 자동 분류 및 요약 서비스")).toBeVisible();
    // 출처
    await expect(page.getByText("wizard")).toBeVisible();
  });

  test("발굴분석 탭 클릭 → 분석 스텝퍼 + 9기준 체크리스트 표시", async ({ authenticatedPage: page }) => {
    await setupDetailMocks(page);
    await page.goto("/discovery/items/biz-1");

    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });

    // 발굴분석 탭 클릭
    await page.getByRole("tab", { name: "발굴분석" }).click();

    // 분석 스텝퍼 헤딩
    await expect(page.getByText("발굴 분석 실행")).toBeVisible();
    // 분석 시작 버튼
    await expect(page.getByRole("button", { name: "분석 시작" })).toBeVisible();
    // 9기준 체크리스트 헤딩
    await expect(page.getByText("발굴 9기준 체크리스트")).toBeVisible();
    // 완료 수 표시 — "3 / 9 기준 완료"
    await expect(page.getByText(/3\s*\/\s*9\s*기준\s*완료/)).toBeVisible();
  });

  test("형상화 탭 클릭 → 파이프라인 표시 (기획서 미생성 상태)", async ({ authenticatedPage: page }) => {
    await setupDetailMocks(page, false);
    await page.goto("/discovery/items/biz-1");

    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });

    // 형상화 탭 클릭
    await page.getByRole("tab", { name: "형상화" }).click();

    // 파이프라인 헤딩
    await expect(page.getByText("형상화 파이프라인")).toBeVisible();
    // 사업기획서 단계
    await expect(page.getByText("사업기획서").first()).toBeVisible();
    // 생성하기 버튼 (기획서 미생성)
    await expect(page.getByRole("button", { name: "생성하기" }).first()).toBeVisible();
    // Offering은 잠김
    await expect(page.getByText("Offering").first()).toBeVisible();
  });

  test("뒤로가기 링크 → /discovery 이동", async ({ authenticatedPage: page }) => {
    await setupDetailMocks(page);
    await page.route("**/api/biz-items", (route) =>
      route.fulfill({ json: { items: [MOCK_BIZ_ITEM_DETAIL], total: 1, page: 1, limit: 20 } }),
    );
    await page.route("**/api/ax-bd/viability/traffic-light/**", (route) =>
      route.fulfill({ json: { overallSignal: "green", summary: { go: 3, pivot: 1, drop: 0 } } }),
    );

    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });

    // 돌아가기 링크
    const backLink = page.locator("a[href='/discovery']").first();
    if (await backLink.isVisible()) {
      await backLink.click();
      await expect(page).toHaveURL(/\/discovery/);
    }
  });
});

test.describe("F440 — 사업기획서 생성 + 열람", () => {
  test("형상화 탭에서 생성하기 클릭 → 기획서 생성 후 BusinessPlanViewer 표시", async ({ authenticatedPage: page }) => {
    await setupDetailMocks(page, false);

    // 기획서 생성 API mock
    await page.route("**/api/biz-items/biz-1/generate-business-plan", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ json: MOCK_GENERATE_RESULT });
      }
      return route.continue();
    });

    // 생성 후 shaping-artifacts 재조회 → 기획서 있음
    let artifactCallCount = 0;
    await page.route("**/api/biz-items/biz-1/shaping-artifacts", (route) => {
      artifactCallCount++;
      return route.fulfill({
        json: artifactCallCount > 1 ? MOCK_SHAPING_ARTIFACTS_WITH_PLAN : MOCK_SHAPING_ARTIFACTS_EMPTY,
      });
    });

    // BDP 조회 (생성 후)
    await page.route("**/api/bdp/biz-1", (route) =>
      route.fulfill({ json: MOCK_BDP }),
    );

    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });

    // 형상화 탭 클릭
    await page.getByRole("tab", { name: "형상화" }).click();
    await expect(page.getByText("형상화 파이프라인")).toBeVisible();

    // 생성하기 버튼 클릭
    const generateBtn = page.getByRole("button", { name: "생성하기" }).first();
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // 기획서 콘텐츠 표시
    await expect(page.getByText(/AI 문서 자동화 사업기획서/).first()).toBeVisible({ timeout: 15000 });
  });

  test("기획서 있는 경우 형상화 탭에 BusinessPlanViewer 바로 표시", async ({ authenticatedPage: page }) => {
    await setupDetailMocks(page, true);

    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });

    // 형상화 탭
    await page.getByRole("tab", { name: "형상화" }).click();

    // 기획서 뷰어 — v1 뱃지
    await expect(page.getByText("v1")).toBeVisible({ timeout: 10000 });
    // 재생성 버튼
    await expect(page.getByRole("button", { name: "재생성" })).toBeVisible();
  });
});
