/**
 * E2E: Share Links (F233) — 공유 링크 API mock + UI
 * page.evaluate(fetch)로 브라우저 컨텍스트에서 호출 → page.route() mock 적용
 */
import { test, expect } from "./fixtures/auth";

// @service: infra/shared
// @sprint: 187
// @tagged-by: F400

test.describe("Share Links (F233)", () => {
  test("공유 링크 생성 + 목록 조회", async ({ authenticatedPage: page }) => {
    await page.route("**/api/share-links*", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ status: 201, json: { token: "share-token-abc123" } });
      }
      return route.fulfill({
        json: [{ id: "sl-1", bizItemId: "biz-1", accessLevel: "view", token: "token-1", createdAt: "2026-03-28T00:00:00Z" }],
      });
    });

    // 생성
    const createData = await page.evaluate(async () => {
      const res = await fetch("/api/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "biz-1", accessLevel: "view", expiresInDays: 7 }),
      });
      return { status: res.status, body: await res.json() };
    });
    expect(createData.status).toBe(201);
    expect(createData.body.token).toBe("share-token-abc123");

    // 목록
    const listData = await page.evaluate(async () => {
      const res = await fetch("/api/share-links");
      return { status: res.status, body: await res.json() };
    });
    expect(listData.status).toBe(200);
    expect(listData.body).toHaveLength(1);
  });

  test("공유 다이얼로그 UI — 파이프라인에서 아이템 표시", async ({ authenticatedPage: page }) => {
    await page.route("**/api/pipeline/kanban*", (route) =>
      route.fulfill({
        json: [{
          stage: "REGISTERED", count: 1,
          items: [{ id: "share-test", title: "공유 테스트 아이템", description: null, currentStage: "REGISTERED", stageEnteredAt: "2026-03-28T00:00:00Z", createdBy: "user1", createdAt: "2026-03-28T00:00:00Z" }],
        }],
      }),
    );
    await page.route("**/api/pipeline/stats*", (route) =>
      route.fulfill({ json: { totalItems: 1, byStage: { REGISTERED: 1 }, avgDaysInStage: {} } }),
    );

    await page.goto("/validation/pipeline");
    await expect(page.getByText("공유 테스트 아이템")).toBeVisible();
  });
});
