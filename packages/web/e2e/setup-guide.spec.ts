import { test, expect } from "./fixtures/auth";

test.describe("Setup Guide — F267 설치 가이드 UI", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock onboarding progress API
    await page.route("**/api/onboarding/progress", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            totalSteps: 3,
            completedSteps: ["step-1"],
            progressPercent: 33,
            steps: [
              { id: "step-1", label: "로그인", completed: true, completedAt: "2026-03-31T00:00:00Z" },
              { id: "step-2", label: "스킬 설치", completed: false, completedAt: null },
              { id: "step-3", label: "발굴 시작", completed: false, completedAt: null },
            ],
          }),
        });
      }
      return route.continue();
    });

    await page.goto("/getting-started?tab=setup");
  });

  // ─── 환경 선택 ───

  test("기본 환경이 Claude Code(권장)로 선택되어 있다", async ({
    authenticatedPage: page,
  }) => {
    // "환경 설정" 탭이 활성화
    await expect(page.getByRole("tab", { name: "환경 설정" })).toHaveAttribute(
      "data-state",
      "active",
    );

    // Claude Code 버튼이 default variant (활성)
    const ccButton = page.getByRole("button", { name: /Claude Code/ });
    await expect(ccButton).toBeVisible();

    // "권장" 배지가 표시
    await expect(page.getByText("권장")).toBeVisible();
  });

  test("Claude Code 환경에서 6단계 가이드가 표시된다", async ({
    authenticatedPage: page,
  }) => {
    // Sprint 115에서 5→6단계로 변경
    await expect(page.getByText("ax 워크플로우 Plugin 설치")).toBeAttached();
    await expect(page.getByText("CLAUDE_AXBD BD 분석 스킬 설치")).toBeAttached();
    await expect(page.getByText("스킬 동작 확인")).toBeAttached();
    await expect(page.getByText("발굴 프로세스 시작")).toBeAttached();
    await expect(page.getByText("업데이트 (수시)")).toBeAttached();
  });

  test("Claude Code 환경에서 git clone 명령어가 복사 가능하다", async ({
    authenticatedPage: page,
  }) => {
    const cloneCmd = page.getByText("git clone https://github.com/KTDS-AXBD/CLAUDE_AXBD.git");
    await expect(cloneCmd).toBeVisible();

    // Copy button should appear on hover
    const cmdRow = cloneCmd.locator("..");
    const copyBtn = cmdRow.locator("button[aria-label='복사']");
    await cmdRow.hover();
    await expect(copyBtn).toBeVisible();
  });

  test("사전 요구사항이 Claude Code 환경에 맞게 표시된다", async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByText("사전 요구사항")).toBeVisible();
    await expect(page.getByText(/Node\.js v20 이상/)).toBeVisible();
    await expect(page.getByText(/Claude Code CLI 설치/)).toBeVisible();
    await expect(page.getByText(/Git 설치/)).toBeVisible();
  });

  // ─── 환경 전환 ───

  test("Claude Desktop 환경으로 전환하면 3단계 가이드가 표시된다", async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole("button", { name: "Claude Desktop App" }).click();

    // Claude Desktop 전용 단계
    const content = page.locator("[role='tabpanel']");
    await expect(content.getByText("Claude Desktop에서 폴더 열기")).toBeVisible();
    await expect(content.getByText("스킬 동작 확인 + 발굴 시작")).toBeVisible();

    // Claude Code 전용 단계는 사라짐
    await expect(content.getByText("Claude Code 실행")).not.toBeVisible();

    // 사전 요구사항도 변경됨
    await expect(content.getByText(/Claude Desktop 앱 설치/)).toBeVisible();
  });

  test("웹 환경으로 전환하면 Foundry-X 웹 가이드가 표시된다", async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole("button", { name: /Foundry-X 웹/ }).click();

    const content = page.locator("[role='tabpanel']");

    // 웹 전용 단계 (heading에 step number가 포함되므로 부분 매칭)
    await expect(content.getByRole("heading", { name: /Foundry-X 로그인/ })).toBeVisible();
    await expect(content.getByRole("heading", { name: /Discovery 페이지로 이동/ })).toBeVisible();
    await expect(content.getByRole("heading", { name: /사업 아이템 등록/ })).toBeVisible();

    // 사전 요구사항이 간소화
    await expect(content.getByText(/Foundry-X 계정/)).toBeVisible();

    // git clone은 없어야 함
    await expect(content.getByText("git clone")).not.toBeVisible();
  });

  // ─── 보조 UI 요소 ───

  test("note/tip/verify 칼라 블록이 적절히 표시된다", async ({
    authenticatedPage: page,
  }) => {
    // Claude Code 환경 — tip (step 1), note (step 3), verify (step 4)
    await expect(page.getByText(/자동완성 목록에 표시돼요/)).toBeAttached();
    await expect(
      page.getByText(/CLAUDE_AXBD 폴더 안에서.*실행해야/),
    ).toBeAttached();
    await expect(
      page.getByText(/분석 결과를 보여주면 설치 완료/),
    ).toBeAttached();
  });

  test("관련 리소스 섹션이 존재한다", async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByText("관련 리소스")).toBeAttached();
    await expect(page.getByText("CLAUDE_AXBD (BD 분석 스킬)")).toBeAttached();
  });

  // ─── 환경 설명 ───

  test("환경 선택 시 해당 환경 설명이 표시된다", async ({
    authenticatedPage: page,
  }) => {
    // Claude Code 기본 설명
    await expect(page.getByText(/모두 사용 가능/)).toBeAttached();

    // Claude Desktop으로 전환
    await page.getByRole("button", { name: /Claude Desktop/ }).click();
    await expect(
      page.getByText(/GUI로 실행/),
    ).toBeAttached();

    // 웹으로 전환
    await page.getByRole("button", { name: /Foundry-X 웹/ }).click();
    await expect(
      page.getByText(/별도 설치 없이/),
    ).toBeAttached();
  });
});
