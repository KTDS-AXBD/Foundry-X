/**
 * E2E: Discovery Item List (F436) + Discovery Criteria Panel (F437)
 * Sprint 210 — 아이템 카드 목록 + 9기준 체크리스트 패널
 */
import { test, expect } from "./fixtures/auth";

// @service: foundry-x
// @sprint: 210
// @tagged-by: F436 F437

const MOCK_BIZ_ITEMS = {
  items: [
    {
      id: "item-1",
      title: "AI 비서 도입",
      description: "사내 업무 효율화를 위한 AI 비서 시스템",
      status: "analyzing",
      discoveryType: "I",
      createdAt: "2026-04-01T00:00:00Z",
    },
    {
      id: "item-2",
      title: "클라우드 전환",
      description: null,
      status: "draft",
      discoveryType: "T",
      createdAt: "2026-04-02T00:00:00Z",
    },
    {
      id: "item-3",
      title: "고객 데이터 플랫폼",
      description: "CDP 구축 및 분석",
      status: "analyzed",
      discoveryType: "M",
      createdAt: "2026-04-03T00:00:00Z",
    },
  ],
};

const MOCK_CRITERIA = {
  total: 9,
  completed: 3,
  inProgress: 1,
  needsRevision: 0,
  pending: 5,
  gateStatus: "blocked",
  criteria: Array.from({ length: 9 }, (_, i) => ({
    id: `c-${i + 1}`,
    bizItemId: "item-1",
    criterionId: i + 1,
    name: ["문제/고객 정의", "시장 기회", "경쟁 환경", "가치 제안 가설", "수익 구조 가설", "핵심 리스크 가정", "규제/기술 제약", "차별화 근거", "검증 실험 계획"][i],
    condition: "조건 설명",
    status: i < 3 ? "completed" : i === 3 ? "in_progress" : "pending",
    evidence: i < 3 ? "근거 데이터" : null,
    completedAt: i < 3 ? "2026-04-01T00:00:00Z" : null,
    updatedAt: "2026-04-01T00:00:00Z",
  })),
};

const MOCK_NEXT_GUIDE = {
  step: "2-3",
  description: "시장 기회 분석을 진행해주세요.",
  actions: ["시장 규모 조사", "성장률 확인"],
};

const MOCK_BIZ_ITEM_DETAIL = {
  id: "item-1",
  title: "AI 비서 도입",
  description: "사내 업무 효율화를 위한 AI 비서 시스템",
  status: "analyzing",
  discoveryType: "I",
  source: "wizard",
  classification: null,
  createdBy: "test-user-id",
  createdAt: "2026-04-01T00:00:00Z",
  updatedAt: "2026-04-01T00:00:00Z",
};

const MOCK_PROGRESS = {
  stages: [],
  currentStage: null,
  completedCount: 0,
  totalCount: 0,
};

