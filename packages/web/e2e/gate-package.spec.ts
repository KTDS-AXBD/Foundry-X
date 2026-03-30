/**
 * E2E: Gate Package (F235) — ORB/PRB 게이트 문서 패키지
 * page.evaluate(fetch)로 브라우저 컨텍스트에서 호출 → page.route() mock 적용
 */
import { test, expect } from "./fixtures/auth";

const MOCK_PKG = {
  id: "gate-1",
  bizItemId: "biz-001",
  gateType: "ORB",
  status: "DRAFT",
  artifacts: ["BDP", "BMC", "PRD_REVIEW"],
  createdBy: "user@test.com",
  createdAt: "2026-03-28T10:00:00Z",
};

test.describe("Gate Package (F235)", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route("**/api/gate-package/*/download*", (route) =>
      route.fulfill({ json: { url: "https://cdn.example.com/gate.zip", expiresAt: "2026-03-28T12:00:00Z" } }),
    );
    await page.route("**/api/gate-package/*/status*", (route) =>
      route.fulfill({ json: { ...MOCK_PKG, status: "SUBMITTED" } }),
    );
    await page.route(/\/api\/gate-package\/[^/]+$/, (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ status: 201, json: MOCK_PKG });
      }
      return route.fulfill({ json: MOCK_PKG });
    });
  });

  test("게이트 패키지 생성 — ORB", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/gate-package/biz-001", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateType: "ORB" }),
      });
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(201);
    expect(data.body.gateType).toBe("ORB");
    expect(data.body.artifacts).toContain("BDP");
  });

  test("게이트 패키지 조회", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/gate-package/biz-001");
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(200);
    expect(data.body.status).toBe("DRAFT");
  });

  test("게이트 패키지 다운로드 메타", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/gate-package/biz-001/download");
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(200);
    expect(data.body.url).toContain("zip");
  });

  test("게이트 상태 변경 — SUBMITTED", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/gate-package/biz-001/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "submitted" }),
      });
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(200);
    expect(data.body.status).toBe("SUBMITTED");
  });
});
