/**
 * E2E: BD 스킬 카탈로그 — 목록 렌더링, 검색, 카테고리 필터
 * API mock 기반
 */
import { test, expect } from "./fixtures/auth";

const mockSkillList = {
  skills: [
    {
      id: "sk-1",
      tenantId: "org_test",
      skillId: "cost-model",
      name: "AI 비용 모델 분석",
      description: "AI 시스템의 비용 구조를 분석해요",
      category: "analysis",
      tags: ["ai-biz", "cost"],
      status: "active",
      safetyGrade: "A",
      safetyScore: 95,
      safetyCheckedAt: null,
      sourceType: "marketplace",
      sourceRef: null,
      promptTemplate: null,
      modelPreference: null,
      maxTokens: 4096,
      tokenCostAvg: 0.05,
      successRate: 0.92,
      totalExecutions: 15,
      currentVersion: 1,
      createdBy: "test-user",
      updatedBy: null,
      createdAt: "2026-04-01T00:00:00Z",
      updatedAt: "2026-04-01T00:00:00Z",
    },
    {
      id: "sk-2",
      tenantId: "org_test",
      skillId: "feasibility-study",
      name: "실현 가능성 검토",
      description: "사업 아이디어의 실현 가능성을 검토해요",
      category: "analysis",
      tags: ["ai-biz", "feasibility"],
      status: "active",
      safetyGrade: "B",
      safetyScore: 80,
      safetyCheckedAt: null,
      sourceType: "marketplace",
      sourceRef: null,
      promptTemplate: null,
      modelPreference: null,
      maxTokens: 4096,
      tokenCostAvg: 0.03,
      successRate: 0.88,
      totalExecutions: 8,
      currentVersion: 1,
      createdBy: "test-user",
      updatedBy: null,
      createdAt: "2026-04-01T00:00:00Z",
      updatedAt: "2026-04-01T00:00:00Z",
    },
  ],
  total: 2,
};

test.describe("BD 스킬 카탈로그", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route("**/api/skills/registry*", (route) => {
      if (route.request().url().includes("/enriched")) return route.continue();
      return route.fulfill({ json: mockSkillList });
    });
    await page.route("**/api/skills/search*", (route) =>
      route.fulfill({
        json: {
          results: mockSkillList.skills.map((s) => ({
            skillId: s.skillId,
            name: s.name,
            description: s.description,
            category: s.category,
            tags: s.tags,
            safetyGrade: s.safetyGrade,
          })),
          total: 2,
        },
      }),
    );
  });

  test("카탈로그 페이지 제목 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/ax-bd/skill-catalog");
    await expect(page.getByRole("heading", { name: /BD 스킬 카탈로그/i })).toBeVisible();
  });

  test("검색 입력 필드 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/ax-bd/skill-catalog");
    await expect(page.getByPlaceholder(/스킬 검색/i)).toBeVisible();
  });

  test("카테고리 필터 '전체' 배지 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/ax-bd/skill-catalog");
    await expect(page.getByText("전체", { exact: false })).toBeVisible();
  });

  test("API 스킬 카드 2개 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/ax-bd/skill-catalog");
    await expect(page.getByText("AI 비용 모델 분석")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("실현 가능성 검토")).toBeVisible();
  });

  test("카드 클릭 시 상세 페이지로 이동", async ({ authenticatedPage: page }) => {
    // Mock enriched for the detail page
    await page.route("**/api/skills/registry/cost-model/enriched", (route) =>
      route.fulfill({
        json: {
          registry: mockSkillList.skills[0],
          metrics: { skillId: "cost-model", totalExecutions: 15, successCount: 14, failedCount: 1, successRate: 0.92, avgDurationMs: 2500, totalCostUsd: 0.75, avgTokensPerExecution: 3000, lastExecutedAt: "2026-04-03T10:00:00Z" },
          versions: [],
          lineage: null,
        },
      }),
    );

    await page.goto("/ax-bd/skill-catalog");
    await page.getByText("AI 비용 모델 분석").click();
    await expect(page).toHaveURL(/skill-catalog\/cost-model/);
  });
});
