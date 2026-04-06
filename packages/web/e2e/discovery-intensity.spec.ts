/**
 * E2E: F342+F343 Discovery 강도 라우팅 — IntensityIndicator + 간소 스킵 + 매트릭스
 * API mock 기반 — API 서버 없이도 동작
 */
import { test, expect } from "./fixtures/auth";

// ── 5유형별 biz-item mock ──
function makeBizItems(type: string) {
  return {
    items: [
      {
        id: "biz-1",
        title: `테스트 아이템 (${type}형)`,
        description: "강도 라우팅 테스트용",
        discoveryType: type,
        orgId: "o1",
        authorId: "test-user-id",
        createdAt: 1711929600,
        updatedAt: 1711929600,
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
  };
}

const MOCK_TRAFFIC_LIGHT = {
  overallSignal: "green",
  summary: { go: 4, pivot: 2, drop: 1 },
  dimensions: { market: "green", tech: "yellow", team: "green" },
};

/** 5유형×7단계 강도 매트릭스 — IntensityMatrix.tsx/WizardStepDetail.tsx 기준 */
const INTENSITY_MATRIX: Record<string, Record<string, string>> = {
  "2-1": { I: "light", M: "normal", P: "light", T: "core", S: "core" },
  "2-2": { I: "core", M: "core", P: "core", T: "core", S: "light" },
  "2-3": { I: "normal", M: "core", P: "core", T: "core", S: "core" },
  "2-4": { I: "core", M: "normal", P: "core", T: "core", S: "core" },
  "2-5": { I: "core", M: "core", P: "core", T: "core", S: "normal" },
  "2-6": { I: "core", M: "core", P: "core", T: "normal", S: "normal" },
  "2-7": { I: "normal", M: "normal", P: "core", T: "normal", S: "core" },
};

/** 강도→심볼 매핑 */
const INTENSITY_SYMBOLS: Record<string, string> = {
  core: "★",
  normal: "○",
  light: "△",
};

/** 강도→라벨 매핑 */
const INTENSITY_LABELS: Record<string, string> = {
  core: "핵심",
  normal: "보통",
  light: "간소",
};

function makeStages(currentStage: string, pendingStages: string[] = []) {
  const allStages = ["2-0", "2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7", "2-8", "2-9", "2-10"];
  return {
    stages: allStages.map((stage) => ({
      stage,
      status: pendingStages.includes(stage)
        ? "pending"
        : stage <= currentStage
          ? "completed"
          : "pending",
      updatedAt: stage <= currentStage ? "2026-03-30T00:00:00Z" : null,
    })),
    currentStage,
  };
}

function setupMocks(page: import("@playwright/test").Page, discoveryType: string, currentStage = "2-1", pendingStages?: string[]) {
  const stagesData = makeStages(currentStage, pendingStages);
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
    page.route("**/api/biz-items", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: makeBizItems(discoveryType) });
      }
      return route.continue();
    }),
    page.route("**/api/ax-bd/viability/traffic-light/**", (route) =>
      route.fulfill({ json: MOCK_TRAFFIC_LIGHT }),
    ),
    page.route("**/api/biz-items/*/discovery-progress", (route) =>
      route.fulfill({ json: stagesData }),
    ),
    page.route("**/api/biz-items/*/discovery-stage", (route) =>
      route.fulfill({ json: { ok: true } }),
    ),
    page.route("**/api/help-agent/**", (route) =>
      route.fulfill({ json: { content: "mock" } }),
    ),
    // Persona endpoints (F342)
    page.route("**/api/ax-bd/persona-configs/**", (route) =>
      route.fulfill({ json: { data: [] } }),
    ),
    page.route("**/api/ax-bd/persona-evals/**", (route) =>
      route.fulfill({ json: { data: [] } }),
    ),
  ]);
}

