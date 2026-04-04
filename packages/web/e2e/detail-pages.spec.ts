/**
 * E2E: 상세 페이지(:id) 렌더링 검증
 * F302 — 파라미터 기반 상세 페이지 10건의 렌더링 + 데이터 표시 + 네비게이션 검증
 */
import { test, expect } from "./fixtures/auth";
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
    await expect(page.getByText("AI 헬스케어 플랫폼")).toBeVisible();
    await expect(page.locator('main a[href="/discovery/items"]')).toBeVisible();
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

  test("collection/sr/:id — SR 상세", async ({
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

  test("shaping/offering/:id — 오퍼링 팩 상세", async ({
    authenticatedPage: page,
  }) => {
    const pack = makeOfferingPack();
    await page.route("**/api/offering-packs/pack-1", (route) =>
      route.fulfill({ json: pack }),
    );

    await page.goto("/shaping/offering/pack-1");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("AI 헬스케어 제안 패키지")).toBeVisible();
    await expect(page.getByText("draft")).toBeVisible();
  });

  test("shaping/offering/:id/brief — 오퍼링 브리프", async ({
    authenticatedPage: page,
  }) => {
    const pack = makeOfferingPack();
    await page.route("**/api/offering-packs/pack-1", (route) =>
      route.fulfill({ json: pack }),
    );
    await page.route("**/api/offering-packs/pack-1/briefs", (route) =>
      route.fulfill({ json: { items: [] } }),
    );

    await page.goto("/shaping/offering/pack-1/brief");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("AI 헬스케어 제안 패키지")).toBeVisible();
    await expect(page.getByText("아직 생성된 브리프가 없어요.")).toBeVisible();
  });

  test("gtm/outreach/:id — 아웃리치 상세", async ({
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
});
