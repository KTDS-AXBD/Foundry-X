/**
 * E2E: Help Agent (F264) — 챗 UI 토글 + 로컬 응답 + SSE 스트리밍
 * API mock 기반
 */
import { test, expect } from "./fixtures/auth";

function setupBaseMocks(page: import("@playwright/test").Page) {
  return Promise.all([
    page.evaluate(() => {
      localStorage.setItem("fx-discovery-tour-completed", "true");
      localStorage.setItem("fx-tour-completed", "true");
    }),
    // Hide feedback widget to prevent click interception on Help Agent FAB
    page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = "[aria-label='피드백 보내기'] { display: none !important; }";
      document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
    }),
    page.route("**/api/biz-items", (route) =>
      route.fulfill({
        json: {
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
        },
      }),
    ),
    page.route("**/api/ax-bd/viability/traffic-light/**", (route) =>
      route.fulfill({
        json: {
          overallSignal: "green",
          summary: { go: 3, pivot: 2, drop: 1 },
        },
      }),
    ),
    page.route("**/api/biz-items/*/discovery-progress", (route) =>
      route.fulfill({
        json: {
          stages: [
            { stage: "2-0", status: "completed", updatedAt: "2026-03-30T00:00:00Z" },
            { stage: "2-1", status: "in_progress", updatedAt: "2026-03-30T00:00:00Z" },
          ],
          currentStage: "2-1",
        },
      }),
    ),
    page.route("**/api/biz-items/*/discovery-stage", (route) =>
      route.fulfill({ json: { ok: true } }),
    ),
  ]);
}

test.describe("Help Agent (F264)", () => {
  test("채팅 UI 토글 — FAB 클릭으로 열고 닫기", async ({
    authenticatedPage: page,
  }) => {
    await setupBaseMocks(page);
    await page.route("**/api/help-agent/**", (route) =>
      route.fulfill({ json: { content: "mock" } }),
    );

    await page.goto("/discovery/items");
    await expect(
      page.locator("[data-tour='discovery-wizard']"),
    ).toBeVisible({ timeout: 10000 });

    // FAB 버튼 찾기
    const fab = page.getByLabel("Help Agent 열기");
    await expect(fab).toBeVisible();

    // 클릭 → 채팅 패널 열림
    await fab.click();
    await expect(page.getByText("Help Agent")).toBeVisible();
    await expect(
      page.getByPlaceholder("질문을 입력하세요..."),
    ).toBeVisible();

    // X 버튼으로 닫기
    // Help Agent 헤더 옆 X 버튼 (두 번째 button in header)
    const closeBtn = page
      .locator(".bg-indigo-600")
      .getByRole("button")
      .last();
    await closeBtn.click();
    await expect(
      page.getByPlaceholder("질문을 입력하세요..."),
    ).not.toBeVisible();
  });

  test("로컬 응답 — JSON 응답 + '즉시 응답' 뱃지", async ({
    authenticatedPage: page,
  }) => {
    await setupBaseMocks(page);

    // Mock: 로컬 응답 (application/json)
    await page.route("**/api/help-agent/chat", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: "다음 단계는 2-2 '시장 규모 추정'이에요.",
          isLocalResponse: true,
        }),
      }),
    );

    await page.goto("/discovery/items");
    await expect(
      page.locator("[data-tour='discovery-wizard']"),
    ).toBeVisible({ timeout: 10000 });

    // 채팅 열기
    await page.getByLabel("Help Agent 열기").click();
    await expect(page.getByPlaceholder("질문을 입력하세요...")).toBeVisible();

    // 메시지 전송
    const input = page.getByPlaceholder("질문을 입력하세요...");
    await input.fill("다음 단계 뭐야?");
    await input.press("Enter");

    // 사용자 메시지 표시
    await expect(page.getByText("다음 단계 뭐야?")).toBeVisible({
      timeout: 5000,
    });

    // 어시스턴트 응답 표시
    await expect(
      page.getByText("다음 단계는 2-2 '시장 규모 추정'이에요."),
    ).toBeVisible({ timeout: 5000 });

    // "즉시 응답" 뱃지
    await expect(page.getByText("즉시 응답")).toBeVisible();
  });

  test("SSE 스트리밍 응답 — 점진적 렌더링", async ({
    authenticatedPage: page,
  }) => {
    await setupBaseMocks(page);

    // Mock: SSE stream (text/event-stream via fetch ReadableStream)
    await page.route("**/api/help-agent/chat", (route) => {
      const sseBody = [
        'data: {"choices":[{"delta":{"content":"BMC는 "}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"Business Model Canvas의 "}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"약자예요."}}]}\n\n',
        "data: [DONE]\n\n",
      ].join("");

      return route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sseBody,
      });
    });

    await page.goto("/discovery/items");
    await expect(
      page.locator("[data-tour='discovery-wizard']"),
    ).toBeVisible({ timeout: 10000 });

    // 채팅 열기 + 메시지 전송
    await page.getByLabel("Help Agent 열기").click();
    const input = page.getByPlaceholder("질문을 입력하세요...");
    await input.fill("BMC가 뭐야?");
    await input.press("Enter");

    // 사용자 메시지
    await expect(page.getByText("BMC가 뭐야?")).toBeVisible({ timeout: 5000 });

    // 스트리밍 응답 (전체 합쳐진 텍스트)
    await expect(
      page.getByText("BMC는 Business Model Canvas의 약자예요."),
    ).toBeVisible({ timeout: 10000 });
  });

  test("새 대화 리셋", async ({ authenticatedPage: page }) => {
    await setupBaseMocks(page);
    await page.route("**/api/help-agent/chat", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ content: "테스트 응답", isLocalResponse: true }),
      }),
    );

    await page.goto("/discovery/items");
    await expect(
      page.locator("[data-tour='discovery-wizard']"),
    ).toBeVisible({ timeout: 10000 });

    // 채팅 열기 + 메시지 전송
    await page.getByLabel("Help Agent 열기").click();
    const input = page.getByPlaceholder("질문을 입력하세요...");
    await input.fill("테스트");
    await input.press("Enter");

    await expect(page.getByText("테스트 응답")).toBeVisible({ timeout: 5000 });

    // 리셋 버튼 (새 대화) — 헤더 첫 번째 버튼
    const resetBtn = page
      .locator(".bg-indigo-600")
      .getByRole("button")
      .first();
    await resetBtn.click();

    // 메시지가 사라지고 빈 상태로 돌아감
    await expect(page.getByText("BD 프로세스에 대해 물어보세요!")).toBeVisible({
      timeout: 5000,
    });
  });
});
