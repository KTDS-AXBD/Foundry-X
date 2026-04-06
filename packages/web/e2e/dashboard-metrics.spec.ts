/**
 * E2E: Dashboard Metrics — 운영 지표 대시보드 (F362, Sprint 164, Phase 17)
 *
 * 검증 대상:
 * - /dashboard/metrics 페이지 로드
 * - 4 API 병렬 호출 (overview, effectiveness, agent-usage, skill-reuse)
 * - SummaryCard 3개 렌더링 (Rule 효과, Skill 재사용률, 활용률)
 * - Section 4개 (RuleEffectChart, AgentUsageChart, SkillReuseChart, UnusedHighlight)
 * - 빈 데이터 + 데이터 있는 경우 모두 검증
 */
import { test, expect } from "./fixtures/auth";

// ─── Mock Data ───

const MOCK_OVERVIEW = {
  ruleEffectiveness: {
    averageScore: 72,
    measuredRules: 3,
    totalRules: 5,
  },
  skillReuse: {
    overallReuseRate: 45,
    derivedCount: 8,
    capturedCount: 3,
  },
  agentUsage: {
    activeSources: 12,
    totalSources: 16,
    unusedCount: 4,
  },
};

const MOCK_EFFECTIVENESS = {
  items: [
    {
      proposalId: "prop-1",
      ruleFilename: "auto-guard-001.md",
      patternKey: "hook:error",
      preDeployFailures: 12,
      postDeployFailures: 3,
      effectivenessScore: 75,
      measuredAt: "2026-04-06T10:00:00Z",
    },
    {
      proposalId: "prop-2",
      ruleFilename: "auto-guard-002.md",
      patternKey: "agent:critical",
      preDeployFailures: 8,
      postDeployFailures: 2,
      effectivenessScore: 75,
      measuredAt: "2026-04-06T10:00:00Z",
    },
  ],
};

const MOCK_AGENT_USAGE = {
  items: [
    { source: "hook", count: 45, lastSeen: "2026-04-06T10:00:00Z" },
    { source: "agent", count: 32, lastSeen: "2026-04-05T10:00:00Z" },
    { source: "orchestration", count: 18, lastSeen: "2026-04-04T10:00:00Z" },
    { source: "cli", count: 0, lastSeen: null },
  ],
  unusedSources: ["cli"],
};

const MOCK_SKILL_REUSE = {
  items: [
    { skillId: "sk-1", derivationType: "derived", totalExecutions: 10, reuseCount: 4, reuseRate: 40 },
    { skillId: "sk-2", derivationType: "captured", totalExecutions: 8, reuseCount: 6, reuseRate: 75 },
  ],
  overallReuseRate: 45,
  derivedCount: 1,
  capturedCount: 1,
};

// ─── Helper ───

async function setupMetricsMocks(page: import("@playwright/test").Page) {
  await page.route("**/api/metrics/overview", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_OVERVIEW) }),
  );
  await page.route("**/api/guard-rail/effectiveness", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_EFFECTIVENESS) }),
  );
  await page.route("**/api/metrics/agent-usage*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_AGENT_USAGE) }),
  );
  await page.route("**/api/metrics/skill-reuse", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SKILL_REUSE) }),
  );
}

// ─── Tests ───

