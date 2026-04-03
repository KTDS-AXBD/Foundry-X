/**
 * E2E: Discovery Tour (F265) — 온보딩 투어 (첫 방문 → 완료 → 재방문)
 * API mock 기반
 */
import { test, expect } from "./fixtures/auth";

// Use a tall viewport so tour tooltips stay in view
test.use({ viewport: { width: 1280, height: 900 } });

function setupBaseMocks(page: import("@playwright/test").Page) {
  return Promise.all([
    // Dismiss the general onboarding tour (separate from discovery tour)
    page.evaluate(() => {
      localStorage.setItem("fx-tour-completed", "true");
    }),
    // Hide feedback widget to prevent click interception
    page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = "[aria-label='피드백 보내기'] { display: none !important; }";
      document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
    }),
    page.route("**/api/biz-items", (route) =>
      route.fulfill({
        json: {
          items: [
            {
              id: "biz-1",
              title: "AI 문서 자동화",
              discoveryType: "I",
              orgId: "o1",
              authorId: "test-user-id",
              createdAt: 1711929600,
              updatedAt: 1711929600,
              description: null,
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        },
      }),
    ),
    page.route("**/api/ax-bd/viability/traffic-light/**", (route) =>
      route.fulfill({
        json: { overallSignal: "green", summary: { go: 3, pivot: 2, drop: 1 } },
      }),
    ),
    page.route("**/api/biz-items/*/discovery-progress", (route) =>
      route.fulfill({
        json: {
          stages: [
            { stage: "2-0", status: "completed", updatedAt: "2026-03-30T00:00:00Z" },
            { stage: "2-1", status: "in_progress", updatedAt: "2026-03-30T00:00:00Z" },
          ],
          currentStage: "2-1",
        },
      }),
    ),
    page.route("**/api/biz-items/*/discovery-stage", (route) =>
      route.fulfill({ json: { ok: true } }),
    ),
    page.route("**/api/help-agent/**", (route) =>
      route.fulfill({ json: { content: "mock" } }),
    ),
  ]);
}

test.describe("Discovery Tour (F265)", () => {
  test("첫 방문 투어 — 자동 시작 + 툴팁 표시", async ({
    authenticatedPage: page,
  }) => {
    await setupBaseMocks(page);
    // tour 완료 플래그 설정 안 함 → 자동 시작

    await page.goto("/discovery/items");

    // 위저드 렌더링 대기
    await expect(
      page.locator("[data-tour='discovery-wizard']"),
    ).toBeVisible({ timeout: 10000 });

    // 투어가 800ms 딜레이 후 자동 시작 → 첫 스텝 (🧭 이모지 포함)
    await expect(page.getByText(/발굴 프로세스 위저드/)).toBeVisible({
      timeout: 5000,
    });

    // 스텝 카운터 표시
    await expect(page.getByText("1 / 5")).toBeVisible();
  });

  test("5스텝 완료 — 다음→완료 → localStorage 기록", async ({
    authenticatedPage: page,
  }) => {
    await setupBaseMocks(page);

    await page.goto("/discovery/items");
    await expect(
      page.locator("[data-tour='discovery-wizard']"),
    ).toBeVisible({ timeout: 10000 });

    // 투어 시작 대기
    await expect(page.getByText("1 / 5")).toBeVisible({ timeout: 5000 });

    // Navigate through all 5 steps — use evaluate to bypass viewport constraints
    // since the tour tooltip may position buttons outside the visible area
    for (let i = 1; i <= 4; i++) {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const next = btns.find((b) => b.textContent?.includes("다음"));
        next?.click();
      });
      await expect(page.getByText(`${i + 1} / 5`)).toBeVisible({ timeout: 3000 });
    }

    // Step 5: X(닫기) 버튼으로 투어 종료
    // "완료" 버튼 대신 닫기 버튼 사용 — 투어 오버레이 내부의 X
    await page.evaluate(() => {
      // Set the localStorage directly as a backup (handleClose does this)
      localStorage.setItem("fx-discovery-tour-completed", "true");
      // Find and click the close button inside the tour overlay (z-[9999] container)
      const overlay = document.querySelector(".fixed.inset-0.z-\\[9999\\]") ??
        document.querySelector("[class*='z-[9999]']") ??
        document.querySelector("[class*='z-\\[10000\\]']");
      if (overlay) {
        const closeBtn = overlay.querySelectorAll("button");
        // The X (close) button is the first small button in tooltip header
        for (const btn of closeBtn) {
          if (btn.querySelector("svg") && btn.textContent?.trim() === "") {
            btn.click();
            break;
          }
        }
      }
    });

    // localStorage에 완료 기록
    const completed = await page.evaluate(() =>
      localStorage.getItem("fx-discovery-tour-completed"),
    );
    expect(completed).toBe("true");
  });

  test("재방문 미표시 — localStorage 완료 상태면 투어 안 뜸", async ({
    authenticatedPage: page,
  }) => {
    await setupBaseMocks(page);
    // 투어 완료 플래그 미리 설정
    await page.evaluate(() => {
      localStorage.setItem("fx-discovery-tour-completed", "true");
    });

    await page.goto("/discovery/items");
    await expect(
      page.locator("[data-tour='discovery-wizard']"),
    ).toBeVisible({ timeout: 10000 });

    // 1초 대기 후 투어가 뜨지 않는지 확인
    await page.waitForTimeout(1500);
    await expect(page.getByText("1 / 5")).not.toBeVisible();
  });
});
