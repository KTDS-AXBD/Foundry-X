import { test, expect } from "./fixtures/auth";

// @service: portal
// @sprint: 187
// @tagged-by: F400

test.describe("MCP Server Management (F61/F63)", () => {
  test("workspace MCP 탭에서 서버 등록 폼 표시", async ({ authenticatedPage: page }) => {
    // Mock MCP servers API (empty list)
    await page.route("**/api/mcp/servers", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          body: JSON.stringify([]),
          headers: { "Content-Type": "application/json" },
        });
      }
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: "new-server-1",
            name: "Test MCP",
            serverUrl: "https://mcp.test/sse",
            transportType: "sse",
            status: "inactive",
            lastConnectedAt: null,
            errorMessage: null,
            toolCount: 0,
            createdAt: new Date().toISOString(),
          }),
          headers: { "Content-Type": "application/json" },
        });
      }
      return route.continue();
    });

    await page.goto("/workspace");

    // MCP Servers 탭 클릭
    await page.getByRole("button", { name: /MCP Servers/ }).click();

    // 빈 상태 메시지 확인
    await expect(page.getByText(/등록된 MCP 서버가 없어요/)).toBeVisible();

    // 서버 추가 버튼 클릭
    await page.getByRole("button", { name: /서버 추가/ }).click();

    // 폼 필드 확인
    await expect(page.getByPlaceholder("My MCP Server")).toBeVisible();
    await expect(page.getByPlaceholder(/mcp\.example\.com/)).toBeVisible();
  });

  test("MCP 서버 연결 테스트 성공", async ({ authenticatedPage: page }) => {
    // Mock: 서버 1개 존재
    await page.route("**/api/mcp/servers", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              id: "srv-1",
              name: "My MCP",
              serverUrl: "https://mcp.test/sse",
              transportType: "sse",
              status: "inactive",
              lastConnectedAt: null,
              errorMessage: null,
              toolCount: 0,
              createdAt: "2026-03-18T00:00:00Z",
            },
          ]),
          headers: { "Content-Type": "application/json" },
        });
      }
      return route.continue();
    });

    // Mock: 연결 테스트 성공
    await page.route("**/api/mcp/servers/srv-1/test", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          status: "connected",
          tools: [
            { name: "foundry_code_review", description: "Review" },
            { name: "foundry_code_gen", description: "Generate" },
          ],
          toolCount: 2,
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    await page.goto("/workspace");
    await page.getByRole("button", { name: /MCP Servers/ }).click();

    // 서버 카드 확인
    await expect(page.getByText("My MCP")).toBeVisible();
    await expect(page.getByText("inactive")).toBeVisible();

    // 연결 테스트 클릭
    await page.getByRole("button", { name: /연결 테스트/ }).click();

    // 성공 메시지 확인
    await expect(page.getByText(/연결 성공.*2개 도구/)).toBeVisible({ timeout: 10000 });
  });
});
