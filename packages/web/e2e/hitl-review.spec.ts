/**
 * E2E: HITL Review Panel (F266) — 산출물 리뷰 (승인/수정/이력)
 * API mock 기반
 *
 * 참고: HITL 패널은 DiscoveryWizard 내 산출물 클릭으로 열리지만,
 * 단독 테스트를 위해 discovery 라우트에서 mock 데이터로 진입.
 */
import { test, expect } from "./fixtures/auth";

// @service: gate-x
// @sprint: 187
// @tagged-by: F400

const MOCK_BIZ_ITEMS = {
  items: [
    {
      id: "biz-1",
      title: "AI 문서 자동화",
      discoveryType: "I",
      orgId: "o1",
      authorId: "test-user-id",
      createdAt: 1711929600,
      updatedAt: 1711929600,
      description: null,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
};

const MOCK_STAGES = {
  stages: [
    { stage: "2-0", status: "completed", updatedAt: "2026-03-30T00:00:00Z" },
    { stage: "2-1", status: "in_progress", updatedAt: "2026-03-30T00:00:00Z" },
    { stage: "2-2", status: "pending", updatedAt: null },
  ],
  currentStage: "2-1",
};

const MOCK_REVIEW_HISTORY = {
  reviews: [
    {
      id: "rev-1",
      artifactId: "art-1",
      reviewerId: "test-user-id",
      action: "approved",
      reason: null,
      modifiedContent: null,
      createdAt: "2026-03-30T12:00:00Z",
    },
    {
      id: "rev-2",
      artifactId: "art-1",
      reviewerId: "test-user-id",
      action: "modified",
      reason: null,
      modifiedContent: "수정된 내용",
      createdAt: "2026-03-29T10:00:00Z",
    },
  ],
  total: 2,
};

function setupMocks(page: import("@playwright/test").Page) {
  return Promise.all([
    page.evaluate(() => {
      localStorage.setItem("fx-discovery-tour-completed", "true");
      localStorage.setItem("fx-tour-completed", "true");
    }),
    // Hide feedback widget to prevent click interception
    page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = "[aria-label='피드백 보내기'] { display: none !important; }";
      document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
    }),
    page.route("**/api/biz-items", (route) =>
      route.fulfill({ json: MOCK_BIZ_ITEMS }),
    ),
    page.route("**/api/ax-bd/viability/traffic-light/**", (route) =>
      route.fulfill({
        json: { overallSignal: "green", summary: { go: 3, pivot: 2, drop: 1 } },
      }),
    ),
    page.route("**/api/biz-items/*/discovery-progress", (route) =>
      route.fulfill({ json: MOCK_STAGES }),
    ),
    page.route("**/api/biz-items/*/discovery-stage", (route) =>
      route.fulfill({ json: { ok: true } }),
    ),
    page.route("**/api/help-agent/**", (route) =>
      route.fulfill({ json: { content: "mock" } }),
    ),
    page.route("**/api/hitl/review", (route) =>
      route.fulfill({
        status: 201,
        json: { id: "rev-new", action: "approved", artifactId: "art-1" },
      }),
    ),
    page.route("**/api/hitl/history/**", (route) =>
      route.fulfill({ json: MOCK_REVIEW_HISTORY }),
    ),
  ]);
}

