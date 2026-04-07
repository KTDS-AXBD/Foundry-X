import { test, expect } from "./fixtures/auth";

// @service: portal
// @sprint: 209
// @tagged-by: F435

// ─── F435: 아이템 등록 위저드 테스트 ───

test.describe("Item Registration Wizard (F435)", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock POST /biz-items
    await page.route("**/api/biz-items", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "item-wizard-1",
            title: "AI 기반 사내 지식 관리",
            description: "사내 업무 효율화를 위한 AI 지식 관리 시스템",
            status: "active",
            discoveryType: null,
            createdAt: "2026-04-07T00:00:00Z",
          }),
        });
      }
      return route.continue();
    });

    // Mock POST /biz-items/:id/classify
    await page.route("**/api/biz-items/item-wizard-1/classify", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ type: "I", category: "Intelligence" }),
      }),
    );
  });

  test("위저드 3단계 UI가 렌더링된다", async ({ authenticatedPage: page }) => {
    await page.goto("/getting-started");

    // 페이지 제목
    await expect(page.getByRole("heading", { name: "새 사업 아이템 등록" })).toBeVisible();

    // Step 1 활성 상태
    await expect(page.getByText("아이디어 입력")).toBeVisible();
    await expect(page.getByText("아이디어를 입력하면 AI가 분석하고")).toBeVisible();

    // Step 1 입력 폼
    await expect(page.getByLabel("아이템 제목")).toBeVisible();
    await expect(page.getByLabel("아이디어 설명")).toBeVisible();
  });

  test("Step 1 → Step 2: 아이템 등록 후 AI 분석 결과 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/getting-started");

    // Step 1 입력
    await page.getByLabel("아이템 제목").fill("AI 기반 사내 지식 관리");
    await page.getByLabel("아이디어 설명").fill("사내 업무 효율화를 위한 AI 지식 관리 시스템");

    // 다음 클릭
    await page.getByRole("button", { name: "다음" }).click();

    // Step 2: AI 분석 결과
    await expect(page.getByText("AI 분석 결과")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("AI 기반 사내 지식 관리")).toBeVisible();
    await expect(page.getByText("사내 업무 효율화를 위한 AI 지식 관리 시스템")).toBeVisible();
  });

  test("Step 2 → Step 3: 확인 및 등록 완료 화면", async ({ authenticatedPage: page }) => {
    await page.goto("/getting-started");

    // Step 1
    await page.getByLabel("아이템 제목").fill("AI 기반 사내 지식 관리");
    await page.getByLabel("아이디어 설명").fill("사내 업무 효율화를 위한 AI 지식 관리 시스템");
    await page.getByRole("button", { name: "다음" }).click();

    // Step 2 → 다음
    await expect(page.getByText("AI 분석 결과")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "다음" }).click();

    // Step 3: 등록 완료
    await expect(page.getByText("등록 완료!")).toBeVisible();
    await expect(page.getByRole("button", { name: "발굴 분석 시작" })).toBeVisible();
  });

  test("Step 3 완료 후 아이템 상세로 이동", async ({ authenticatedPage: page }) => {
    await page.goto("/getting-started");

    // 전체 흐름
    await page.getByLabel("아이템 제목").fill("AI 기반 사내 지식 관리");
    await page.getByLabel("아이디어 설명").fill("사내 업무 효율화를 위한 AI 지식 관리 시스템");
    await page.getByRole("button", { name: "다음" }).click();
    await expect(page.getByText("AI 분석 결과")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "다음" }).click();
    await expect(page.getByText("등록 완료!")).toBeVisible();

    // 발굴 분석 시작 → /discovery/items/:id
    await page.getByRole("button", { name: "발굴 분석 시작" }).click();
    await page.waitForURL("**/discovery/items/item-wizard-1", { timeout: 5000 });
    expect(page.url()).toContain("/discovery/items/item-wizard-1");
  });

  test("이전 버튼으로 Step 2 → Step 1 돌아가기", async ({ authenticatedPage: page }) => {
    await page.goto("/getting-started");

    // Step 1 → 2
    await page.getByLabel("아이템 제목").fill("테스트 아이디어");
    await page.getByLabel("아이디어 설명").fill("테스트 설명입니다.");
    await page.getByRole("button", { name: "다음" }).click();
    await expect(page.getByText("AI 분석 결과")).toBeVisible({ timeout: 10000 });

    // 이전 클릭
    await page.getByRole("button", { name: "이전" }).click();

    // Step 1로 돌아옴
    await expect(page.getByLabel("아이템 제목")).toBeVisible();
  });
});

// ─── F252 Onboarding Flow (구 5탭 UI) — F435 재구축으로 의도적 skip ───

test.describe.skip("Onboarding Flow (F252) — F435 위저드 재구축으로 skip", () => {
  test("getting-started 페이지가 워크플로우 카드와 FAQ를 렌더링한다", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/getting-started");
    await expect(page.getByText("Foundry-X 시작하기")).toBeVisible();
  });

  test("NPS 피드백 폼이 점수 선택과 제출이 가능하다", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/getting-started");
    await expect(page.getByText("Foundry-X를 추천할 의향이 있으신가요?")).toBeVisible();
  });

  test("온보딩 체크리스트가 진행 상태를 표시하고 토글 가능하다", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/getting-started");
    await expect(page.getByText("온보딩 체크리스트")).toBeVisible();
  });

  test("탭 네비게이션이 5개 탭 사이를 전환한다", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/getting-started");
    const tabLabels = ["시작하기", "환경 설정", "스킬 레퍼런스", "프로세스 가이드", "FAQ"];
    for (const label of tabLabels) {
      await expect(page.getByRole("tab", { name: label })).toBeVisible();
    }
  });

  test("URL ?tab= 파라미터로 직접 탭을 열 수 있다", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/getting-started?tab=skills");
    await expect(page.getByRole("tab", { name: "스킬 레퍼런스" })).toHaveAttribute("data-state", "active");
  });

  test("투어 다시 보기 버튼이 존재한다", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/getting-started");
    await expect(page.getByRole("button", { name: /투어 다시 보기/ })).toBeVisible();
  });

  test("더 알아보기 섹션에 3개 기능 카드가 있다", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/getting-started");
    await expect(page.getByRole("heading", { name: "더 알아보기" })).toBeVisible();
  });
});
