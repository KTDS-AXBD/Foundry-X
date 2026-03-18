import { defineConfig, devices } from "@playwright/test";

/**
 * 프로덕션 E2E 전용 Playwright 설정.
 * - baseURL: fx.minu.best (env override 가능)
 * - webServer 없음 — 이미 배포된 프로덕션에 직접 접속
 * - Chromium only — CI 실행 시간 최소화
 * - retries: 1 — 네트워크 flaky 방지
 */
export default defineConfig({
  testDir: "./e2e/prod",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI ? "github" : "html",

  use: {
    baseURL: process.env.PROD_WEB_URL || "https://fx.minu.best",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },

  projects: [
    {
      name: "chromium-prod",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // webServer 없음 — 프로덕션 직접 접속
});
