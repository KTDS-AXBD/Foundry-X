import { test, expect } from "./fixtures/auth";

// @service: meta-agent
// @sprint: 286
// @tagged-by: F533

const MOCK_DIAGNOSE_RESPONSE = {
  report: {
    sessionId: "e2e-session-001",
    agentId: "planner",
    collectedAt: new Date().toISOString(),
    overallScore: 55,
    scores: [
      { axis: "ToolEffectiveness", score: 40, rawValue: 0.4, unit: "ratio", trend: "down" },
      { axis: "Memory", score: 35, rawValue: 800, unit: "tokens/round", trend: "down" },
      { axis: "Planning", score: 60, rawValue: 3.2, unit: "rounds", trend: "stable" },
      { axis: "Verification", score: 50, rawValue: 50, unit: "score", trend: "stable" },
      { axis: "Cost", score: 45, rawValue: 1200, unit: "tokens/round", trend: "down" },
      { axis: "Convergence", score: 50, rawValue: 0.5, unit: "ratio", trend: "stable" },
    ],
  },
  proposals: [
    {
      id: "proposal-e2e-001",
      sessionId: "e2e-session-001",
      agentId: "planner",
      type: "prompt",
      title: "시스템 프롬프트에 도구 우선순위 가이드 추가",
      reasoning: "ToolEffectiveness 점수가 40으로 낮습니다.",
      yamlDiff:
        '- systemPrompt: "You are a discovery agent."\n+ systemPrompt: "You are a discovery agent.\\nTool Priority: prefer web_search first."',
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

const MOCK_PROPOSALS_LIST = { proposals: MOCK_DIAGNOSE_RESPONSE.proposals };

const MOCK_APPROVE_RESPONSE = {
  proposal: { ...MOCK_DIAGNOSE_RESPONSE.proposals[0], status: "approved" },
};

const MOCK_REJECT_RESPONSE = {
  proposal: {
    ...MOCK_DIAGNOSE_RESPONSE.proposals[0],
    status: "rejected",
    rejectionReason: "비용 개선이 더 시급함",
  },
};

test.describe("F533 Agent Meta Dashboard", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // 진단 API mock
    await page.route("**/api/meta/diagnose", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 200,
          body: JSON.stringify(MOCK_DIAGNOSE_RESPONSE),
          headers: { "Content-Type": "application/json" },
        });
      }
      return route.continue();
    });

    // proposals 목록 API mock
    await page.route("**/api/meta/proposals**", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          body: JSON.stringify(MOCK_PROPOSALS_LIST),
          headers: { "Content-Type": "application/json" },
        });
      }
      return route.continue();
    });
  });

  test("진단 폼이 렌더링된다", async ({ authenticatedPage: page }) => {
    await page.goto("/agents/meta");
    await expect(page.getByText("Agent Meta Layer")).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder("Session ID")).toBeVisible();
    await expect(page.getByPlaceholder("Agent ID")).toBeVisible();
    await expect(page.getByRole("button", { name: /진단 실행/ })).toBeVisible();
  });

  test("세션 ID 없으면 진단 실행 버튼 비활성화", async ({ authenticatedPage: page }) => {
    await page.goto("/agents/meta");
    await expect(page.getByRole("button", { name: /진단 실행/ })).toBeDisabled({ timeout: 10000 });
  });

  test("진단 실행 → 6축 결과 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/agents/meta");
    await expect(page.getByPlaceholder("Session ID")).toBeVisible({ timeout: 10000 });

    // 세션 ID 입력
    await page.getByPlaceholder("Session ID").fill("e2e-session-001");
    await page.getByRole("button", { name: /진단 실행/ }).click();

    // 6축 결과 확인
    await expect(page.getByText("6축 진단 결과")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("도구 효율")).toBeVisible();
    await expect(page.getByText("메모리 활용")).toBeVisible();
    await expect(page.getByText("55/100")).toBeVisible();
  });

  test("진단 후 proposals 표시 → 승인 버튼 클릭", async ({ authenticatedPage: page }) => {
    // approve API mock
    await page.route("**/api/meta/proposals/proposal-e2e-001/approve", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 200,
          body: JSON.stringify(MOCK_APPROVE_RESPONSE),
          headers: { "Content-Type": "application/json" },
        });
      }
      return route.continue();
    });

    await page.goto("/agents/meta");
    await expect(page.getByPlaceholder("Session ID")).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder("Session ID").fill("e2e-session-001");
    await page.getByRole("button", { name: /진단 실행/ }).click();

    // proposal 카드 확인
    await expect(page.getByText("시스템 프롬프트에 도구 우선순위 가이드 추가")).toBeVisible({ timeout: 10000 });

    // 승인 버튼 클릭
    await page.getByRole("button", { name: /✓ 승인/ }).first().click();

    // 상태 변경 확인
    await expect(page.getByText("승인됨")).toBeVisible({ timeout: 5000 });
  });

  test("거부 버튼 클릭 → 사유 입력 → rejected 상태", async ({ authenticatedPage: page }) => {
    // reject API mock
    await page.route("**/api/meta/proposals/proposal-e2e-001/reject", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 200,
          body: JSON.stringify(MOCK_REJECT_RESPONSE),
          headers: { "Content-Type": "application/json" },
        });
      }
      return route.continue();
    });

    await page.goto("/agents/meta");
    await expect(page.getByPlaceholder("Session ID")).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder("Session ID").fill("e2e-session-001");
    await page.getByRole("button", { name: /진단 실행/ }).click();

    await expect(page.getByText("시스템 프롬프트에 도구 우선순위 가이드 추가")).toBeVisible({ timeout: 10000 });

    // 거부 버튼 클릭
    await page.getByRole("button", { name: /✕ 거부/ }).first().click();

    // 사유 입력
    await page.getByPlaceholder("거부 사유 입력...").fill("비용 개선이 더 시급함");
    await page.getByRole("button", { name: /^확인$/ }).click();

    // 거부됨 상태 확인
    await expect(page.getByText("거부됨")).toBeVisible({ timeout: 5000 });
  });

  test("필터 탭 — 전체/대기중/승인/거부 전환", async ({ authenticatedPage: page }) => {
    await page.goto("/agents/meta");
    await expect(page.getByPlaceholder("Session ID")).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder("Session ID").fill("e2e-session-001");
    await page.getByRole("button", { name: /진단 실행/ }).click();
    await expect(page.getByText("개선 제안")).toBeVisible({ timeout: 10000 });

    // 필터 버튼들 존재 확인
    await expect(page.getByRole("button", { name: "전체" })).toBeVisible();
    await expect(page.getByRole("button", { name: "대기중" })).toBeVisible();
    await expect(page.getByRole("button", { name: "승인" })).toBeVisible();
    await expect(page.getByRole("button", { name: "거부" })).toBeVisible();

    // 승인 필터 클릭 → 빈 목록 (모든 proposal이 pending)
    await page.getByRole("button", { name: "승인" }).click();
    await expect(page.getByText("해당 상태의 제안이 없어요.")).toBeVisible({ timeout: 3000 });
  });
});
