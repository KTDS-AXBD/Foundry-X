/**
 * E2E: Guard Rail — 진단 + 패턴 감지 + Rule 제안 워크플로우 (F357~F359, Sprint 161~162, Phase 17)
 *
 * 검증 대상:
 * - Guard Rail API 엔드포인트들의 Web 연동 (있는 경우)
 * - Guard Rail 관련 대시보드 기능 (Orchestration Dashboard 내)
 *
 * 참고: Guard Rail의 핵심 기능은 API + CLI(session-start) 기반이라
 * E2E는 대시보드 내 Guard Rail 관련 표시/링크 검증에 집중
 */
import { test, expect } from "./fixtures/auth";

const MOCK_PROPOSALS = [
  {
    id: "prop-1",
    tenantId: "test-org-e2e",
    patternId: "fp-1",
    ruleContent: "# auto-guard-001\n\nHook 에러 발생 시 재시도 전 로그 확인",
    ruleFilename: "auto-guard-001.md",
    rationale: "hook:error 패턴 12회 반복 (2026-03-15 ~ 2026-04-06)",
    llmModel: "haiku",
    status: "pending",
    reviewedAt: null,
    reviewedBy: null,
    createdAt: "2026-04-06T10:00:00Z",
  },
  {
    id: "prop-2",
    tenantId: "test-org-e2e",
    patternId: "fp-2",
    ruleContent: "# auto-guard-002\n\nAgent critical 에러 시 human escalation",
    ruleFilename: "auto-guard-002.md",
    rationale: "agent:critical 패턴 8회 반복",
    llmModel: "haiku",
    status: "approved",
    reviewedAt: "2026-04-06T10:30:00Z",
    reviewedBy: "test-user-id",
    createdAt: "2026-04-06T09:00:00Z",
  },
];

const MOCK_DIAGNOSTIC = {
  totalEvents: 1250,
  dateRange: { from: "2026-01-15", to: "2026-04-06" },
  isDataSufficient: true,
  sourceDistribution: [
    { source: "hook", count: 450 },
    { source: "agent", count: 320 },
    { source: "orchestration", count: 280 },
    { source: "transition", count: 200 },
  ],
  severityDistribution: [
    { severity: "info", count: 600 },
    { severity: "warning", count: 350 },
    { severity: "error", count: 250 },
    { severity: "critical", count: 50 },
  ],
  failedTransitions: 45,
};

async function setupGuardRailMocks(page: import("@playwright/test").Page) {
  await page.route("**/api/guard-rail/proposals*", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: MOCK_PROPOSALS, total: 2 }),
      });
    }
    return route.continue();
  });
  await page.route("**/api/guard-rail/diagnostic", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_DIAGNOSTIC) }),
  );
}

test.describe("Guard Rail (F357~F359)", () => {
  test("Guard Rail effectiveness API 연동 — 대시보드 metrics에서 표시", async ({ authenticatedPage: page }) => {
    await setupGuardRailMocks(page);
    await page.route("**/api/guard-rail/effectiveness", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              proposalId: "prop-2",
              ruleFilename: "auto-guard-002.md",
              patternKey: "agent:critical",
              preDeployFailures: 8,
              postDeployFailures: 2,
              effectivenessScore: 75,
              measuredAt: "2026-04-06T12:00:00Z",
            },
          ],
        }),
      }),
    );
    // 최소한 Metrics overview에서 effectiveness 참조됨을 확인
    await page.route("**/api/metrics/overview", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ruleEffectiveness: { averageScore: 75, measuredRules: 1, totalRules: 2 },
          skillReuse: { overallReuseRate: 0, derivedCount: 0, capturedCount: 0 },
          agentUsage: { activeSources: 0, totalSources: 0, unusedCount: 0 },
        }),
      }),
    );
    await page.route("**/api/metrics/agent-usage*", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], unusedSources: [] }) }),
    );
    await page.route("**/api/metrics/skill-reuse", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], overallReuseRate: 0 }) }),
    );

    await page.goto("/dashboard/metrics");
    // Rule 효과 점수가 metrics 대시보드에 표시됨
    await expect(page.getByText("auto-guard-002.md")).toBeVisible();
  });
});
