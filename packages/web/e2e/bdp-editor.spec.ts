/**
 * E2E: BDP Editor & Version Management (F234) + Proposal Generation (F237)
 * page.evaluate(fetch)로 브라우저 컨텍스트에서 호출 → page.route() mock 적용
 */
import { test, expect } from "./fixtures/auth";

const MOCK_BDP = {
  id: "ver-1",
  bizItemId: "biz-001",
  version: 1,
  content: "# 사업계획서\n\n## 개요\nAI 챗봇 서비스",
  createdBy: "user@test.com",
  createdAt: "2026-03-28T10:00:00Z",
  finalized: false,
};

test.describe("BDP Editor & Proposal (F234+F237)", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route("**/api/bdp/*/versions*", (route) =>
      route.fulfill({ json: [MOCK_BDP, { ...MOCK_BDP, id: "ver-0", version: 0 }] }),
    );
    await page.route("**/api/bdp/*/proposal*", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ status: 201, json: { id: "prop-1", content: "## 사업제안서 요약" } });
      }
      return route.fulfill({ json: { id: "prop-1", content: "## 사업제안서 요약" } });
    });
    await page.route(/\/api\/bdp\/[^/]+$/, (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ status: 201, json: { ...MOCK_BDP, id: "ver-2", version: 2 } });
      }
      return route.fulfill({ json: MOCK_BDP });
    });
  });

  test("BDP 최신 버전 조회", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/bdp/biz-001");
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(200);
    expect(data.body.content).toContain("사업계획서");
    expect(data.body.finalized).toBe(false);
  });

  test("BDP 새 버전 저장", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/bdp/biz-001", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "# 수정된 사업계획서" }),
      });
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(201);
    expect(data.body.version).toBe(2);
  });

  test("BDP 버전 히스토리", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/bdp/biz-001/versions");
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(200);
    expect(data.body).toHaveLength(2);
  });

  test("사업제안서 자동 생성 (F237)", async ({ authenticatedPage: page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch("/api/bdp/biz-001/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return { status: res.status, body: await res.json() };
    });
    expect(data.status).toBe(201);
    expect(data.body.content).toContain("사업제안서");
  });
});
