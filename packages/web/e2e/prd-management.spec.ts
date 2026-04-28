/**
 * E2E: PRD 관리 (F454/F455) — /discovery/items/:bizItemId/prds
 * 사업기획서 기반 PRD 자동 생성 + 버전 관리 회귀 방지
 */
import { test, expect } from "./fixtures/auth";

// @service: foundry-x
// @sprint: 220
// @tagged-by: F454 F455

const MOCK_BIZ_ITEM = {
  id: "biz-1",
  title: "AI 비서 도입",
  description: "사내 업무 효율화",
  status: "analyzed",
  discoveryType: "I",
  source: "wizard",
  classification: null,
  createdBy: "test-user-id",
  createdAt: "2026-04-01T00:00:00Z",
  updatedAt: "2026-04-01T00:00:00Z",
};

const MOCK_PRDS_EMPTY = { prds: [] };

const MOCK_PRDS_TWO_VERSIONS = {
  prds: [
    {
      id: "prd-2",
      biz_item_id: "biz-1",
      version: 2,
      status: "reviewing",
      content: "# PRD v2\n\n인터뷰 반영본",
      contentPreview: "PRD v2",
      criteria_snapshot: null,
      generated_at: 1714000000000,
    },
    {
      id: "prd-1",
      biz_item_id: "biz-1",
      version: 1,
      status: "draft",
      content: "# PRD v1\n\n초안",
      contentPreview: "PRD v1",
      criteria_snapshot: null,
      generated_at: 1713000000000,
    },
  ],
};

test.describe("F454/F455 — PRD 관리 페이지", () => {
  test("PRD 목록이 비어있을 때 — 분석 완료 상태면 'PRD 생성하기' 버튼 표시", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/biz-items/biz-1", (route) =>
      route.fulfill({ json: MOCK_BIZ_ITEM }),
    );
    await page.route("**/api/biz-items/biz-1/prds", (route) =>
      route.fulfill({ json: MOCK_PRDS_EMPTY }),
    );

    await page.goto("/discovery/items/biz-1/prds");

    await expect(
      page.getByRole("heading", { name: "PRD 버전 관리" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("아직 생성된 PRD가 없어요")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "PRD 생성하기" }),
    ).toBeVisible();
  });

  test("PRD 목록이 비어있을 때 — draft 상태면 '분석 시작하기' CTA 표시", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/biz-items/biz-1", (route) =>
      route.fulfill({ json: { ...MOCK_BIZ_ITEM, status: "draft" } }),
    );
    await page.route("**/api/biz-items/biz-1/prds", (route) =>
      route.fulfill({ json: MOCK_PRDS_EMPTY }),
    );

    await page.goto("/discovery/items/biz-1/prds");

    await expect(page.getByText("아직 생성된 PRD가 없어요")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("link", { name: /분석 시작하기/ })).toBeVisible();
  });

  test("PRD 2개 버전 존재 시 — 버전 목록 + '버전 비교' 버튼 표시", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/biz-items/biz-1", (route) =>
      route.fulfill({ json: MOCK_BIZ_ITEM }),
    );
    await page.route("**/api/biz-items/biz-1/prds", (route) =>
      route.fulfill({ json: MOCK_PRDS_TWO_VERSIONS }),
    );

    await page.goto("/discovery/items/biz-1/prds");

    await expect(
      page.getByRole("heading", { name: "PRD 버전 관리" }),
    ).toBeVisible({ timeout: 10000 });
    // 버전 비교 버튼 (2+ 버전 시)
    await expect(page.getByRole("button", { name: "버전 비교" })).toBeVisible();
  });

  test("PRD 생성 실패 시 에러 메시지 표시", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/biz-items/biz-1", (route) =>
      route.fulfill({ json: MOCK_BIZ_ITEM }),
    );
    await page.route("**/api/biz-items/biz-1/prds", (route) =>
      route.fulfill({ json: MOCK_PRDS_EMPTY }),
    );
    await page.route("**/api/biz-items/biz-1/generate-prd", (route) =>
      route.fulfill({
        status: 500,
        json: { error: "BP가 없어요", errorCode: "PRD_001" },
      }),
    );

    await page.goto("/discovery/items/biz-1/prds");
    await page.getByRole("button", { name: "PRD 생성하기" }).click();

    await expect(page.getByText(/PRD 생성 실패/)).toBeVisible({ timeout: 5000 });
  });
});
