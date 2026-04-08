/**
 * E2E: 파일 업로드 — F441 FileUploadZone + F443 AttachedFilesPanel
 * 시나리오: 첨부 자료 탭 → 업로드 존 표시 → 파일 업로드 → 파싱 → 목록 표시 → 삭제
 *
 * @service: foundry-x
 * @sprint: 213-214
 * @tagged-by: F441 F443
 */
import { test, expect } from "./fixtures/auth";

const MOCK_BIZ_ITEM = {
  id: "biz-1",
  title: "AI 문서 자동화",
  description: "문서 자동 분류 및 요약 서비스",
  discoveryType: "I",
  status: "analyzed",
  source: "wizard",
  orgId: "test-org-e2e",
  authorId: "test-user-id",
  classification: null,
  createdBy: "test-user-id",
  createdAt: "2026-03-20T00:00:00Z",
  updatedAt: "2026-03-30T00:00:00Z",
};

const MOCK_FILES_EMPTY: { files: unknown[] } = { files: [] };

const MOCK_FILES_WITH_ITEMS = {
  files: [
    {
      id: "file-1",
      filename: "사업계획서_v3.pdf",
      mime_type: "application/pdf",
      status: "parsed",
      size_bytes: 2_450_000,
      page_count: 15,
      biz_item_id: "biz-1",
      created_at: "2026-04-07T00:00:00Z",
    },
    {
      id: "file-2",
      filename: "시장조사_보고서.docx",
      mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      status: "parsing",
      size_bytes: 1_200_000,
      page_count: null,
      biz_item_id: "biz-1",
      created_at: "2026-04-07T01:00:00Z",
    },
  ],
};

const MOCK_PRESIGN_RESPONSE = {
  presigned_url: "https://r2.mock.dev/upload/test-file",
  file_id: "file-new-1",
};

async function setupFileMocks(page: import("@playwright/test").Page, withFiles = false) {
  await Promise.all([
    page.evaluate(() => {
      localStorage.setItem("fx-discovery-tour-completed", "true");
      localStorage.setItem("fx-tour-completed", "true");
    }),
    page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = "[aria-label='피드백 보내기'] { display: none !important; }";
      document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
    }),
    page.route("**/api/biz-items/biz-1", (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: MOCK_BIZ_ITEM });
      return route.continue();
    }),
    page.route("**/api/biz-items", (route) => {
      if (route.request().method() === "GET")
        return route.fulfill({ json: { items: [MOCK_BIZ_ITEM], total: 1, page: 1, limit: 20 } });
      return route.continue();
    }),
    page.route("**/api/biz-items/biz-1/shaping-artifacts", (route) =>
      route.fulfill({ json: { businessPlan: null, offering: null, prd: null, prototype: null } }),
    ),
    page.route("**/api/biz-items/biz-1/discovery-criteria", (route) =>
      route.fulfill({ json: { total: 9, completed: 3, gateStatus: "warning", criteria: [] } }),
    ),
    page.route("**/api/biz-items/biz-1/next-guide", (route) =>
      route.fulfill({ json: { step: "2-3", description: "mock" } }),
    ),
    page.route("**/api/biz-items/biz-1/discovery-progress", (route) =>
      route.fulfill({ json: { stages: [], currentStage: null, completedCount: 0, totalCount: 0 } }),
    ),
    page.route("**/api/bdp/biz-1", (route) =>
      route.fulfill({ json: { error: "not found" }, status: 404 }),
    ),
    page.route("**/api/pipeline/items/biz-1", (route) =>
      route.fulfill({ json: { id: "pipe-1", title: "AI 문서 자동화", currentStage: "DISCOVERY", stageEnteredAt: "2026-03-20T00:00:00Z", stageHistory: [] } }),
    ),
    page.route("**/api/help-agent/**", (route) =>
      route.fulfill({ json: { content: "mock" } }),
    ),
    // 파일 목록 API — withFiles에 따라 빈 목록 또는 파일 목록 반환
    page.route(/\/api\/files(\?|$)/, (route) =>
      route.fulfill({ json: withFiles ? MOCK_FILES_WITH_ITEMS : MOCK_FILES_EMPTY }),
    ),
  ]);
}

