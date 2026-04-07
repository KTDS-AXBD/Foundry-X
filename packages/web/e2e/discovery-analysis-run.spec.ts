/**
 * E2E: Discovery Analysis Run (F438) — 발굴 분석 실행 시나리오
 * AnalysisStepper: 3단계 순차 실행, 로딩 상태, 결과 표시
 */
import { test, expect } from "./fixtures/auth";

// @service: foundry-x
// @sprint: 211
// @tagged-by: F438

const MOCK_BIZ_ITEM = {
  id: "biz-f438",
  title: "AI 비서 도입",
  description: "사내 업무 효율화를 위한 AI 비서 서비스",
  discoveryType: "I",
  status: "draft",
  source: "wizard",
  orgId: "test-org-e2e",
  createdBy: "test-user-id",
  createdAt: "2026-04-08T00:00:00Z",
  updatedAt: "2026-04-08T00:00:00Z",
  classification: null,
};

const MOCK_PROGRESS_EMPTY = {
  stages: [
    { stage: "2-0", stageName: "시작점 분류", status: "pending", startedAt: null, completedAt: null },
    { stage: "2-1", stageName: "자동 분류", status: "pending", startedAt: null, completedAt: null },
    { stage: "2-2", stageName: "다관점 평가", status: "pending", startedAt: null, completedAt: null },
    { stage: "2-3", stageName: "시장 분석", status: "pending", startedAt: null, completedAt: null },
    { stage: "2-4", stageName: "경쟁사 분석", status: "pending", startedAt: null, completedAt: null },
    { stage: "2-5", stageName: "Commit Gate", status: "pending", startedAt: null, completedAt: null },
    { stage: "2-6", stageName: "타겟 고객", status: "pending", startedAt: null, completedAt: null },
    { stage: "2-7", stageName: "비즈니스 모델", status: "pending", startedAt: null, completedAt: null },
    { stage: "2-8", stageName: "패키징", status: "pending", startedAt: null, completedAt: null },
    { stage: "2-9", stageName: "AI 평가", status: "pending", startedAt: null, completedAt: null },
    { stage: "2-10", stageName: "최종 보고서", status: "pending", startedAt: null, completedAt: null },
  ],
  currentStage: null,
  completedCount: 0,
  totalCount: 11,
};

const MOCK_STARTING_POINT = {
  startingPoint: "market_gap",
  confidence: 0.85,
  reasoning: "시장 갭 기반 접근이 적합한 아이디어예요",
  needsConfirmation: false,
  analysisPath: {},
};

const MOCK_CLASSIFY = {
  itemType: "I",
  confidence: 0.9,
  reasoning: "아이디어형 아이템으로 분류됩니다",
  turnAnswers: { turn1: "AI 비서", turn2: "업무 효율", turn3: "B2B" },
  analysisWeights: {},
};

const MOCK_EVALUATE = {
  id: "eval-1",
  bizItemId: "biz-f438",
  verdict: "go",
  avgScore: 7.5,
  totalConcerns: 2,
  scores: [
    {
      personaId: "전략",
      businessViability: 8,
      strategicFit: 7,
      customerValue: 8,
      techMarket: 7,
      execution: 7,
      financialFeasibility: 7,
      competitiveDiff: 8,
      scalability: 8,
      summary: "전략적 가치가 높은 아이템",
      concerns: ["시장 진입 장벽"],
    },
  ],
  warnings: [],
};

const MOCK_ARTIFACTS = { items: [], total: 0 };

test.describe("F438 발굴 분석 실행", () => {
  test("분석 시작 버튼이 표시되고 클릭 가능해요", async ({ page }) => {
    await page.route("**/api/biz-items/biz-f438", (route) =>
      route.fulfill({ json: MOCK_BIZ_ITEM }),
    );
    await page.route("**/api/biz-items/biz-f438/discovery-progress", (route) =>
      route.fulfill({ json: MOCK_PROGRESS_EMPTY }),
    );
    await page.route("**/api/biz-items/biz-f438/artifacts**", (route) =>
      route.fulfill({ json: MOCK_ARTIFACTS }),
    );

    await page.goto("/discovery/items/biz-f438");

    await expect(page.getByTestId("analysis-stepper")).toBeVisible();
    const startBtn = page.getByTestId("analysis-start-button");
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toContainText("분석 시작");
  });

  test("3단계 분석 완료 시 결과 카드가 표시돼요", async ({ page }) => {
    await page.route("**/api/biz-items/biz-f438", (route) =>
      route.fulfill({ json: MOCK_BIZ_ITEM }),
    );
    await page.route("**/api/biz-items/biz-f438/discovery-progress", (route) =>
      route.fulfill({ json: MOCK_PROGRESS_EMPTY }),
    );
    await page.route("**/api/biz-items/biz-f438/starting-point", (route) =>
      route.fulfill({ json: MOCK_STARTING_POINT }),
    );
    await page.route("**/api/biz-items/biz-f438/classify", (route) =>
      route.fulfill({ json: MOCK_CLASSIFY }),
    );
    await page.route("**/api/biz-items/biz-f438/evaluate", (route) =>
      route.fulfill({ json: MOCK_EVALUATE }),
    );
    await page.route("**/api/biz-items/biz-f438/discovery-stage", (route) =>
      route.fulfill({ json: { ok: true, stage: "2-0", status: "completed" } }),
    );
    await page.route("**/api/biz-items/biz-f438/artifacts**", (route) =>
      route.fulfill({ json: MOCK_ARTIFACTS }),
    );

    await page.goto("/discovery/items/biz-f438");

    await page.getByTestId("analysis-start-button").click();

    // 결과 카드: Step 2-0 시작점 분류
    await expect(page.getByText("시작점 분류")).toBeVisible({ timeout: 10000 });

    // 결과 카드: Step 2-1 자동 분류
    await expect(page.getByText("자동 분류")).toBeVisible({ timeout: 10000 });

    // 결과 카드: Step 2-2 다관점 평가
    await expect(page.getByText("다관점 평가")).toBeVisible({ timeout: 10000 });

    // MVP 완료 메시지
    await expect(page.getByText("MVP 분석 완료")).toBeVisible({ timeout: 10000 });
  });

  test("발굴 분석 섹션 헤더가 표시돼요", async ({ page }) => {
    await page.route("**/api/biz-items/biz-f438", (route) =>
      route.fulfill({ json: MOCK_BIZ_ITEM }),
    );
    await page.route("**/api/biz-items/biz-f438/discovery-progress", (route) =>
      route.fulfill({ json: MOCK_PROGRESS_EMPTY }),
    );
    await page.route("**/api/biz-items/biz-f438/artifacts**", (route) =>
      route.fulfill({ json: MOCK_ARTIFACTS }),
    );

    await page.goto("/discovery/items/biz-f438");

    await expect(page.getByText("발굴 분석")).toBeVisible();
    await expect(page.getByText("MVP · 3단계")).toBeVisible();
  });
});
