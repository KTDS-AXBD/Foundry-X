import { test, expect } from "./fixtures/auth";

test.describe("Onboarding Flow (F252)", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock onboarding progress API (GET + PATCH)
    await page.route("**/api/onboarding/progress", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            totalSteps: 5,
            completedSteps: ["step-1", "step-2"],
            progressPercent: 40,
            steps: [
              { id: "step-1", label: "프로젝트 연결하기", completed: true, completedAt: "2026-03-01T00:00:00Z" },
              { id: "step-2", label: "첫 Spec 생성", completed: true, completedAt: "2026-03-02T00:00:00Z" },
              { id: "step-3", label: "에이전트 실행", completed: false, completedAt: null },
              { id: "step-4", label: "팀원 초대", completed: false, completedAt: null },
              { id: "step-5", label: "대시보드 확인", completed: false, completedAt: null },
            ],
          }),
        });
      }
      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, stepId: "step-3", progressPercent: 60, allComplete: false }),
        });
      }
      return route.continue();
    });

    // Mock skill guide API
    await page.route("**/api/onboarding/skill-guide", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ categories: [], skills: [] }),
      }),
    );

    // Mock process flow API
    await page.route("**/api/onboarding/process-flow", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ stages: [], connections: [] }),
      }),
    );

    // Mock team FAQ API
    await page.route("**/api/onboarding/team-faq", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ categories: [], items: [] }),
      }),
    );
  });

  // ─── 기존 테스트 (assertive 강화) ───

  test("getting-started 페이지가 워크플로우 카드와 FAQ를 렌더링한다", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/getting-started");

    // Welcome banner with progress bar
    await expect(page.getByText("Foundry-X 시작하기")).toBeVisible();
    await expect(page.locator("[style*='width: 40%']")).toBeVisible();

    // 4 workflow quickstart cards
    await expect(page.getByText("📥 SR 처리하기")).toBeVisible();
    await expect(page.getByText("📝 아이디어 → 명세")).toBeVisible();
    await expect(page.getByText("📈 현황 확인하기")).toBeVisible();
    await expect(page.getByText("🔍 Discovery 프로세스")).toBeVisible();

    // FAQ section
    await expect(page.getByText("자주 묻는 질문")).toBeVisible();
    await expect(page.getByText("Foundry-X는 무엇인가요?")).toBeVisible();
  });

  test("NPS 피드백 폼이 점수 선택과 제출이 가능하다", async ({
    authenticatedPage: page,
  }) => {
    // Mock feedback submission
    await page.route("**/api/feedback", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: "fb-1", npsScore: 8 }),
        });
      }
      return route.continue();
    });

    await page.goto("/getting-started");

    // NPS form heading
    await expect(
      page.getByText("Foundry-X를 추천할 의향이 있으신가요?"),
    ).toBeVisible();

    // 10 score buttons (1~10)
    const scoreButtons = page.locator(
      "button:has-text('8'):near(button:has-text('7'))",
    );
    // Use a more specific selector for score button "8"
    const scoreBtns = page.locator("section:has-text('피드백') button");
    const btn8 = scoreBtns.filter({ hasText: /^8$/ });
    await btn8.click();

    // Submit button should be enabled after selecting a score
    const submitBtn = page.getByRole("button", { name: "피드백 제출" });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Success message
    await expect(page.getByText("감사합니다! 피드백이 제출되었습니다.")).toBeVisible();
  });

  test("온보딩 체크리스트가 진행 상태를 표시하고 토글 가능하다", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/getting-started");

    // Checklist section
    await expect(page.getByText("온보딩 체크리스트")).toBeVisible();
    await expect(page.getByText("2/5 완료")).toBeVisible();

    // Checklist section
    const checklistSection = page.locator("section:has(h2:text('온보딩 체크리스트'))");

    // Completed steps should exist
    await expect(checklistSection.getByRole("button", { name: "프로젝트 연결하기" })).toBeVisible();

    // Incomplete step should be clickable
    const incompleteStep = checklistSection.getByRole("button", { name: "팀원 초대" });
    await expect(incompleteStep).toBeVisible();
    await incompleteStep.click();

    // After clicking, should update (optimistic UI)
    await expect(checklistSection.getByText("3/5 완료")).toBeVisible();
  });

  // ─── F252 신규 테스트: 탭 네비게이션 ───

  test("탭 네비게이션이 5개 탭 사이를 전환한다", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/getting-started");

    // 5 tabs should be visible
    const tabLabels = ["시작하기", "환경 설정", "스킬 레퍼런스", "프로세스 가이드", "FAQ"];
    for (const label of tabLabels) {
      await expect(page.getByRole("tab", { name: label })).toBeVisible();
    }

    // Default tab is "시작하기"
    await expect(page.getByRole("tab", { name: "시작하기" })).toHaveAttribute(
      "data-state",
      "active",
    );

    // Switch to "환경 설정" tab
    await page.getByRole("tab", { name: "환경 설정" }).click();
    await expect(page).toHaveURL(/tab=setup/);

    // Switch to "스킬 레퍼런스" tab
    await page.getByRole("tab", { name: "스킬 레퍼런스" }).click();
    await expect(page).toHaveURL(/tab=skills/);
  });

  test("URL ?tab= 파라미터로 직접 탭을 열 수 있다", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/getting-started?tab=skills");

    await expect(
      page.getByRole("tab", { name: "스킬 레퍼런스" }),
    ).toHaveAttribute("data-state", "active");
  });

  // ─── F252 신규 테스트: 투어 다시 보기 ───

  test("투어 다시 보기 버튼이 존재한다", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/getting-started");

    await expect(
      page.getByRole("button", { name: /투어 다시 보기/ }),
    ).toBeVisible();
  });

  // ─── F252 신규 테스트: 보조 기능 카드 ───

  test("더 알아보기 섹션에 3개 기능 카드가 있다", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/getting-started");

    await expect(page.getByRole("heading", { name: "더 알아보기" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "에이전트", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "아키텍처", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "지식베이스", exact: true })).toBeVisible();
  });
});
