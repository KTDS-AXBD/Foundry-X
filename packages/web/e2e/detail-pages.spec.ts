/**
 * E2E: 상세 페이지(:id) 렌더링 검증
 * F302 — 파라미터 기반 상세 페이지 10건의 렌더링 + 데이터 표시 + 네비게이션 검증
 */
import { test, expect } from "./fixtures/auth";

// @service: bd-demo
// @sprint: 187
// @tagged-by: F400
import {
  makeBizItem,
  makeIdea,
  makeBmc,
  makeBdpVersion,
  makeSrDetail,
  makeOfferingPack,
  makeOutreach,
  makeCustomer,
  makeShapingRun,
  makeArtifact,
  makeDiscoveryProgress,
} from "./fixtures/mock-factory";

test.describe("상세 페이지(:id) 렌더링 검증", () => {
  test("discovery/items/:id — 사업 아이템 상세", async ({
    authenticatedPage: page,
  }) => {
    const item = makeBizItem();
    await page.route("**/api/biz-items/biz-item-1", (route) =>
      route.fulfill({ json: item }),
    );
    await page.route("**/api/discovery/progress/biz-item-1", (route) =>
      route.fulfill({ json: makeDiscoveryProgress() }),
    );
    // ArtifactList에서 호출하는 artifacts API
    await page.route("**/api/ax-bd/artifacts*", (route) =>
      route.fulfill({ json: { items: [] } }),
    );

    await page.goto("/discovery/items/biz-item-1");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    // F496+ 재설계: 제목이 헤더와 기본정보 탭에 중복 — 헤더 heading만 검증
    await expect(
      page.getByRole("heading", { name: "AI 헬스케어 플랫폼" }),
    ).toBeVisible();
    // F496+ 재설계: back 링크가 /discovery/items → /discovery 로 변경
    await expect(page.locator('main a[href="/discovery"]')).toBeVisible();
  });

  test("ax-bd/ideas/:id — 아이디어 상세", async ({
    authenticatedPage: page,
  }) => {
    const idea = makeIdea();
    // idea-detail fetches list then finds by id
    await page.route("**/api/ax-bd/ideas*", (route) =>
      route.fulfill({ json: { items: [idea] } }),
    );

    await page.goto("/ax-bd/ideas/idea-1");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("스마트 팩토리 솔루션")).toBeVisible();
    await expect(page.getByText("AI", { exact: true })).toBeVisible();
  });

  test("ax-bd/bmc/:id — BMC 상세", async ({ authenticatedPage: page }) => {
    const bmc = makeBmc();
    // bmc-detail fetches list then finds by id
    await page.route("**/api/ax-bd/bmc*", (route) =>
      route.fulfill({ json: { items: [bmc] } }),
    );

    await page.goto("/ax-bd/bmc/bmc-1");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("스마트 팩토리 BMC")).toBeVisible();
    await expect(page.getByText("가치 제안")).toBeVisible();
  });

  test("ax-bd/bdp/:bizItemId — BDP 상세", async ({
    authenticatedPage: page,
  }) => {
    const bdp = makeBdpVersion();
    await page.route("**/api/bdp/biz-item-1", (route) =>
      route.fulfill({ json: bdp }),
    );
    await page.route("**/api/bdp/biz-item-1/review-summary", (route) =>
      route.fulfill({
        json: { total: 0, approved: 0, pending: 0, rejected: 0, revisionRequested: 0 },
      }),
    );
    await page.route("**/api/bdp/biz-item-1/reviews", (route) =>
      route.fulfill({ json: [] }),
    );

    await page.goto("/ax-bd/bdp/biz-item-1");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("main").getByRole("heading", { name: "사업제안서" }),
    ).toBeVisible();
  });

  // TODO: F434 IA 정리에서 /collection/* → /discovery 와일드카드 리다이렉트로 이전.
  // /collection/sr/:id 는 라우터에 없고 :id가 redirect에서 손실됨. SR 상세 신라우트가 없으면 영구 skip.
  test.skip("collection/sr/:id — SR 상세", async ({
    authenticatedPage: page,
  }) => {
    const sr = makeSrDetail();
    await page.route("**/api/sr/sr-1", (route) =>
      route.fulfill({ json: sr }),
    );

    await page.goto("/collection/sr/sr-1");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("시장 조사 리포트")).toBeVisible();
    await expect(page.getByText("market_research")).toBeVisible();
  });

  // 2026-04-09 API 이관: 구 /api/offering-packs/:id → 신 /api/offerings/:id (offering-pack-detail.tsx)
  test("shaping/offering/:id — 오퍼링 상세", async ({
    authenticatedPage: page,
  }) => {
    const offering = {
      id: "pack-1",
      orgId: "test-org-e2e",
      bizItemId: "biz-item-1",
      title: "AI 헬스케어 제안 패키지",
      purpose: "proposal",
      format: "html",
      status: "draft",
      currentVersion: 1,
      createdBy: "test-user-id",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    await page.route("**/api/offerings/pack-1", (route) =>
      route.fulfill({ json: offering }),
    );
    await page.route("**/api/offerings/pack-1/export*", (route) =>
      route.fulfill({ body: "<p>preview</p>", contentType: "text/html" }),
    );

    await page.goto("/shaping/offering/pack-1");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("AI 헬스케어 제안 패키지")).toBeVisible();
  });

  test("shaping/offering/:id/brief — 오퍼링 브리프", async ({
    authenticatedPage: page,
  }) => {
    const offering = {
      id: "pack-1",
      orgId: "test-org-e2e",
      bizItemId: "biz-item-1",
      title: "AI 헬스케어 제안 패키지",
      purpose: "proposal",
      format: "html",
      status: "draft",
      currentVersion: 1,
      createdBy: "test-user-id",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    // offering-brief.tsx: detail은 /offerings/:id, briefs는 여전히 /offering-packs/:id/briefs
    await page.route("**/api/offerings/pack-1", (route) =>
      route.fulfill({ json: offering }),
    );
    await page.route("**/api/offering-packs/pack-1/briefs", (route) =>
      route.fulfill({ json: { items: [] } }),
    );

    await page.goto("/shaping/offering/pack-1/brief");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("AI 헬스케어 제안 패키지")).toBeVisible();
    await expect(page.getByText("아직 생성된 브리프가 없어요.")).toBeVisible();
  });

  // TODO: F434 IA 정리에서 /gtm/* → /discovery 와일드카드 리다이렉트로 이전.
  // 신 GTM Outreach 상세 라우트 부재 → 영구 skip (라우트 부활 시 재작성).
  test.skip("gtm/outreach/:id — 아웃리치 상세", async ({
    authenticatedPage: page,
  }) => {
    const outreach = makeOutreach();
    const customer = makeCustomer();
    await page.route("**/api/gtm/outreach/outreach-1", (route) =>
      route.fulfill({ json: outreach }),
    );
    await page.route("**/api/gtm/customers/customer-1", (route) =>
      route.fulfill({ json: customer }),
    );

    await page.goto("/gtm/outreach/outreach-1");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("AI 헬스케어 제안")).toBeVisible();
    await expect(page.getByText("테스트 고객사")).toBeVisible();
  });

  test("shaping/review/:runId — 형상화 리뷰 상세", async ({
    authenticatedPage: page,
  }) => {
    const run = makeShapingRun();
    await page.route("**/api/shaping/runs/run-1", (route) =>
      route.fulfill({ json: run }),
    );

    await page.goto("/shaping/review/run-1");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("완료")).toBeVisible();
    await expect(page.getByText(/Quality:/)).toBeVisible();
  });

  test("ax-bd/artifacts/:id — 산출물 상세", async ({
    authenticatedPage: page,
  }) => {
    const artifact = makeArtifact();
    await page.route("**/api/ax-bd/artifacts/artifact-1", (route) =>
      route.fulfill({ json: artifact }),
    );
    await page.route(
      "**/api/ax-bd/artifacts/biz-item-1/feasibility-study/versions",
      (route) => route.fulfill({ json: { versions: [] } }),
    );

    await page.goto("/ax-bd/artifacts/artifact-1");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("feasibility-study")).toBeVisible();
    await expect(page.getByText("입력")).toBeVisible();
  });

  // ─── 세션 #215: 미커버 동적 라우트 4건 추가 ───

  // TODO: F434 IA 정리에서 /product/* → /discovery 와일드카드 리다이렉트로 이전.
  // 동일 컨텐츠는 /shaping/offering/:id/brief 로 이동, redirect-routes.spec.ts에서 redirect만 검증.
  test.skip("product/offering-pack/:id/brief — 오퍼링 브리프 (product 경로)", async ({
    authenticatedPage: page,
  }) => {
    await page.evaluate(() => localStorage.setItem("fx-tour-completed", "true"));
    await page.route("**/api/offering-packs/pack-1", (route) =>
      route.fulfill({
        json: {
          id: "pack-1", title: "테스트 Offering", status: "draft",
          itemCount: 2, createdAt: "2026-04-07T00:00:00Z",
        },
      }),
    );
    await page.route("**/api/offering-packs/pack-1/briefs*", (route) =>
      route.fulfill({ json: { items: [] } }),
    );

    await page.goto("/product/offering-pack/pack-1/brief");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("미팅 브리프")).toBeVisible({ timeout: 5000 });
  });

  test("prototype-dashboard/:id — 프로토타입 상세", async ({
    authenticatedPage: page,
  }) => {
    await page.evaluate(() => localStorage.setItem("fx-tour-completed", "true"));
    await page.route("**/api/prototype-jobs/job-1", (route) =>
      route.fulfill({
        json: {
          id: "job-1", orgId: "org-1", prdTitle: "AI 문서 자동화",
          status: "completed", builderType: "nextjs", pagesUrl: null,
          costUsd: 0.05, modelUsed: "claude-sonnet-4-6", fallbackUsed: false,
          retryCount: 0, qualityScore: 85, ogdRounds: 2,
          createdAt: Date.now(), updatedAt: Date.now(),
          startedAt: Date.now(), prdContent: "# PRD", buildLog: "",
          errorMessage: null, feedbackContent: null,
        },
      }),
    );
    await page.route("**/api/prototype-jobs/job-1/ogd-summary", (route) =>
      route.fulfill({ json: { summary: null } }),
    );
    await page.route("**/api/prototype-jobs/job-1/feedback*", (route) =>
      route.fulfill({ json: { items: [] } }),
    );
    await page.route("**/api/prototype-jobs/job-1/evaluations*", (route) =>
      route.fulfill({ json: { items: [] } }),
    );

    await page.goto("/prototype-dashboard/job-1");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("AI 문서 자동화")).toBeVisible();
  });

  test("shaping/offering/:id/edit — 오퍼링 편집기", async ({
    authenticatedPage: page,
  }) => {
    await page.evaluate(() => localStorage.setItem("fx-tour-completed", "true"));
    await page.route("**/api/offerings/off-1", (route) =>
      route.fulfill({
        json: {
          id: "off-1", orgId: "org-1", bizItemId: "biz-1", title: "편집 테스트 Offering",
          purpose: "proposal", format: "html", status: "draft",
          currentVersion: 1, createdBy: "user-1",
          createdAt: "2026-04-07T00:00:00Z", updatedAt: "2026-04-07T00:00:00Z",
        },
      }),
    );
    await page.route("**/api/offerings/off-1/sections*", (route) =>
      route.fulfill({ json: { sections: [] } }),
    );
    await page.route("**/api/offerings/off-1/export*", (route) =>
      route.fulfill({ body: "<p>미리보기</p>", contentType: "text/html" }),
    );

    await page.goto("/shaping/offering/off-1/edit");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("편집 테스트 Offering")).toBeVisible({ timeout: 5000 });
  });

  test("shaping/offering/:id/validate — 오퍼링 검증", async ({
    authenticatedPage: page,
  }) => {
    await page.evaluate(() => localStorage.setItem("fx-tour-completed", "true"));
    await page.route("**/api/offerings/off-1", (route) =>
      route.fulfill({
        json: {
          id: "off-1", orgId: "org-1", bizItemId: "biz-1", title: "검증 대상 Offering",
          purpose: "proposal", format: "html", status: "review",
          currentVersion: 1, createdBy: "user-1",
          createdAt: "2026-04-07T00:00:00Z", updatedAt: "2026-04-07T00:00:00Z",
        },
      }),
    );
    await page.route("**/api/offerings/off-1/validations*", (route) =>
      route.fulfill({ json: { validations: [], total: 0 } }),
    );

    await page.goto("/shaping/offering/off-1/validate");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("검증 대상 Offering")).toBeVisible({ timeout: 5000 });
  });
});
