/**
 * E2E: BD 스킬 상세 — enriched 대시보드, 메트릭, 계보, 버전 이력
 * API mock 기반
 */
import { test, expect } from "./fixtures/auth";

// @service: gate-x
// @sprint: 187
// @tagged-by: F400

const mockRegistry = {
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
  currentVersion: 2,
  createdBy: "test-user",
  updatedBy: null,
  createdAt: "2026-04-01T00:00:00Z",
  updatedAt: "2026-04-01T00:00:00Z",
};

const mockMetrics = {
  skillId: "cost-model",
  totalExecutions: 15,
  successCount: 14,
  failedCount: 1,
  successRate: 0.92,
  avgDurationMs: 2500,
  totalCostUsd: 0.75,
  avgTokensPerExecution: 3000,
  lastExecutedAt: "2026-04-03T10:00:00Z",
};

const mockVersions = [
  {
    id: "ver-1",
    skillId: "cost-model",
    version: 2,
    promptHash: "abc123",
    model: "claude-sonnet-4-6",
    maxTokens: 4096,
    changelog: "프롬프트 개선",
    createdAt: "2026-04-03T10:00:00Z",
  },
  {
    id: "ver-0",
    skillId: "cost-model",
    version: 1,
    promptHash: "def456",
    model: "claude-sonnet-4-6",
    maxTokens: 4096,
    changelog: "최초 생성",
    createdAt: "2026-04-01T00:00:00Z",
  },
];

const mockLineage = {
  skillId: "cost-model",
  derivationType: "manual",
  children: [
    { skillId: "cost-model-v2", derivationType: "derived", children: [], parents: [{ skillId: "cost-model", derivationType: "manual" }] },
  ],
  parents: [],
};

const mockEnriched = {
  registry: mockRegistry,
  metrics: mockMetrics,
  versions: mockVersions,
  lineage: mockLineage,
};

test.describe("BD 스킬 상세", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route("**/api/skills/registry/cost-model/enriched", (route) =>
      route.fulfill({ json: mockEnriched }),
    );
  });

  test("상세 페이지 제목 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/ax-bd/skill-catalog/cost-model");
    await expect(page.getByRole("heading", { name: "AI 비용 모델 분석" })).toBeVisible({ timeout: 10000 });
  });

  test("카탈로그 돌아가기 링크 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/ax-bd/skill-catalog/cost-model");
    await expect(page.getByText("카탈로그로 돌아가기")).toBeVisible({ timeout: 10000 });
  });

  test("안전 등급 배지 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/ax-bd/skill-catalog/cost-model");
    await expect(page.getByText("A등급")).toBeVisible({ timeout: 10000 });
  });

  test("메트릭 카드 4개 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/ax-bd/skill-catalog/cost-model");
    await expect(page.getByText("15")).toBeVisible({ timeout: 10000 }); // totalExecutions
    await expect(page.getByText("92%")).toBeVisible(); // successRate
    await expect(page.getByText("$0.75")).toBeVisible(); // totalCostUsd
    await expect(page.getByText("실행 횟수")).toBeVisible();
    await expect(page.getByText("성공률")).toBeVisible();
  });

  test("계보 트리에 자식 노드 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/ax-bd/skill-catalog/cost-model");
    await expect(page.getByText("cost-model-v2")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("derived")).toBeVisible();
  });

  test("버전 이력 테이블 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/ax-bd/skill-catalog/cost-model");
    // 버전 이력 섹션이 렌더링될 때까지 대기
    await expect(page.getByText("프롬프트 개선")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("최초 생성")).toBeVisible();
  });

  test("enriched 데이터 없을 때 에러 표시", async ({ authenticatedPage: page }) => {
    // nonexistent 스킬의 enriched API가 404를 반환하도록 mock
    await page.route("**/api/skills/registry/nonexistent/enriched", (route) =>
      route.fulfill({ status: 404, json: { error: "Not found" } }),
    );
    await page.goto("/ax-bd/skill-catalog/nonexistent");
    // 에러 상태: "스킬을 찾을 수 없어요" 또는 "Failed to load skill"
    await expect(page.getByText(/찾을 수 없|Failed|not found|로딩|없어요/i)).toBeVisible({ timeout: 15000 });
  });
});
