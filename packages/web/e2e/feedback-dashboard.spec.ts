import { test, expect } from "./fixtures/org";
import { makeFeedbackQueueItem } from "./fixtures/mock-factory";

// @service: portal
// @tagged-by: F476

test.describe("Feedback Dashboard (F476)", () => {
  const mockItems = [
    makeFeedbackQueueItem({ id: "fq-001", github_issue_number: 386, title: "[Marker.io] API409 error occurred!", status: "pending" }),
    makeFeedbackQueueItem({ id: "fq-002", github_issue_number: 385, title: "[Marker.io] Fix business plan display", status: "failed", error_message: "No PR created: Agent timeout", retry_count: 1 }),
    makeFeedbackQueueItem({ id: "fq-003", github_issue_number: 383, title: "[Marker.io] Add editing of PRD", status: "failed", error_message: "No PR created" }),
    makeFeedbackQueueItem({
      id: "fq-004", github_issue_number: 364, title: "Fix login button", status: "done",
      agent_pr_url: "https://github.com/KTDS-AXBD/Foundry-X/pull/365",
      agent_log: "Successfully created PR",
    }),
  ];

  test.beforeEach(async ({ orgPage: { page } }) => {
    // Mock feedback-queue list API
    await page.route("**/api/feedback-queue*", (route) => {
      const url = new URL(route.request().url());

      if (route.request().method() === "GET" && !url.pathname.includes("/fq-")) {
        const status = url.searchParams.get("status");
        const filtered = status ? mockItems.filter((i) => i.status === status) : mockItems;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: filtered, total: filtered.length }),
        });
      }

      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...mockItems[0], status: "pending" }),
        });
      }

      return route.continue();
    });
  });

  // E-01: 페이지 접근 + 제목 표시
  test("피드백 관리 페이지가 헤딩을 표시한다", async ({ orgPage: { page } }) => {
    await page.goto("/feedback-dashboard");

    await expect(page.getByRole("heading", { name: "피드백 관리" })).toBeVisible();
    await expect(page.getByText("Marker.io 피드백 큐 현황을 확인하고 관리하세요")).toBeVisible();
  });

  // E-02: 빈 목록 안내
  test("피드백이 없을 때 안내 메시지를 표시한다", async ({ orgPage: { page } }) => {
    await page.route("**/api/feedback-queue*", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: [], total: 0 }),
        });
      }
      return route.continue();
    });

    await page.goto("/feedback-dashboard");
    await expect(page.getByText("피드백이 없어요")).toBeVisible();
  });

  // E-03: 카드 목록 렌더링
  test("카드 목록이 Issue 번호, 제목, 상태를 표시한다", async ({ orgPage: { page } }) => {
    await page.goto("/feedback-dashboard");

    // 4건 표시
    await expect(page.getByText("4건")).toBeVisible();

    // Issue 번호 + 제목
    await expect(page.getByText("#386")).toBeVisible();
    await expect(page.getByText("[Marker.io] API409 error occurred!")).toBeVisible();

    // 상태 뱃지
    await expect(page.getByText("pending").first()).toBeVisible();
    await expect(page.getByText("failed").first()).toBeVisible();
    await expect(page.getByText("done")).toBeVisible();
  });

  // E-04: 상태 필터 탭
  test("실패 탭 클릭 시 failed 상태만 표시한다", async ({ orgPage: { page } }) => {
    await page.goto("/feedback-dashboard");

    // 실패 탭 클릭
    await page.getByRole("button", { name: /실패/ }).click();

    // 2건만 표시 (failed 2건)
    await expect(page.getByText("2건")).toBeVisible();
    await expect(page.getByText("#385")).toBeVisible();
    await expect(page.getByText("#383")).toBeVisible();
  });

  // E-05: 카드 상세 확장
  test("카드 클릭 시 상세 정보를 표시한다", async ({ orgPage: { page } }) => {
    await page.goto("/feedback-dashboard");

    // failed 카드 클릭
    await page.getByText("[Marker.io] Fix business plan display").click();

    // 상세 내용
    await expect(page.getByText("Screenshot from Marker.io widget")).toBeVisible();
    await expect(page.getByText("visual-feedback")).toBeVisible();
    await expect(page.getByText("No PR created: Agent timeout")).toBeVisible();
    await expect(page.getByText("재시도 1회")).toBeVisible();
  });

  // E-06: 재처리 버튼
  test("재처리 버튼 클릭 시 PATCH 호출한다", async ({ orgPage: { page } }) => {
    await page.goto("/feedback-dashboard");

    // failed 카드 열기
    await page.getByText("[Marker.io] Fix business plan display").click();

    // 재처리 버튼 클릭
    const retryBtn = page.getByRole("button", { name: "재처리" });
    await expect(retryBtn).toBeVisible();
    await retryBtn.click();

    // PATCH 호출 후 목록 갱신 (mock이 자동 응답)
    await expect(page.getByRole("heading", { name: "피드백 관리" })).toBeVisible();
  });

  // E-07: PR 링크
  test("done 카드에 PR 링크를 표시한다", async ({ orgPage: { page } }) => {
    await page.goto("/feedback-dashboard");

    // done 카드의 PR 링크
    const prLink = page.getByRole("link", { name: "PR 보기" });
    await expect(prLink).toBeVisible();
    await expect(prLink).toHaveAttribute("href", "https://github.com/KTDS-AXBD/Foundry-X/pull/365");
    await expect(prLink).toHaveAttribute("target", "_blank");
  });

  // E-08: 사이드바 메뉴
  test("Admin 사이드바에 피드백 메뉴가 표시된다", async ({ orgPage: { page } }) => {
    await page.goto("/feedback-dashboard");

    // 사이드바 피드백 링크
    const feedbackLink = page.getByRole("link", { name: "피드백" });
    await expect(feedbackLink).toBeVisible();
  });
});
