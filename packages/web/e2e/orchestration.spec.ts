// ─── F337: Orchestration Dashboard E2E (Sprint 152) ───

import { test, expect } from "./fixtures/auth";

test.describe("Orchestration Dashboard", () => {
  test("page renders with title and 3 tabs", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/orchestration");

    await expect(
      page.getByRole("heading", { name: /Orchestration Dashboard/i }),
    ).toBeVisible();

    // 3 tabs exist
    await expect(page.getByRole("button", { name: "Tasks" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Loop History" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Telemetry" })).toBeVisible();
  });

  test("Tasks tab shows empty state or kanban", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/orchestration");

    // Either empty state or kanban columns
    const content = page
      .getByText(/아직 오케스트레이션 태스크가 없어요/i)
      .or(page.getByText(/접수/i));

    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("Loop History tab shows task selector", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/orchestration");

    await page.getByRole("button", { name: "Loop History" }).click();

    await expect(
      page.getByText(/태스크를 선택하면 루프 이력이 표시돼요/i),
    ).toBeVisible();
  });

  test("Telemetry tab shows empty state or event log", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/orchestration");

    await page.getByRole("button", { name: "Telemetry" }).click();

    const content = page
      .getByText(/아직 텔레메트리 이벤트가 없어요/i)
      .or(page.getByText(/소스별 이벤트 수/i));

    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});
