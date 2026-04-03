/**
 * E2E: BD 데모 워크쓰루 — F281 시드 데이터 기반 6단계 네비게이션
 * API mock 기반 — API 서버 없이 동작
 */
import { test, expect } from "./fixtures/auth";

const SEED_IDEAS = [
  {
    id: "biz-health",
    title: "헬스케어 AI 진단 보조",
    description: "AI 기반 의료 영상 분석 진단 보조 시스템",
    tags: ["AI", "헬스케어"],
    syncStatus: "synced" as const,
    createdAt: 1711929600,
    updatedAt: 1711929600,
    gitRef: "",
    authorId: "user-demo",
    orgId: "org-demo",
  },
  {
    id: "biz-givc",
    title: "GIVC 플랫폼",
    description: "그린 인텔리전트 차량 커넥티드 플랫폼",
    tags: ["IoT", "모빌리티"],
    syncStatus: "synced" as const,
    createdAt: 1711929600,
    updatedAt: 1711929600,
    gitRef: "",
    authorId: "user-demo",
    orgId: "org-demo",
  },
];

const SEED_ARTIFACTS = [
  {
    id: "art-h1",
    bizItemId: "biz-health",
    skillId: "ai-biz:market-scan",
    stageId: "2-1",
    version: 1,
    outputText: "## 시장 조사 결과\n\n### 시장 규모\n- 글로벌 헬스케어 AI 시장: **187억 달러**",
    status: "completed",
    tokensUsed: 500,
    durationMs: 3000,
    createdAt: "2026-03-15T10:00:00Z",
  },
];

test.describe("BD 데모 워크쓰루", () => {
  test("데모 시나리오 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.goto("/ax-bd/demo-scenario");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("발굴 프로세스")).toBeVisible();
    await expect(page.getByText("TEAM DEMO SCENARIO")).toBeVisible();
  });

  test("아이디어 목록 — 시드 데이터 표시", async ({ authenticatedPage: page }) => {
    await page.route("**/api/ax-bd/ideas*", (route) =>
      route.fulfill({
        json: { items: SEED_IDEAS, total: 2, page: 1, limit: 20 },
      }),
    );

    await page.goto("/ax-bd/ideas");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("헬스케어 AI 진단 보조")).toBeVisible();
    await expect(page.getByText("GIVC 플랫폼")).toBeVisible();
  });

  test("산출물 목록 — 시드 산출물 표시", async ({ authenticatedPage: page }) => {
    await page.route("**/api/ax-bd/artifacts*", (route) =>
      route.fulfill({
        json: { items: SEED_ARTIFACTS, total: 1 },
      }),
    );

    await page.goto("/ax-bd/artifacts");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("산출물 상세 — Markdown 렌더링 확인", async ({ authenticatedPage: page }) => {
    const artifact = {
      ...SEED_ARTIFACTS[0],
      inputText: "헬스케어 AI 시장 조사",
      model: "claude-haiku-4-5-20250714",
      orgId: "org-demo",
      createdBy: "user-demo",
    };

    await page.route("**/api/ax-bd/artifacts/art-h1", (route) =>
      route.fulfill({ json: artifact }),
    );
    await page.route("**/api/ax-bd/artifacts/biz-health/*/versions*", (route) =>
      route.fulfill({
        json: { versions: [{ id: "art-h1", version: 1, status: "completed", createdAt: "2026-03-15T10:00:00Z" }], total: 1 },
      }),
    );

    await page.goto("/ax-bd/artifacts/art-h1");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    // Markdown이 렌더링되면 h2 태그가 생성됨
    await expect(page.locator("h2").filter({ hasText: "시장 조사 결과" })).toBeVisible({ timeout: 10000 });
  });

  test("발굴 대시보드 — 탭 네비게이션", async ({ authenticatedPage: page }) => {
    await page.route("**/api/ax-bd/progress*", (route) =>
      route.fulfill({ json: { items: [], summary: { total: 0, green: 0, yellow: 0, red: 0 } } }),
    );

    await page.goto("/ax-bd/discover-dashboard");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("발굴 대시보드")).toBeVisible();
  });

  test("진행 추적 — empty state 표시", async ({ authenticatedPage: page }) => {
    await page.route("**/api/ax-bd/progress*", (route) =>
      route.fulfill({ json: { items: [], summary: { total: 0, green: 0, yellow: 0, red: 0 } } }),
    );

    await page.goto("/ax-bd/progress");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("파이프라인에 등록된 아이템이 없어요")).toBeVisible();
  });
});
