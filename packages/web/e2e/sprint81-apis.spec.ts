/**
 * E2E: Sprint 81 APIs — Offering Pack (F236) + MVP Tracking (F238) + IR Submission (F240)
 * page.evaluate(fetch)로 브라우저 컨텍스트에서 호출 → page.route() mock 적용
 */
import { test, expect } from "./fixtures/auth";

test.describe("Offering Pack (F236)", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route(/\/api\/offering-pack\/[^/]+$/, (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          json: { id: "op-1", bizItemId: "biz-001", title: "AI 챗봇 서비스 제안", components: ["proposal", "demo", "pricing"], createdAt: new Date().toISOString() },
        });
      }
      return route.fulfill({
        json: { id: "op-1", bizItemId: "biz-001", title: "AI 챗봇 서비스 제안", components: ["proposal", "demo", "pricing"] },
      });
    });
  });

  test("Offering Pack 생성", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/offering-pack/biz-001", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "AI 챗봇 서비스 제안", components: ["proposal", "demo", "pricing"] }),
      });
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(201);
    expect(data.body.title).toBe("AI 챗봇 서비스 제안");
    expect(data.body.components).toHaveLength(3);
  });

  test("Offering Pack 조회", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/offering-pack/biz-001");
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(200);
    expect(data.body.components).toContain("proposal");
  });
});

test.describe("MVP Tracking (F238)", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route("**/api/mvp-tracking/*/status*", (route) =>
      route.fulfill({ json: { id: "mvp-1", status: "IN_DEV", updatedAt: new Date().toISOString() } }),
    );
    await page.route(/\/api\/mvp-tracking\/[^/]+$/, (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ status: 201, json: { id: "mvp-1", bizItemId: "biz-001", status: "PLANNED" } });
      }
      return route.fulfill({ json: { id: "mvp-1", bizItemId: "biz-001", status: "PLANNED" } });
    });
  });

  test("MVP 추적 시작", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/mvp-tracking/biz-001", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(201);
    expect(data.body.status).toBe("PLANNED");
  });

  test("MVP 상태 조회", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/mvp-tracking/biz-001");
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(200);
    expect(data.body.bizItemId).toBe("biz-001");
  });

  test("MVP 상태 전환 — IN_DEV", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/mvp-tracking/mvp-1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_DEV" }),
      });
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(200);
    expect(data.body.status).toBe("IN_DEV");
  });
});

test.describe("IR Bottom-up Submission (F240)", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route("**/api/ir-submission*", (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        if (body?.sourceType === "INVALID_TYPE") {
          return route.fulfill({ status: 400, json: { error: "Invalid sourceType" } });
        }
        return route.fulfill({
          status: 201,
          json: { id: "ir-1", title: body?.title, sourceType: body?.sourceType, status: "PENDING", createdAt: new Date().toISOString() },
        });
      }
      return route.fulfill({
        json: [{ id: "ir-1", title: "보고서 자동화", sourceType: "FIELD_ENGINEER", status: "PENDING" }],
      });
    });
  });

  test("현장 제안 등록", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/ir-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "보고서 자동화", description: "A사 요청", sourceType: "FIELD_ENGINEER" }),
      });
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(201);
    expect(data.body.sourceType).toBe("FIELD_ENGINEER");
    expect(data.body.status).toBe("PENDING");
  });

  test("현장 제안 목록 조회", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/ir-submission");
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(200);
    expect(data.body).toHaveLength(1);
    expect(data.body[0].title).toBe("보고서 자동화");
  });

  test("잘못된 sourceType → 400", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/ir-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "테스트", description: "테스트", sourceType: "INVALID_TYPE" }),
      });
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(400);
  });
});
