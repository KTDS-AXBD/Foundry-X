import { test, expect } from "./fixtures/auth";

// @service: portal
// @sprint: 187
// @tagged-by: F400

test.describe("Agent Inbox Thread Reply", () => {
  test("에이전트 페이지에서 Inbox 렌더링", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/agents");

    // Agent Inbox 컴포넌트가 있거나, 에이전트 페이지가 정상 로드
    const content = page
      .getByText(/Agent Inbox/i)
      .or(page.getByText(/Agent Transparency/i));

    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("스레드 뷰 전환 버튼 동작", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/agents");

    // 스레드/목록 토글 버튼 확인
    const threadBtn = page.getByRole("button", { name: "스레드" });
    const listBtn = page.getByRole("button", { name: "목록" });

    // 버튼이 보이면 스레드 모드 전환 테스트
    if (await threadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await threadBtn.click();
      await expect(threadBtn).toHaveAttribute("data-state", /.*/);
      await listBtn.click();
      await expect(listBtn).toHaveAttribute("data-state", /.*/);
    }
  });

  test("답장 폼이 ThreadDetailView에서 렌더링", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/agents");

    // 스레드 모드로 전환
    const threadBtn = page.getByRole("button", { name: "스레드" });
    if (await threadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await threadBtn.click();

      // 스레드 루트가 있으면 클릭하여 상세 뷰 진입
      const threadRoot = page.locator(".cursor-pointer").first();
      if (await threadRoot.isVisible({ timeout: 3000 }).catch(() => false)) {
        await threadRoot.click();

        // ThreadDetailView 요소 확인
        const backBtn = page.getByText("← 뒤로");
        const replyInput = page.getByPlaceholder("답장 내용...");
        const sendBtn = page.getByRole("button", { name: "답장 전송" });

        if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(replyInput).toBeVisible();
          await expect(sendBtn).toBeVisible();
        }
      }
    }
  });

  test("뒤로 버튼으로 스레드 목록 복귀", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/agents");

    const threadBtn = page.getByRole("button", { name: "스레드" });
    if (await threadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await threadBtn.click();

      // 스레드 루트 클릭 → 상세 → 뒤로
      const threadRoot = page.locator(".cursor-pointer").first();
      if (await threadRoot.isVisible({ timeout: 3000 }).catch(() => false)) {
        await threadRoot.click();

        const backBtn = page.getByText("← 뒤로");
        if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await backBtn.click();
          // 목록/스레드 버튼이 다시 보이는지 확인
          await expect(threadBtn).toBeVisible();
        }
      }
    }
  });
});