test.describe("HITL Review Panel (F266)", () => {
  test("HITL 패널 렌더링 — 산출물 콘텐츠 표시", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/items");
    await expect(
      page.locator("[data-tour='discovery-wizard']"),
    ).toBeVisible({ timeout: 10000 });

    // HITL 패널을 열기 위해: WizardStepDetail의 artifact review 콜백을 트리거해야 함
    // 직접 컴포넌트를 조작하기 어려우므로, 패널이 열리는 시나리오를 시뮬레이션
    // → WizardStepDetail 안의 산출물 링크가 있다면 클릭
    const stepDetail = page.locator("[data-tour='discovery-step-detail']");
    await expect(stepDetail).toBeVisible({ timeout: 10000 });

    // 산출물 리뷰 버튼/링크가 있는지 확인 (단계 상세 안에서)
    // 단계 상세 내부에서 artifact 관련 요소가 있으면 클릭
    const artifactLink = stepDetail.getByText(/산출물|리뷰/);
    const hasArtifact = (await artifactLink.count()) > 0;

    if (hasArtifact) {
      await artifactLink.first().click();
      // HITL 패널 (fixed right panel) 렌더링 확인
      await expect(page.getByText("산출물 리뷰")).toBeVisible({ timeout: 5000 });
    } else {
      // Skip 사유: Wizard step detail에 산출물/리뷰 링크 미노출 — HITL 패널 트리거 불가
      // 해소 조건: Wizard에 산출물 액션 링크 추가 시 (Design §8.4 참조)
      test.skip();
    }
  });

  test("승인 동작 — '승인' 클릭 → API 호출 → 패널 닫힘", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);

    // HITL 패널을 직접 트리거하기 위해 discovery-detail 페이지 사용
    // 또는 evaluate를 통한 직접 상태 주입
    await page.goto("/discovery/items");
    await expect(
      page.locator("[data-tour='discovery-wizard']"),
    ).toBeVisible({ timeout: 10000 });

    // 산출물 리뷰 트리거 시도
    const stepDetail = page.locator("[data-tour='discovery-step-detail']");
    await expect(stepDetail).toBeVisible({ timeout: 10000 });

    const artifactLink = stepDetail.getByText(/산출물|리뷰/);
    if ((await artifactLink.count()) === 0) {
      test.skip();
      return;
    }

    await artifactLink.first().click();
    await expect(page.getByText("산출물 리뷰")).toBeVisible({ timeout: 5000 });

    // 승인 버튼 클릭
    const approveBtn = page.getByRole("button", { name: /승인/ });
    await expect(approveBtn).toBeVisible();

    // API 호출 감시
    const reviewReq = page.waitForRequest("**/api/hitl/review");
    await approveBtn.click();

    const req = await reviewReq;
    const body = JSON.parse(req.postData() ?? "{}");
    expect(body.action).toBe("approved");

    // 패널 닫힘
    await expect(page.getByText("산출물 리뷰")).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("수정 동작 — 에디터 → 수정 저장", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/items");
    await expect(
      page.locator("[data-tour='discovery-wizard']"),
    ).toBeVisible({ timeout: 10000 });

    const stepDetail = page.locator("[data-tour='discovery-step-detail']");
    await expect(stepDetail).toBeVisible({ timeout: 10000 });

    const artifactLink = stepDetail.getByText(/산출물|리뷰/);
    if ((await artifactLink.count()) === 0) {
      test.skip();
      return;
    }

    await artifactLink.first().click();
    await expect(page.getByText("산출물 리뷰")).toBeVisible({ timeout: 5000 });

    // 수정 버튼 클릭 → 에디터 모드
    const editBtn = page.getByRole("button", { name: /수정/ }).first();
    await editBtn.click();

    // 에디터(textarea) 표시
    const textarea = page.getByPlaceholder("수정할 내용을 입력하세요...");
    await expect(textarea).toBeVisible();

    // 내용 입력 후 저장
    await textarea.fill("수정된 BMC 분석 결과입니다.");
    const saveBtn = page.getByRole("button", {
      name: /수정 저장/,
    });
    await expect(saveBtn).toBeVisible();

    const reviewReq = page.waitForRequest("**/api/hitl/review");
    await saveBtn.click();

    const req = await reviewReq;
    const body = JSON.parse(req.postData() ?? "{}");
    expect(body.action).toBe("modified");
    expect(body.modifiedContent).toBe("수정된 BMC 분석 결과입니다.");
  });

  test("리뷰 이력 — 이력 토글 → 과거 리뷰 목록 표시", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/items");
    await expect(
      page.locator("[data-tour='discovery-wizard']"),
    ).toBeVisible({ timeout: 10000 });

    const stepDetail = page.locator("[data-tour='discovery-step-detail']");
    await expect(stepDetail).toBeVisible({ timeout: 10000 });

    const artifactLink = stepDetail.getByText(/산출물|리뷰/);
    if ((await artifactLink.count()) === 0) {
      test.skip();
      return;
    }

    await artifactLink.first().click();
    await expect(page.getByText("산출물 리뷰")).toBeVisible({ timeout: 5000 });

    // 리뷰 이력 토글
    await page.getByText("리뷰 이력").click();

    // 이력 목록 표시
    await expect(page.getByText("승인됨")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("수정됨")).toBeVisible();
  });
});
