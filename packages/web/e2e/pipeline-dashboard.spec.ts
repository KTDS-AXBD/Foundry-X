/**
 * E2E: Pipeline Dashboard (F232) — 칸반/파이프라인 뷰 전환 + 아이템 표시
 */
import { test, expect } from "./fixtures/auth";

const MOCK_KANBAN = [
  {
    stage: "REGISTERED",
    count: 2,
    items: [
      { id: "item-1", title: "AI 챗봇 PoC", description: "고객센터 자동화", currentStage: "REGISTERED", stageEnteredAt: "2026-03-25T00:00:00Z", createdBy: "user1", createdAt: "2026-03-20T00:00:00Z" },
      { id: "item-2", title: "문서 요약 서비스", description: null, currentStage: "REGISTERED", stageEnteredAt: "2026-03-28T00:00:00Z", createdBy: "user2", createdAt: "2026-03-28T00:00:00Z" },
    ],
  },
  {
    stage: "DISCOVERY",
    count: 1,
    items: [
      { id: "item-3", title: "RPA 자동화", description: "반복 업무 자동화", currentStage: "DISCOVERY", stageEnteredAt: "2026-03-22T00:00:00Z", createdBy: "user1", createdAt: "2026-03-15T00:00:00Z" },
    ],
  },
  { stage: "FORMALIZATION", count: 0, items: [] },
  { stage: "REVIEW", count: 0, items: [] },
  { stage: "DECISION", count: 0, items: [] },
  { stage: "OFFERING", count: 0, items: [] },
  { stage: "MVP", count: 0, items: [] },
];

const MOCK_STATS = {
  totalItems: 3,
  byStage: { REGISTERED: 2, DISCOVERY: 1, FORMALIZATION: 0, REVIEW: 0, DECISION: 0, OFFERING: 0, MVP: 0 },
  avgDaysInStage: { REGISTERED: 3, DISCOVERY: 8, FORMALIZATION: 0, REVIEW: 0, DECISION: 0, OFFERING: 0, MVP: 0 },
};

test.describe("Pipeline Dashboard (F232)", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route("**/api/pipeline/kanban*", (route) =>
      route.fulfill({ json: MOCK_KANBAN }),
    );
    await page.route("**/api/pipeline/stats*", (route) =>
      route.fulfill({ json: MOCK_STATS }),
    );
  });

  test("파이프라인 페이지 렌더링 + 칸반 기본 뷰", async ({ authenticatedPage: page }) => {
    await page.goto("/validation/pipeline");

    // 제목 확인
    await expect(page.getByRole("heading", { name: "BD 파이프라인" })).toBeVisible();
    await expect(page.getByText("사업 아이템 파이프라인 현황")).toBeVisible();

    // 칸반 뷰가 기본 선택
    await expect(page.getByRole("button", { name: /칸반/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /파이프라인/ })).toBeVisible();

    // 칸반 카드 렌더링 확인
    await expect(page.getByText("AI 챗봇 PoC")).toBeVisible();
    await expect(page.getByText("RPA 자동화")).toBeVisible();
  });

  test("파이프라인 뷰 전환", async ({ authenticatedPage: page }) => {
    await page.goto("/validation/pipeline");

    // 칸반 로딩 완료 대기
    await expect(page.getByRole("heading", { name: "BD 파이프라인" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("AI 챗봇 PoC")).toBeVisible({ timeout: 10000 });

    // 파이프라인 뷰로 전환
    await page.getByRole("button", { name: /파이프라인/ }).click();

    // 통계 뷰의 요소 확인
    await expect(page.getByText("전체 아이템: 3개")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("등록")).toBeVisible();
  });

  test("칸반 스테이지 컬럼 7개 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/validation/pipeline");

    // 7개 스테이지 레이블 확인
    for (const label of ["등록", "발굴", "형상화", "리뷰", "의사결정", "Offering", "MVP"]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test("빈 스테이지에 항목 없음 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/validation/pipeline");

    // 칸반 로딩 완료 대기 (아이템이 있는 카드가 먼저 렌더링)
    await expect(page.getByText("AI 챗봇 PoC")).toBeVisible({ timeout: 10000 });

    // 빈 컬럼에 "항목 없음" 텍스트
    const emptyLabels = page.getByText("항목 없음");
    expect(await emptyLabels.count()).toBeGreaterThanOrEqual(1);
  });
});