test.describe("Discovery 강도 라우팅 (F342+F343)", () => {
  // ── 1. 유형별 강도 표시(★핵심/○보통/△간소) 확인 ──
  for (const type of ["I", "M", "P", "T", "S"] as const) {
    test(`유형 ${type} — 단계 2-1에서 올바른 강도 표시`, async ({
      authenticatedPage: page,
    }) => {
      // 2-1을 pending으로, currentStage를 2-1로 설정하여 Wizard가 2-1 detail을 표시
      await setupMocks(page, type, "2-0", ["2-1"]);
      await page.goto("/discovery/items");

      // Wizard 렌더링 대기
      await expect(
        page.locator("[data-tour='discovery-wizard']"),
      ).toBeVisible({ timeout: 10000 });

      // 스텝퍼 클릭으로 2-1 상세 표시
      const stepper = page.locator("[data-tour='discovery-stepper']");
      await expect(stepper).toBeVisible({ timeout: 10000 });

      // 2-1 버튼 클릭 (두 번째 스텝)
      const stepButtons = stepper.locator("button");
      await stepButtons.nth(1).click();

      // Step detail 표시 대기
      const stepDetail = page.locator("[data-tour='discovery-step-detail']");
      await expect(stepDetail).toBeVisible({ timeout: 10000 });

      // 강도 인디케이터 확인 — IntensityIndicator는 title 속성으로 "핵심 분석"/"보통 분석"/"간소 분석" 표시
      const expectedIntensity = INTENSITY_MATRIX["2-1"][type];
      const expectedLabel = INTENSITY_LABELS[expectedIntensity];
      const indicator = stepDetail.locator(`[title="${expectedLabel} 분석"]`);
      await expect(indicator).toBeVisible();

      // 심볼 확인
      const expectedSymbol = INTENSITY_SYMBOLS[expectedIntensity];
      await expect(indicator).toContainText(expectedSymbol);
    });
  }

  // ── 2. 간소(light) 단계에서 스킵 옵션 표시 확인 ──
  test("간소(light) 단계 — 건너뛰기 버튼 표시", async ({
    authenticatedPage: page,
  }) => {
    // I유형의 2-1은 light → 건너뛰기 버튼 표시되어야 함
    await setupMocks(page, "I", "2-0", ["2-1"]);
    await page.goto("/discovery/items");

    await expect(
      page.locator("[data-tour='discovery-stepper']"),
    ).toBeVisible({ timeout: 10000 });

    // 2-1 단계 클릭
    const stepButtons = page.locator("[data-tour='discovery-stepper'] button");
    await stepButtons.nth(1).click();

    const stepDetail = page.locator("[data-tour='discovery-step-detail']");
    await expect(stepDetail).toBeVisible({ timeout: 10000 });

    // 건너뛰기 버튼이 pending + light일 때 표시됨
    const skipButton = stepDetail.getByRole("button", { name: /건너뛰기/ });
    await expect(skipButton).toBeVisible();

    // 시작하기 버튼도 함께 표시됨
    const startButton = stepDetail.getByRole("button", { name: /시작하기/ });
    await expect(startButton).toBeVisible();
  });

  test("핵심(core) 단계 — 건너뛰기 버튼 미표시", async ({
    authenticatedPage: page,
  }) => {
    // I유형의 2-2는 core → 건너뛰기 버튼 없어야 함
    await setupMocks(page, "I", "2-1", ["2-2"]);
    await page.goto("/discovery/items");

    await expect(
      page.locator("[data-tour='discovery-stepper']"),
    ).toBeVisible({ timeout: 10000 });

    // 2-2 단계 클릭 (세 번째)
    const stepButtons = page.locator("[data-tour='discovery-stepper'] button");
    await stepButtons.nth(2).click();

    const stepDetail = page.locator("[data-tour='discovery-step-detail']");
    await expect(stepDetail).toBeVisible({ timeout: 10000 });

    // 건너뛰기 버튼 없어야 함
    const skipButton = stepDetail.getByRole("button", { name: /건너뛰기/ });
    await expect(skipButton).not.toBeVisible();

    // 시작하기 버튼은 있어야 함
    const startButton = stepDetail.getByRole("button", { name: /시작하기/ });
    await expect(startButton).toBeVisible();
  });

  // ── 3. 프로세스 흐름/유형 매트릭스 시각화 확인 ──
  test("프로세스 흐름 / 유형 매트릭스 토글 표시", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page, "T");
    await page.goto("/discovery/items");

    await expect(
      page.locator("[data-tour='discovery-wizard']"),
    ).toBeVisible({ timeout: 10000 });

    // "전체 프로세스 흐름 / 유형 매트릭스" 토글 버튼 클릭
    const toggleButton = page.getByText("전체 프로세스 흐름 / 유형 매트릭스");
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();

    // TypeRoutingMatrix 컴포넌트 렌더링 — 5유형 라벨 확인
    await expect(page.getByText("아이디어형").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("시장·타겟형").first()).toBeVisible();
    await expect(page.getByText("고객문제형").first()).toBeVisible();
    await expect(page.getByText("기술형").first()).toBeVisible();
    await expect(page.getByText("기존서비스형").first()).toBeVisible();

    // 매트릭스 테이블이 렌더링되는지 확인
    await expect(page.locator("table").first()).toBeVisible();
  });

  // ── 4. 다른 유형 전환 시 강도 변화 검증 ──
  test("유형별 강도 차이 — S유형 2-2는 light, I유형 2-2는 core", async ({
    authenticatedPage: page,
  }) => {
    // S유형: 2-2가 light (스킵 가능)
    await setupMocks(page, "S", "2-1", ["2-2"]);
    await page.goto("/discovery/items");

    await expect(
      page.locator("[data-tour='discovery-stepper']"),
    ).toBeVisible({ timeout: 10000 });

    // 2-2 클릭
    const stepButtons = page.locator("[data-tour='discovery-stepper'] button");
    await stepButtons.nth(2).click();

    const stepDetail = page.locator("[data-tour='discovery-step-detail']");
    await expect(stepDetail).toBeVisible({ timeout: 10000 });

    // S유형 2-2는 light → 간소 표시 + 건너뛰기 가능
    const lightIndicator = stepDetail.locator("[title='간소 분석']");
    await expect(lightIndicator).toBeVisible();

    const skipButton = stepDetail.getByRole("button", { name: /건너뛰기/ });
    await expect(skipButton).toBeVisible();
  });

  // ── 5. 건너뛰기 동작 검증 ──
  test("건너뛰기 클릭 → API 호출", async ({
    authenticatedPage: page,
  }) => {
    let stageUpdateCalled = false;
    let stageUpdateBody: unknown = null;

    // I유형 2-1 = light, pending
    await setupMocks(page, "I", "2-0", ["2-1"]);

    // discovery-stage 호출 감시
    await page.route("**/api/biz-items/*/discovery-stage", (route) => {
      stageUpdateCalled = true;
      stageUpdateBody = route.request().postDataJSON?.() ?? null;
      return route.fulfill({ json: { ok: true } });
    });

    await page.goto("/discovery/items");

    await expect(
      page.locator("[data-tour='discovery-stepper']"),
    ).toBeVisible({ timeout: 10000 });

    // 2-1 클릭
    const stepButtons = page.locator("[data-tour='discovery-stepper'] button");
    await stepButtons.nth(1).click();

    const stepDetail = page.locator("[data-tour='discovery-step-detail']");
    await expect(stepDetail).toBeVisible({ timeout: 10000 });

    // 건너뛰기 클릭
    const skipButton = stepDetail.getByRole("button", { name: /건너뛰기/ });
    await expect(skipButton).toBeVisible();
    await skipButton.click();

    // API 호출 확인 (mock 응답이므로 에러 없이 완료)
    // discovery-stage mock이 호출되었어야 함 — auto-retry로 대기
    await expect.poll(() => stageUpdateCalled, { timeout: 5000 }).toBe(true);
  });

  // ── 6. Wizard 내 IntensityIndicator 렌더링 검증 (다수 단계) ──
  test("T유형 — 단계별 강도 인디케이터 렌더링", async ({
    authenticatedPage: page,
  }) => {
    // T유형: 2-1=core, 2-6=normal
    await setupMocks(page, "T", "2-5", ["2-6"]);
    await page.goto("/discovery/items");

    await expect(
      page.locator("[data-tour='discovery-stepper']"),
    ).toBeVisible({ timeout: 10000 });

    // 2-6 클릭 (일곱 번째 버튼, 0-indexed: 6)
    const stepButtons = page.locator("[data-tour='discovery-stepper'] button");
    await stepButtons.nth(6).click();

    const stepDetail = page.locator("[data-tour='discovery-step-detail']");
    await expect(stepDetail).toBeVisible({ timeout: 10000 });

    // T유형 2-6은 normal → "보통 분석" 인디케이터
    const normalIndicator = stepDetail.locator("[title='보통 분석']");
    await expect(normalIndicator).toBeVisible();
    await expect(normalIndicator).toContainText("○");
    await expect(normalIndicator).toContainText("보통");
  });
});
