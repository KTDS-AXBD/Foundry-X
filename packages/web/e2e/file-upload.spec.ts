/**
 * E2E: F492 — FileUploadZone API 경로 회귀 방지
 * BASE_URL 통일 수정 후 PDF/PPTX/DOCX 업로드 성공 + PNG 거부 검증
 *
 * @service: foundry-x
 * @sprint: 241
 * @tagged-by: F492
 */
import { test, expect } from "./fixtures/auth";

const MOCK_BIZ_ITEM = {
  id: "biz-f492",
  title: "F492 업로드 테스트 아이템",
  description: "FileUploadZone API 경로 drift 수정 회귀 테스트",
  discoveryType: "I",
  status: "analyzed",
  source: "wizard",
  orgId: "test-org-e2e",
  authorId: "test-user-id",
  classification: null,
  createdBy: "test-user-id",
  createdAt: "2026-04-09T00:00:00Z",
  updatedAt: "2026-04-09T00:00:00Z",
};

const MOCK_PRESIGN = {
  presigned_url: "https://r2.mock.dev/upload/f492-test",
  file_id: "file-f492-1",
};

async function setupBaseMocks(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    localStorage.setItem("fx-discovery-tour-completed", "true");
    localStorage.setItem("fx-tour-completed", "true");
  });

  await page.route("**/api/biz-items/biz-f492", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: MOCK_BIZ_ITEM });
    return route.continue();
  });
  await page.route("**/api/biz-items", (route) =>
    route.fulfill({ json: { items: [MOCK_BIZ_ITEM], total: 1, page: 1, limit: 20 } }),
  );
  await page.route("**/api/biz-items/biz-f492/shaping-artifacts", (route) =>
    route.fulfill({ json: { businessPlan: null, offering: null, prd: null, prototype: null } }),
  );
  await page.route("**/api/biz-items/biz-f492/discovery-criteria", (route) =>
    route.fulfill({ json: { total: 9, completed: 3, gateStatus: "warning", criteria: [] } }),
  );
  await page.route("**/api/biz-items/biz-f492/next-guide", (route) =>
    route.fulfill({ json: { step: "2-3", description: "mock" } }),
  );
  await page.route("**/api/biz-items/biz-f492/discovery-progress", (route) =>
    route.fulfill({ json: { stages: [], currentStage: null, completedCount: 0, totalCount: 0 } }),
  );
  await page.route("**/api/bdp/biz-f492", (route) =>
    route.fulfill({ json: { error: "not found" }, status: 404 }),
  );
  await page.route("**/api/pipeline/items/biz-f492", (route) =>
    route.fulfill({ json: { id: "pipe-f492", title: "F492 업로드 테스트 아이템", currentStage: "DISCOVERY", stageEnteredAt: "2026-04-09T00:00:00Z", stageHistory: [] } }),
  );
  await page.route("**/api/help-agent/**", (route) =>
    route.fulfill({ json: { content: "mock" } }),
  );
  await page.route(/\/api\/files(\?|$)/, (route) =>
    route.fulfill({ json: { files: [] } }),
  );
}

async function setupUploadMocks(page: import("@playwright/test").Page) {
  await page.route("**/api/files/presign", (route) => {
    if (route.request().method() === "POST") return route.fulfill({ json: MOCK_PRESIGN });
    return route.continue();
  });
  await page.route("https://r2.mock.dev/**", (route) =>
    route.fulfill({ status: 200, body: "" }),
  );
  await page.route("**/api/files/confirm", (route) =>
    route.fulfill({ json: { success: true } }),
  );
  await page.route("**/api/files/file-f492-1/parse", (route) =>
    route.fulfill({ json: { success: true } }),
  );
}

async function openUploadZone(page: import("@playwright/test").Page) {
  await page.goto("/discovery/items/biz-f492");
  await expect(page.getByText("F492 업로드 테스트 아이템").first()).toBeVisible({ timeout: 10000 });
  await page.getByRole("tab", { name: "첨부 자료" }).click();
  await page.getByRole("button", { name: /파일 업로드/ }).click();
  await expect(page.getByTestId("file-upload-zone")).toBeVisible({ timeout: 3000 });
}

