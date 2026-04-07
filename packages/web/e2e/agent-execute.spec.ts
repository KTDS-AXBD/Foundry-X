import { test, expect } from "./fixtures/auth";

// @service: gate-x
// @sprint: 187
// @tagged-by: F400

test.describe("Agent Execute Flow", () => {
  test("에이전트 작업 실행 → 결과 표시", async ({ authenticatedPage: page }) => {
    // Mock agents list API
    await page.route("**/api/agents", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              id: "agent-1",
              name: "CodeReviewer",
              status: "active",
              description: "코드 리뷰 에이전트",
            },
          ]),
          headers: { "Content-Type": "application/json" },
        });
      }
      return route.continue();
    });

    // Mock SSE stream (abort immediately)
    await page.route("**/api/agents/stream", (route) =>
      route.fulfill({ status: 200, body: "", headers: { "Content-Type": "text/event-stream" } }),
    );

    // Mock execute API
    await page.route("**/api/agents/*/execute", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          status: "success",
          output: { analysis: "Review complete — no issues found" },
          tokensUsed: 100,
          model: "mock",
          duration: 1000,
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    await page.goto("/agents");

    // Wait for agent card to render
    await expect(page.getByText("CodeReviewer")).toBeVisible({ timeout: 10000 });

    // Click "작업 실행" button
    await page.getByRole("button", { name: /작업 실행/ }).click();

    // Modal should appear with agent name
    await expect(page.getByText("CodeReviewer — 작업 실행")).toBeVisible();

    // Click execute button in modal
    await page.getByRole("button", { name: /^실행$/ }).click();

    // Result should display
    await expect(page.getByText(/Review complete/)).toBeVisible({ timeout: 10000 });
  });

  test("실행 중 버튼 비활성화", async ({ authenticatedPage: page }) => {
    await page.route("**/api/agents", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          body: JSON.stringify([
            { id: "agent-1", name: "SlowAgent", status: "active", description: "느린 에이전트" },
          ]),
          headers: { "Content-Type": "application/json" },
        });
      }
      return route.continue();
    });

    await page.route("**/api/agents/stream", (route) =>
      route.fulfill({ status: 200, body: "", headers: { "Content-Type": "text/event-stream" } }),
    );

    // Delay the execute response to keep loading state
    await page.route("**/api/agents/*/execute", async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          status: "success",
          output: { analysis: "Done" },
          tokensUsed: 50,
          model: "mock",
          duration: 500,
        }),
        headers: { "Content-Type": "application/json" },
      });
    });

    await page.goto("/agents");
    await expect(page.getByText("SlowAgent")).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /작업 실행/ }).click();
    await expect(page.getByText("SlowAgent — 작업 실행")).toBeVisible();

    // Click execute
    await page.getByRole("button", { name: /^실행$/ }).click();

    // Button should show "실행 중..." (loading state)
    await expect(page.getByRole("button", { name: /실행 중/ })).toBeVisible();
  });

  test("에러 시 에러 표시", async ({ authenticatedPage: page }) => {
    await page.route("**/api/agents", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          body: JSON.stringify([
            { id: "agent-1", name: "ErrorAgent", status: "active", description: "에러 에이전트" },
          ]),
          headers: { "Content-Type": "application/json" },
        });
      }
      return route.continue();
    });

    await page.route("**/api/agents/stream", (route) =>
      route.fulfill({ status: 200, body: "", headers: { "Content-Type": "text/event-stream" } }),
    );

    // Mock execute API with 503 error
    await page.route("**/api/agents/*/execute", (route) =>
      route.fulfill({
        status: 503,
        body: JSON.stringify({ error: "Service unavailable" }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    await page.goto("/agents");
    await expect(page.getByText("ErrorAgent")).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /작업 실행/ }).click();
    await expect(page.getByText("ErrorAgent — 작업 실행")).toBeVisible();

    await page.getByRole("button", { name: /^실행$/ }).click();

    // Error message should display
    await expect(page.getByText(/실행 실패|503/)).toBeVisible({ timeout: 10000 });
  });
});
