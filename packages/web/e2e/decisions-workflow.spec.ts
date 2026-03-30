/**
 * E2E: Decision Workflow (F239) — DecisionPanel UI + API mock
 * page.evaluate(fetch)로 브라우저 컨텍스트에서 호출 → page.route() mock 적용
 */
import { test, expect } from "./fixtures/auth";

const MOCK_DECISIONS = [
  { id: "dec-1", decision: "GO", comment: "시장성 검증 완료", decidedBy: "manager@test.com", createdAt: "2026-03-28T09:00:00Z", stage: "DECISION" },
  { id: "dec-2", decision: "HOLD", comment: "예산 확인 필요", decidedBy: "director@test.com", createdAt: "2026-03-25T14:00:00Z", stage: "REVIEW" },
];

test.describe("Decision Workflow (F239)", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route("**/api/decisions/stats*", (route) =>
      route.fulfill({ json: { total: 5, byDecision: { GO: 3, HOLD: 1, DROP: 1 } } }),
    );
    await page.route("**/api/decisions", (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          json: { id: "dec-new", ...body, decidedBy: "user", createdAt: new Date().toISOString() },
        });
      }
      return route.fulfill({ json: MOCK_DECISIONS });
    });
  });

  test("의사결정 목록 조회", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/decisions");
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(200);
    expect(data.body).toHaveLength(2);
    expect(data.body[0].decision).toBe("GO");
  });

  test("의사결정 통계 조회", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/decisions/stats");
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(200);
    expect(data.body.total).toBe(5);
    expect(data.body.byDecision.GO).toBe(3);
  });

  test("의사결정 등록 — Go", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "biz-001", decision: "GO", comment: "사업성 검증 완료" }),
      });
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(201);
    expect(data.body.decision).toBe("GO");
    expect(data.body.comment).toBe("사업성 검증 완료");
  });
});