test.describe("F436 — 내 아이템 목록", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/biz-items", (route) => {
      route.fulfill({ json: MOCK_BIZ_ITEMS });
    });
  });

  test("아이템 카드가 목록으로 표시된다", async ({ page }) => {
    await page.goto("/discovery");
    await expect(page.getByRole("heading", { name: "내 아이템" })).toBeVisible();

    // 카드 3개 모두 표시
    await expect(page.getByText("AI 비서 도입")).toBeVisible();
    await expect(page.getByText("클라우드 전환")).toBeVisible();
    await expect(page.getByText("고객 데이터 플랫폼")).toBeVisible();
  });

  test("상태 뱃지가 올바르게 표시된다", async ({ page }) => {
    await page.goto("/discovery");
    // "분석 중" 뱃지 (status: analyzing)
    await expect(page.getByText("분석 중").first()).toBeVisible();
    // "대기" 뱃지 (status: draft)
    await expect(page.getByText("대기")).toBeVisible();
  });

  test("새 아이템 버튼이 getting-started로 링크된다", async ({ page }) => {
    await page.goto("/discovery");
    const newItemLink = page.getByRole("link", { name: /새 아이템/ }).first();
    await expect(newItemLink).toHaveAttribute("href", "/getting-started");
  });

  test("상태 필터 클릭 시 해당 상태만 표시된다", async ({ page }) => {
    await page.goto("/discovery");
    // "대기" 필터 클릭
    await page.getByRole("button", { name: "대기" }).click();

    // status=draft인 "클라우드 전환"만 표시
    await expect(page.getByText("클라우드 전환")).toBeVisible();
    // analyzing, analyzed 아이템은 숨겨짐
    await expect(page.getByText("AI 비서 도입")).not.toBeVisible();
    await expect(page.getByText("고객 데이터 플랫폼")).not.toBeVisible();
  });

  test("검색어 입력 시 필터링된다", async ({ page }) => {
    await page.goto("/discovery");
    await page.getByPlaceholder("아이템 검색...").fill("클라우드");

    await expect(page.getByText("클라우드 전환")).toBeVisible();
    await expect(page.getByText("AI 비서 도입")).not.toBeVisible();
  });

  test("빈 상태 — 아이템 없을 때 등록 CTA 표시", async ({ page }) => {
    await page.route("**/api/biz-items", (route) => {
      route.fulfill({ json: { items: [] } });
    });
    await page.goto("/discovery");

    await expect(page.getByText("아직 등록된 아이템이 없어요.")).toBeVisible();
    await expect(page.getByRole("link", { name: /첫 아이템 등록하기/ })).toBeVisible();
  });

  test("카드 클릭 시 아이템 상세 페이지로 이동한다", async ({ page }) => {
    await page.route("**/api/biz-items/item-1", (route) => {
      route.fulfill({ json: MOCK_BIZ_ITEM_DETAIL });
    });
    await page.route("**/api/biz-items/item-1/discovery-progress", (route) => {
      route.fulfill({ json: MOCK_PROGRESS });
    });
    await page.route("**/api/biz-items/item-1/discovery-criteria", (route) => {
      route.fulfill({ json: MOCK_CRITERIA });
    });
    await page.route("**/api/biz-items/item-1/next-guide", (route) => {
      route.fulfill({ json: MOCK_NEXT_GUIDE });
    });
    await page.route("**/api/ax-bd/artifacts/**", (route) => {
      route.fulfill({ json: { items: [] } });
    });

    await page.goto("/discovery");
    await page.getByText("AI 비서 도입").click();
    await expect(page).toHaveURL(/\/discovery\/items\/item-1/);
  });
});

test.describe("F437 — 발굴 9기준 체크리스트 패널", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/biz-items/item-1", (route) => {
      route.fulfill({ json: MOCK_BIZ_ITEM_DETAIL });
    });
    await page.route("**/api/biz-items/item-1/discovery-progress", (route) => {
      route.fulfill({ json: MOCK_PROGRESS });
    });
    await page.route("**/api/biz-items/item-1/discovery-criteria", (route) => {
      route.fulfill({ json: MOCK_CRITERIA });
    });
    await page.route("**/api/biz-items/item-1/next-guide", (route) => {
      route.fulfill({ json: MOCK_NEXT_GUIDE });
    });
    await page.route("**/api/ax-bd/artifacts/**", (route) => {
      route.fulfill({ json: { items: [] } });
    });
  });

  test("9기준 체크리스트가 표시된다", async ({ page }) => {
    await page.goto("/discovery/items/item-1");
    await expect(page.getByText("발굴 분석 기준")).toBeVisible();
    // 9개 기준 중 첫 번째
    await expect(page.getByText("1. 문제/고객 정의")).toBeVisible();
    await expect(page.getByText("9. 검증 실험 계획")).toBeVisible();
  });

  test("완료된 기준 수와 진행률이 표시된다", async ({ page }) => {
    await page.goto("/discovery/items/item-1");
    await expect(page.getByText("3 / 9 기준 완료")).toBeVisible();
  });

  test("다음 단계 가이드가 표시된다", async ({ page }) => {
    await page.goto("/discovery/items/item-1");
    await expect(page.getByText("다음 단계")).toBeVisible();
    await expect(page.getByText("시장 기회 분석을 진행해주세요.")).toBeVisible();
  });
});
