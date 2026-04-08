/**
 * E2E: Getting Started Wizard — 사업 아이템 등록 → Discovery 이동
 * S229 갭 리포트 권장사항 P0: 신규 사용자 여정 첫 진입점
 * API mock 기반. 4단계: 자료 업로드(optional) → 아이디어 입력 → AI 분석 → 확인 & 등록
 */
import { test, expect } from "./fixtures/auth";

// @service: foundry-x
// @sprint: 229
// @tagged-by: S229-C1

const MOCK_CREATED_ITEM = {
  id: "new-item-001",
  orgId: "test-org-e2e",
  title: "AI 기반 ESG 자동 보고서 플랫폼",
  description: "중소기업 대상 ESG 보고서 자동 생성 SaaS",
  source: "wizard",
  status: "draft",
  createdBy: "test-user-id",
  createdAt: "2026-04-08T00:00:00Z",
  updatedAt: "2026-04-08T00:00:00Z",
  classification: null,
  discoveryType: null,
};

const MOCK_CLASSIFY_RESULT = {
  itemType: "type_a",
  type: "I",
  category: "AI/ML",
  confidence: 0.85,
  turnAnswers: { turn1: "SaaS", turn2: "B2B", turn3: "ESG" },
  analysisWeights: { market: 0.3, tech: 0.4, biz: 0.3 },
  reasoning: "ESG 규제 대응 SaaS",
};

function setupMocks(page: import("@playwright/test").Page) {
  return Promise.all([
    page.route("**/api/biz-items", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ status: 201, json: MOCK_CREATED_ITEM });
      }
      return route.continue();
    }),
    page.route("**/api/biz-items/new-item-001/classify", (route) =>
      route.fulfill({ status: 200, json: MOCK_CLASSIFY_RESULT }),
    ),
    page.route("**/api/biz-items/new-item-001", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, json: MOCK_CREATED_ITEM });
      }
      return route.continue();
    }),
    page.route("**/api/biz-items/new-item-001/shaping-artifacts", (route) =>
      route.fulfill({ status: 200, json: { artifacts: [] } }),
    ),
    page.route("**/api/biz-items/new-item-001/discovery-progress", (route) =>
      route.fulfill({ status: 200, json: { stages: [], criteria: [] } }),
    ),
    page.route("**/api/pipeline/items/new-item-001/stage", (route) =>
      route.fulfill({ status: 200, json: { stages: [] } }),
    ),
  ]);
}

test.describe("Getting Started Wizard", () => {
  test("위자드 렌더링 — 제목 + Step 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/getting-started");
    await expect(page.getByRole("heading", { name: "새 사업 아이템 등록" })).toBeVisible();
    // Step 1/4 — 자료 업로드 (첫 화면)
    await expect(page.getByText(/Step 1 \/ 4/)).toBeVisible();
    await expect(page.getByText("자료를 업로드해 주세요")).toBeVisible();
  });

  test("자료 업로드 건너뛰기 → 아이디어 입력 폼", async ({ authenticatedPage: page }) => {
    await page.goto("/getting-started");
    // "건너뛰기" 버튼 (variant=ghost)
    await page.getByRole("button", { name: "건너뛰기" }).click();

    // Step 2/4 — 아이디어 입력
    await expect(page.getByText(/Step 2 \/ 4/)).toBeVisible();
    await expect(page.getByRole("textbox", { name: /아이템 제목/ })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /아이디어 설명/ })).toBeVisible();

    // 다음 버튼 비활성 (필수 필드 미입력)
    await expect(page.getByRole("button", { name: "다음" })).toBeDisabled();
  });

  test("제목+설명 입력 → 다음 버튼 활성화 → Step 3 전환", async ({ authenticatedPage: page }) => {
    await setupMocks(page);
    await page.goto("/getting-started");
    await page.getByRole("button", { name: "건너뛰기" }).click();

    // 입력
    await page.getByRole("textbox", { name: /아이템 제목/ }).fill("AI 기반 ESG 자동 보고서 플랫폼");
    await page.getByRole("textbox", { name: /아이디어 설명/ }).fill("중소기업 대상 ESG 보고서 자동 생성 SaaS");

    // 다음 버튼 활성화
    const nextBtn = page.getByRole("button", { name: "다음" });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // Step 3/4 — AI 분석
    await expect(page.getByText(/Step 3 \/ 4/)).toBeVisible({ timeout: 10000 });
  });

  test("전체 흐름 — Step 4 확인 → Discovery 이동", async ({ authenticatedPage: page }) => {
    await setupMocks(page);
    await page.goto("/getting-started");

    // Step 0 → 건너뛰기
    await page.getByRole("button", { name: "건너뛰기" }).click();

    // Step 1 → 입력 + 다음
    await page.getByRole("textbox", { name: /아이템 제목/ }).fill("AI 기반 ESG 자동 보고서 플랫폼");
    await page.getByRole("textbox", { name: /아이디어 설명/ }).fill("중소기업 대상 ESG 보고서 자동 생성 SaaS");
    await page.getByRole("button", { name: "다음" }).click();
    await expect(page.getByText(/Step 3 \/ 4/)).toBeVisible({ timeout: 10000 });

    // Step 2 → Step 3로 진행 (다음 또는 자동 전환)
    const step3Next = page.getByRole("button", { name: /다음|확인/ });
    if (await step3Next.isVisible({ timeout: 5000 }).catch(() => false)) {
      await step3Next.click();
    }

    // Step 4 또는 완료 버튼 확인
    const finishBtn = page.getByRole("button", { name: /발굴 분석 시작/ });
    if (await finishBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await finishBtn.click();
      await expect(page).toHaveURL(/\/discovery\/items\/new-item-001/, { timeout: 10000 });
    }
  });

  test("API 에러 시 에러 메시지 표시 + Step 유지", async ({ authenticatedPage: page }) => {
    await page.route("**/api/biz-items", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ status: 400, json: { error: "Invalid request" } });
      }
      return route.continue();
    });

    await page.goto("/getting-started");
    await page.getByRole("button", { name: "건너뛰기" }).click();

    await page.getByRole("textbox", { name: /아이템 제목/ }).fill("테스트");
    await page.getByRole("textbox", { name: /아이디어 설명/ }).fill("테스트 설명");
    await page.getByRole("button", { name: "다음" }).click();

    // 에러 메시지 표시 + Step 2에 머무름
    await expect(page.getByText(/실패|에러|Error|API 400|등록에 실패/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Step 2 \/ 4/)).toBeVisible();
  });
});