test.describe("F443 — 첨부 자료 패널 기본 표시", () => {
  test("첨부 자료 탭 → 빈 상태 표시 + 파일 업로드 버튼", async ({ authenticatedPage: page }) => {
    await setupFileMocks(page, false);
    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });

    // 첨부 자료 탭 클릭
    await page.getByRole("tab", { name: "첨부 자료" }).click();

    // 빈 상태 메시지
    await expect(page.getByText("첨부된 자료가 없어요")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("파일을 업로드하면 AI가 발굴 분석에 활용해요")).toBeVisible();

    // 업로드 버튼
    await expect(page.getByRole("button", { name: /파일 업로드/ })).toBeVisible();
  });

  test("파일 있는 경우 → 목록 + 뱃지 + 삭제 버튼 표시", async ({ authenticatedPage: page }) => {
    await setupFileMocks(page, true);
    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });

    await page.getByRole("tab", { name: "첨부 자료" }).click();

    // 파일명 표시
    await expect(page.getByText("사업계획서_v3.pdf")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("시장조사_보고서.docx")).toBeVisible();

    // 상태 뱃지
    await expect(page.getByText("파싱 완료").first()).toBeVisible();
    await expect(page.getByText("파싱 중")).toBeVisible();

    // 페이지 수 (파싱 완료된 파일)
    await expect(page.getByText("15페이지")).toBeVisible();

    // 삭제 버튼
    await expect(page.getByRole("button", { name: "사업계획서_v3.pdf 삭제" })).toBeVisible();

    // 총 건수
    await expect(page.getByText(/총 2개/)).toBeVisible();
    await expect(page.getByText(/파싱 완료 1개/)).toBeVisible();
  });

  test("파일 삭제 버튼 클릭 → 목록에서 제거", async ({ authenticatedPage: page }) => {
    await setupFileMocks(page, true);

    // 삭제 API
    await page.route("**/api/files/file-1", (route) => {
      if (route.request().method() === "DELETE") return route.fulfill({ status: 200, json: {} });
      return route.continue();
    });

    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: "첨부 자료" }).click();
    await expect(page.getByText("사업계획서_v3.pdf")).toBeVisible({ timeout: 5000 });

    // 삭제 클릭
    await page.getByRole("button", { name: "사업계획서_v3.pdf 삭제" }).click();

    // 삭제 후 목록에서 제거됨
    await expect(page.getByText("사업계획서_v3.pdf")).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe("F441 — 파일 업로드 존", () => {
  test("+ 파일 추가 클릭 → FileUploadZone 표시 + 안내 텍스트", async ({ authenticatedPage: page }) => {
    await setupFileMocks(page, false);
    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: "첨부 자료" }).click();
    await expect(page.getByText("첨부된 자료가 없어요")).toBeVisible({ timeout: 5000 });

    // 빈 상태의 "파일 업로드" 버튼
    await page.getByRole("button", { name: /파일 업로드/ }).click();

    // FileUploadZone 표시
    const uploadZone = page.getByTestId("file-upload-zone");
    await expect(uploadZone).toBeVisible({ timeout: 3000 });

    // 안내 텍스트
    await expect(page.getByText("PDF, PPTX, DOCX 파일을 드래그하거나 클릭해서 업로드하세요")).toBeVisible();
    await expect(page.getByText("최대 50MB")).toBeVisible();
  });

  test("파일 선택 → presign API 호출 + 업로드 상태 전환", async ({ authenticatedPage: page }) => {
    await setupFileMocks(page, false);

    // Presign API — 호출 여부 추적
    let presignCalled = false;
    await page.route("**/api/files/presign", (route) => {
      if (route.request().method() === "POST") {
        presignCalled = true;
        return route.fulfill({ json: MOCK_PRESIGN_RESPONSE });
      }
      return route.continue();
    });

    // R2 PUT — 업로드 성공 응답 (XHR progress 이벤트 없이 즉시 완료)
    await page.route("https://r2.mock.dev/**", (route) =>
      route.fulfill({ status: 200, body: "" }),
    );

    // Confirm + Parse
    await page.route("**/api/files/confirm", (route) =>
      route.fulfill({ json: { success: true } }),
    );
    await page.route("**/api/files/file-new-1/parse", (route) =>
      route.fulfill({ json: { success: true } }),
    );

    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: "첨부 자료" }).click();

    // 빈 상태에서 업로드 버튼
    await page.getByRole("button", { name: /파일 업로드/ }).click();
    const uploadZone = page.getByTestId("file-upload-zone");
    await expect(uploadZone).toBeVisible({ timeout: 3000 });

    // 파일 input에 파일 설정 (hidden input — FileUploadZone 내부)
    const fileInput = uploadZone.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "테스트_기획서.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("fake pdf content"),
    });

    // presign API 호출 확인 — 파일 선택 후 업로드 프로세스 시작
    await page.waitForResponse(
      (res) => res.url().includes("/api/files/presign") && res.ok(),
      { timeout: 10000 },
    );
    expect(presignCalled).toBe(true);

    // 업로드 진행 중 또는 완료 상태 — idle이 아님을 확인
    // (XHR mock 응답 타이밍에 따라 "업로드 중" 또는 "업로드 완료" 중 하나)
    await expect(page.getByText(/업로드 중|텍스트 추출|업로드 완료/)).toBeVisible({ timeout: 10000 });
  });

  test("지원하지 않는 파일 형식 → 에러 표시 + 다시 시도 버튼", async ({ authenticatedPage: page }) => {
    await setupFileMocks(page, true);
    await page.goto("/discovery/items/biz-1");
    await expect(page.getByText("AI 문서 자동화").first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: "첨부 자료" }).click();

    // "+ 파일 추가" 버튼으로 업로드 존 열기
    await page.getByRole("button", { name: /파일 추가/ }).click();
    const uploadZone = page.getByTestId("file-upload-zone");
    await expect(uploadZone).toBeVisible({ timeout: 3000 });

    // 지원하지 않는 형식 업로드
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "image.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake png"),
    });

    // 에러 메시지
    await expect(page.getByText("PDF, PPTX, DOCX 파일만 업로드할 수 있어요")).toBeVisible({ timeout: 5000 });

    // "다시 시도" 버튼
    await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
  });
});