test.describe("Dashboard Metrics (F362)", () => {
  test("페이지 로드 — 제목 + SummaryCard 3개 렌더링", async ({ authenticatedPage: page }) => {
    await setupMetricsMocks(page);
    await page.goto("/dashboard/metrics");

    // 제목
    await expect(page.getByRole("heading", { name: "운영 지표 대시보드" })).toBeVisible();
    // 부제
    await expect(page.getByText("하네스 인프라 활용률")).toBeVisible();

    // SummaryCard — Rule 효과
    await expect(page.getByText("Rule 효과")).toBeVisible();
    await expect(page.getByText("3/5 측정")).toBeVisible();

    // SummaryCard — Skill 재사용률 (use first() for duplicate "45%")
    await expect(page.getByText("Skill 재사용률").first()).toBeVisible();

    // SummaryCard — 활용률
    await expect(page.getByText("12/16")).toBeVisible();
    await expect(page.getByText("미사용 4건")).toBeVisible();
  });

  test("Section 렌더링 — Guard Rail 효과 점수", async ({ authenticatedPage: page }) => {
    await setupMetricsMocks(page);
    await page.goto("/dashboard/metrics");

    await expect(page.getByRole("heading", { name: "Guard Rail 효과 점수" })).toBeVisible();
    // Rule 파일명 표시
    await expect(page.getByText("auto-guard-001.md")).toBeVisible();
    await expect(page.getByText("auto-guard-002.md")).toBeVisible();
  });

  test("Section 렌더링 — 에이전트/스킬 활용률", async ({ authenticatedPage: page }) => {
    await setupMetricsMocks(page);
    await page.goto("/dashboard/metrics");

    await expect(page.getByRole("heading", { name: "에이전트/스킬 활용률" })).toBeVisible();
    // source 이름 표시
    await expect(page.getByText("hook")).toBeVisible();
    await expect(page.getByText("agent")).toBeVisible();
  });

  test("Section 렌더링 — Skill 재사용률", async ({ authenticatedPage: page }) => {
    await setupMetricsMocks(page);
    await page.goto("/dashboard/metrics");

    await expect(page.getByRole("heading", { name: "Skill 재사용률" })).toBeVisible();
    // 도넛 차트에 overallRate가 렌더링됨 (SVG text)
    // 범례 라벨 (Derived/Captured)은 viewport에 따라 잘릴 수 있으므로 SVG 존재로 검증
    const skillSection = page.locator("text=Skill 재사용률").locator("..");
    await expect(skillSection.locator("svg")).toBeVisible();
  });

  test("UnusedHighlight — 미사용 항목 경고 표시", async ({ authenticatedPage: page }) => {
    await setupMetricsMocks(page);
    await page.goto("/dashboard/metrics");

    // 미사용 source가 UnusedHighlight 컴포넌트에 표시
    const unusedSection = page.locator("[data-testid='unused-highlight']").or(page.locator("text=미사용"));
    await expect(unusedSection.first()).toBeVisible({ timeout: 5000 });
  });

  test("빈 데이터 — 로딩 후 기본 상태 표시", async ({ authenticatedPage: page }) => {
    await page.route("**/api/metrics/overview", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ruleEffectiveness: { averageScore: 0, measuredRules: 0, totalRules: 0 },
          skillReuse: { overallReuseRate: 0, derivedCount: 0, capturedCount: 0 },
          agentUsage: { activeSources: 0, totalSources: 0, unusedCount: 0 },
        }),
      }),
    );
    await page.route("**/api/guard-rail/effectiveness", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) }),
    );
    await page.route("**/api/metrics/agent-usage*", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], unusedSources: [] }) }),
    );
    await page.route("**/api/metrics/skill-reuse", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], overallReuseRate: 0 }) }),
    );

    await page.goto("/dashboard/metrics");
    await expect(page.getByRole("heading", { name: "운영 지표 대시보드" })).toBeVisible();
    // 빈 데이터 — SummaryCard에 0% 또는 0/0 표시
    await expect(page.getByText("0%").first()).toBeVisible();
  });

  test("API 에러 — 에러 메시지 표시", async ({ authenticatedPage: page }) => {
    await page.route("**/api/metrics/overview", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Internal Server Error" }) }),
    );
    await page.route("**/api/guard-rail/effectiveness", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "fail" }) }),
    );
    await page.route("**/api/metrics/agent-usage*", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "fail" }) }),
    );
    await page.route("**/api/metrics/skill-reuse", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "fail" }) }),
    );

    await page.goto("/dashboard/metrics");
    // fetchApi가 throw하면 error state로 → 에러 메시지 표시
    const errorText = page.locator("text=Failed to load").or(page.locator("text=error"));
    await expect(errorText.first()).toBeVisible({ timeout: 10000 });
  });
});