test.describe("F492 — FileUploadZone BASE_URL 통일 회귀 방지", () => {
  test("PDF 파일 업로드 → presign API 호출 성공", async ({ authenticatedPage: page }) => {
    await setupBaseMocks(page);
    await setupUploadMocks(page);

    let presignBody: Record<string, unknown> | null = null;
    await page.route("**/api/files/presign", async (route) => {
      if (route.request().method() === "POST") {
        presignBody = await route.request().postDataJSON() as Record<string, unknown>;
        return route.fulfill({ json: MOCK_PRESIGN });
      }
      return route.continue();
    });

    await openUploadZone(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: "사업계획서.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("fake pdf content"),
    });

    await page.waitForResponse(
      (res) => res.url().includes("/api/files/presign") && res.ok(),
      { timeout: 10000 },
    );

    expect(presignBody).not.toBeNull();
    expect((presignBody as Record<string, unknown>)["mime_type"]).toBe("application/pdf");

    await expect(page.getByText(/업로드 중|텍스트 추출|업로드 완료/)).toBeVisible({ timeout: 10000 });
  });

  test("PPTX 파일 업로드 → presign API 호출 성공", async ({ authenticatedPage: page }) => {
    await setupBaseMocks(page);
    await setupUploadMocks(page);

    let presignBody: Record<string, unknown> | null = null;
    await page.route("**/api/files/presign", async (route) => {
      if (route.request().method() === "POST") {
        presignBody = await route.request().postDataJSON() as Record<string, unknown>;
        return route.fulfill({ json: MOCK_PRESIGN });
      }
      return route.continue();
    });

    await openUploadZone(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: "발표자료.pptx",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      buffer: Buffer.from("fake pptx content"),
    });

    await page.waitForResponse(
      (res) => res.url().includes("/api/files/presign") && res.ok(),
      { timeout: 10000 },
    );

    expect(presignBody).not.toBeNull();
    expect((presignBody as Record<string, unknown>)["mime_type"]).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );

    await expect(page.getByText(/업로드 중|텍스트 추출|업로드 완료/)).toBeVisible({ timeout: 10000 });
  });

  test("DOCX 파일 업로드 → presign API 호출 성공", async ({ authenticatedPage: page }) => {
    await setupBaseMocks(page);
    await setupUploadMocks(page);

    let presignBody: Record<string, unknown> | null = null;
    await page.route("**/api/files/presign", async (route) => {
      if (route.request().method() === "POST") {
        presignBody = await route.request().postDataJSON() as Record<string, unknown>;
        return route.fulfill({ json: MOCK_PRESIGN });
      }
      return route.continue();
    });

    await openUploadZone(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: "보고서.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: Buffer.from("fake docx content"),
    });

    await page.waitForResponse(
      (res) => res.url().includes("/api/files/presign") && res.ok(),
      { timeout: 10000 },
    );

    expect(presignBody).not.toBeNull();
    expect((presignBody as Record<string, unknown>)["mime_type"]).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );

    await expect(page.getByText(/업로드 중|텍스트 추출|업로드 완료/)).toBeVisible({ timeout: 10000 });
  });

  test("PNG 파일 업로드 시도 → 지원 안 되는 형식 에러 표시 (presign API 미호출)", async ({ authenticatedPage: page }) => {
    await setupBaseMocks(page);

    let presignCalled = false;
    await page.route("**/api/files/presign", (route) => {
      presignCalled = true;
      return route.continue();
    });

    await openUploadZone(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: "screenshot.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake png content"),
    });

    // 에러 메시지 표시
    await expect(page.getByText("PDF, PPTX, DOCX 파일만 업로드할 수 있어요")).toBeVisible({ timeout: 5000 });

    // presign API 미호출 확인 (클라이언트 사이드 유효성 검사)
    expect(presignCalled).toBe(false);

    // "다시 시도" 버튼
    await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
  });
});
