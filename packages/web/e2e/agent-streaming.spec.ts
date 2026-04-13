// ─── F532: 에이전트 스트리밍 E2E Playwright 테스트 (Sprint 285) ───
// @service: gate-x
// @sprint: 285
// @tagged-by: F532

import { test, expect } from "./fixtures/auth";

function buildSSEBody(events: Record<string, unknown>[]): string {
  return events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
}

test.describe("F532 — 에이전트 스트리밍 E2E", () => {
  // ─── Test 9: 스트리밍 텍스트 UI 렌더링 ───

  test("test 9: SSE 스트리밍 → AgentStreamDashboard에 텍스트 렌더링", async ({
    authenticatedPage: page,
  }) => {
    const streamEvents = [
      {
        type: "run_started",
        sessionId: "e2e-session",
        timestamp: new Date().toISOString(),
        payload: { agentId: "planner", input: "test" },
      },
      {
        type: "text_delta",
        sessionId: "e2e-session",
        timestamp: new Date().toISOString(),
        payload: { delta: "스트리밍 응답 텍스트", accumulated: "스트리밍 응답 텍스트" },
      },
      {
        type: "run_completed",
        sessionId: "e2e-session",
        timestamp: new Date().toISOString(),
        payload: {
          result: {
            output: "스트리밍 응답 텍스트",
            rounds: 1,
            tokenUsage: { inputTokens: 10, outputTokens: 20, cacheReadTokens: 0, totalTokens: 30 },
            stopReason: "end_turn",
          },
          metricId: "m1",
        },
      },
    ];

    await page.route("**/api/agents/run/stream", (route) =>
      route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream", "X-Session-Id": "e2e-session" },
        body: buildSSEBody(streamEvents),
      }),
    );

    await page.goto("/agent-stream");

    // AgentStreamDashboard 헤딩 확인
    await expect(page.getByText("Agent Streaming Dashboard")).toBeVisible({ timeout: 10000 });

    // 입력 채우기
    await page.locator("textarea").fill("test input");

    // 실행 버튼 클릭
    await page.getByRole("button", { name: /^실행$/ }).click();

    // 스트리밍 텍스트가 "에이전트 출력" 영역에 표시되어야 함
    await expect(page.getByText("스트리밍 응답 텍스트")).toBeVisible({ timeout: 10000 });
  });

  // ─── Test 10: 완료 상태 표시 ───

  test("test 10: run_completed 이벤트 → 메트릭 배지 표시", async ({
    authenticatedPage: page,
  }) => {
    const completedEvents = [
      {
        type: "run_started",
        sessionId: "s2",
        timestamp: new Date().toISOString(),
        payload: { agentId: "planner", input: "check" },
      },
      {
        type: "run_completed",
        sessionId: "s2",
        timestamp: new Date().toISOString(),
        payload: {
          result: {
            output: "완료된 출력",
            rounds: 2,
            tokenUsage: { inputTokens: 5, outputTokens: 10, cacheReadTokens: 0, totalTokens: 15 },
            stopReason: "end_turn",
          },
          metricId: "m2",
        },
      },
    ];

    await page.route("**/api/agents/run/stream", (route) =>
      route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream", "X-Session-Id": "s2" },
        body: buildSSEBody(completedEvents),
      }),
    );

    await page.goto("/agent-stream");
    await expect(page.getByText("Agent Streaming Dashboard")).toBeVisible({ timeout: 10000 });

    await page.locator("textarea").fill("check task");
    await page.getByRole("button", { name: /^실행$/ }).click();

    // 메트릭 배지가 표시되어야 함 (run_completed 후)
    await expect(page.getByText("라운드")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("종료 이유")).toBeVisible({ timeout: 5000 });
  });

  // ─── Test 11: 에러 상태 표시 ───

  test("test 11: run_failed 이벤트 → 에러 메시지 표시", async ({
    authenticatedPage: page,
  }) => {
    const failedEvents = [
      {
        type: "run_started",
        sessionId: "s3",
        timestamp: new Date().toISOString(),
        payload: { agentId: "planner", input: "fail" },
      },
      {
        type: "run_failed",
        sessionId: "s3",
        timestamp: new Date().toISOString(),
        payload: { error: "에이전트 실행 실패" },
      },
    ];

    await page.route("**/api/agents/run/stream", (route) =>
      route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream", "X-Session-Id": "s3" },
        body: buildSSEBody(failedEvents),
      }),
    );

    await page.goto("/agent-stream");
    await expect(page.getByText("Agent Streaming Dashboard")).toBeVisible({ timeout: 10000 });

    await page.locator("textarea").fill("fail test");
    await page.getByRole("button", { name: /^실행$/ }).click();

    // 에러 div 또는 이벤트 로그에 에러 텍스트가 표시되어야 함
    await expect(
      page.locator("text=에이전트 실행 실패").first()
    ).toBeVisible({ timeout: 10000 });
  });
});
