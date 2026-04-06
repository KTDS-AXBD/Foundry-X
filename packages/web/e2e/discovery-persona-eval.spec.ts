/**
 * E2E: Discovery Persona Eval (F344+F345) — 멀티 페르소나 평가 UI
 * API mock 기반 — API 서버 없이도 동작
 */
import { test, expect } from "./fixtures/auth";

// SSE 이벤트를 순차적으로 생성하는 헬퍼
function buildSseBody(events: Array<{ event: string; data: unknown }>): string {
  return events.map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`).join("");
}

const PERSONA_IDS = [
  "strategy", "sales", "ap_biz", "ai_tech",
  "finance", "security", "customer", "innovation",
];

const MOCK_SSE_EVENTS = [
  // 8개 페르소나 eval_start + eval_complete
  ...PERSONA_IDS.flatMap((id) => [
    { event: "eval_start", data: { personaId: id } },
    {
      event: "eval_complete",
      data: {
        personaId: id,
        scores: {
          businessViability: 7, strategicFit: 8, customerValue: 6,
          techMarket: 7, execution: 5, financialFeasibility: 6, competitiveDiff: 8,
        },
        verdict: id === "security" ? "red" : id === "finance" ? "yellow" : "green",
        summary: `${id} 페르소나의 평가 요약입니다.`,
        concerns: id === "security" ? ["보안 위험 존재"] : [],
      },
    },
  ]),
  // 최종 결과
  {
    event: "final_result",
    data: {
      verdict: "green",
      avgScore: 7.2,
      totalConcerns: 1,
      scores: PERSONA_IDS.map((id, i) => ({
        personaId: id,
        scores: {
          businessViability: 7, strategicFit: 8, customerValue: 6,
          techMarket: 7, execution: 5, financialFeasibility: 6, competitiveDiff: 8,
        },
        verdict: id === "security" ? "red" : id === "finance" ? "yellow" : "green",
        summary: `${id} 평가 요약`,
        concerns: id === "security" ? ["보안 위험 존재"] : [],
        index: i,
      })),
      warnings: ["데모 모드로 실행되었습니다"],
    },
  },
];

function setupMocks(page: import("@playwright/test").Page) {
  return Promise.all([
    // Skip tours + guide modals
    page.evaluate(() => {
      localStorage.setItem("fx-discovery-tour-completed", "true");
      localStorage.setItem("fx-tour-completed", "true");
      localStorage.setItem("fx-guide-dismissed", "true");
      localStorage.setItem("fx-onboarding-completed", "true");
      localStorage.setItem("fx-process-guide-dismissed", "true");
    }),
    // Hide feedback widget
    page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = "[aria-label='피드백 보내기'] { display: none !important; }";
      document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
    }),
    // Mock SSE eval endpoint
    page.route("**/api/ax-bd/persona-eval", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
          body: buildSseBody(MOCK_SSE_EVENTS),
        });
      }
      return route.continue();
    }),
    // prevent real calls
    page.route("**/api/help-agent/**", (route) =>
      route.fulfill({ json: { content: "mock" } }),
    ),
    page.route("**/api/biz-items/**", (route) =>
      route.fulfill({ json: { id: "test-item-1", title: "테스트 아이템" } }),
    ),
  ]);
}

test.describe("Persona Eval (F344+F345)", () => {
  test("PersonaCardGrid — 8개 페르소나 카드 렌더링", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/persona-eval/test-item-1");

    // 페이지 제목
    await expect(page.getByText("AI 멀티 페르소나 평가")).toBeVisible({ timeout: 10000 });

    // 8개 카드 렌더링 (grid-cols-4 → 8 buttons) — 상세 패널 버튼 제외
    const cardGrid = page.locator("[class*='grid-cols']").first();
    const cards = cardGrid.locator("button").filter({ hasText: /팀장|부장|본부장/ });
    await expect(cards).toHaveCount(8, { timeout: 10000 });

    // 특정 페르소나 이름 확인 (.first() — 카드+상세 패널 중복 방지)
    await expect(page.getByText("전략기획팀장").first()).toBeVisible();
    await expect(page.getByText("영업총괄부장").first()).toBeVisible();
    await expect(page.getByText("AI기술본부장").first()).toBeVisible();
    await expect(page.getByText("혁신추진팀장").first()).toBeVisible();
  });

  test("WeightSliderPanel — 7축 슬라이더 렌더링", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/persona-eval/test-item-1");

    await expect(page.getByText("AI 멀티 페르소나 평가")).toBeVisible({ timeout: 10000 });

    // 가중치 설정 패널
    await expect(page.getByText("가중치 설정")).toBeVisible();

    // 7축 슬라이더 레이블 확인
    const axisLabels = ["사업성", "전략적합성", "고객가치", "기술/시장", "실행력", "재무타당성", "경쟁차별화"];
    for (const label of axisLabels) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
    }

    // 합계 표시
    await expect(page.getByText("합계: 100%")).toBeVisible();

    // range input 7개 확인
    const sliders = page.locator('input[type="range"]');
    await expect(sliders).toHaveCount(7);
  });

  test("데모 모드 체크박스 기본 활성화", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/persona-eval/test-item-1");

    await expect(page.getByText("AI 멀티 페르소나 평가")).toBeVisible({ timeout: 10000 });

    // 데모 모드 체크박스 — 기본 활성
    const demoCheckbox = page.locator('input[type="checkbox"]');
    await expect(demoCheckbox).toBeChecked();
    await expect(page.getByText("데모 모드")).toBeVisible();
  });

  test("스텝 네비게이션 — 설정 → 브리핑 → 평가 → 결과", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/persona-eval/test-item-1");

    await expect(page.getByText("AI 멀티 페르소나 평가")).toBeVisible({ timeout: 10000 });

    // 4개 탭 버튼 확인 (exact: true — "다음: 브리핑 →" 등 CTA 중복 방지)
    const tabs = ["설정", "브리핑", "평가", "결과"];
    for (const tab of tabs) {
      await expect(page.getByRole("button", { name: tab, exact: true })).toBeVisible();
    }

    // 설정 탭 → 브리핑 탭 전환
    await page.getByRole("button", { name: "다음: 브리핑 →" }).click();

    // 브리핑 탭에서 평가 시작 버튼 확인
    await expect(page.getByRole("button", { name: /데모 평가 시작|AI 평가 시작/ })).toBeVisible();
  });

  test("평가 실행 → EvalProgress + EvalResults 표시", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/persona-eval/test-item-1");

    await expect(page.getByText("AI 멀티 페르소나 평가")).toBeVisible({ timeout: 10000 });

    // 브리핑 탭으로 이동
    await page.getByRole("button", { name: "다음: 브리핑 →" }).click();

    // 평가 시작
    await page.getByRole("button", { name: /데모 평가 시작|AI 평가 시작/ }).click();

    // 결과 탭으로 자동 전환 (SSE mock이 즉시 final_result 반환)
    // Go/Conditional/No-Go 판정 배너 확인
    await expect(
      page.getByText("Go").first(),
    ).toBeVisible({ timeout: 15000 });

    // 평균 점수 표시
    await expect(page.getByText("7.2/10")).toBeVisible();

    // 우려사항 건수
    await expect(page.getByText("1건")).toBeVisible();

    // 페르소나별 요약 섹션
    await expect(page.getByText("페르소나별 평가 요약")).toBeVisible();
  });

  test("카드 선택 시 하이라이트 변경", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/persona-eval/test-item-1");

    await expect(page.getByText("AI 멀티 페르소나 평가")).toBeVisible({ timeout: 10000 });

    // 영업총괄부장 카드 클릭 (strict mode 방지 — .first())
    const salesCard = page.locator("button").filter({ hasText: "영업총괄부장" }).first();
    await salesCard.click();

    // 선택된 카드에 ring 스타일이 적용되는지 확인 (border-[#8b5cf6])
    await expect(salesCard).toHaveClass(/ring-2/);
  });

  test("페르소나별 결과 펼치기/접기", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/discovery/persona-eval/test-item-1");

    await expect(page.getByText("AI 멀티 페르소나 평가")).toBeVisible({ timeout: 10000 });

    // 브리핑 → 평가 시작 → 결과
    await page.getByRole("button", { name: "다음: 브리핑 →" }).click();
    await page.getByRole("button", { name: /데모 평가 시작|AI 평가 시작/ }).click();

    // 결과 배너 대기
    await expect(page.getByText("Go").first()).toBeVisible({ timeout: 15000 });

    // 첫 번째 페르소나 "펼치기" 클릭
    const expandButton = page.getByText("펼치기 ▼").first();
    if (await expandButton.isVisible()) {
      await expandButton.click();

      // 접기 상태 확인
      await expect(page.getByText("접기 ▲").first()).toBeVisible();
    }
  });
});
