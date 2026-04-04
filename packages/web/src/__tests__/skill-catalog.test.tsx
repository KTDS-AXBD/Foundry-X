import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import SkillCatalog from "../components/feature/ax-bd/SkillCatalog";
import { BD_SKILLS } from "../data/bd-skills";

// Mock api-client
vi.mock("@/lib/api-client", () => ({
  BASE_URL: "/api",
  getSkillRegistryList: vi.fn(),
  searchSkillRegistry: vi.fn(),
  getSkillEnriched: vi.fn(),
}));

// Mock hooks — use fallback mode (API returns empty)
vi.mock("@/hooks/useSkillRegistry", () => ({
  useSkillList: vi.fn(() => ({
    items: [],
    total: 0,
    loading: false,
    error: "Not connected",
    refetch: vi.fn(),
  })),
  useSkillSearch: vi.fn(() => ({
    results: null,
    loading: false,
  })),
  useSkillEnriched: vi.fn(() => ({
    data: null,
    loading: false,
    error: null,
  })),
}));

describe("SkillCatalog (fallback mode)", () => {
  it("renders header with total count from static data", () => {
    const { getByText } = render(<SkillCatalog />);
    expect(getByText("BD 스킬 카탈로그")).toBeDefined();
    expect(getByText(new RegExp(`${BD_SKILLS.length}개 스킬`))).toBeDefined();
  });

  it("renders search input", () => {
    const { getByPlaceholderText } = render(<SkillCatalog />);
    expect(getByPlaceholderText(/스킬 검색/)).toBeDefined();
  });

  it("renders category filter badges", () => {
    const { getAllByText } = render(<SkillCatalog />);
    expect(getAllByText(/PM Skills/).length).toBeGreaterThanOrEqual(1);
    expect(getAllByText(/AI Biz/).length).toBeGreaterThanOrEqual(1);
    expect(getAllByText(/경영전략/).length).toBeGreaterThanOrEqual(1);
  });

  it("filters by search query (local fallback)", () => {
    const { getByPlaceholderText, getByText } = render(<SkillCatalog />);
    const input = getByPlaceholderText(/스킬 검색/);
    fireEvent.change(input, { target: { value: "생태계" } });
    expect(getByText("AI 생태계 맵핑")).toBeDefined();
    expect(getByText(/필터 적용중/)).toBeDefined();
  });

  it("renders skill cards", () => {
    const { getByText } = render(<SkillCatalog />);
    expect(getByText("AI 생태계 맵핑")).toBeDefined();
    expect(getByText("AI 경쟁 해자 분석")).toBeDefined();
  });
});

describe("SkillCatalog (API mode)", () => {
  const mockApiItems = [
    {
      id: "sr_1",
      tenantId: "org_1",
      skillId: "ai-biz:ecosystem-map",
      name: "AI 생태계 맵핑",
      description: "밸류체인, 경쟁구도 시각화",
      category: "analysis" as const,
      tags: ["2-1", "2-3"],
      status: "active" as const,
      safetyGrade: "A" as const,
      safetyScore: 95,
      safetyCheckedAt: "2026-04-01",
      sourceType: "marketplace" as const,
      sourceRef: null,
      promptTemplate: null,
      modelPreference: null,
      maxTokens: 4096,
      tokenCostAvg: 0.1,
      successRate: 0.95,
      totalExecutions: 42,
      currentVersion: 1,
      createdBy: "user_1",
      updatedBy: null,
      createdAt: "2026-04-01",
      updatedAt: "2026-04-01",
    },
    {
      id: "sr_2",
      tenantId: "org_1",
      skillId: "ai-biz:moat-analysis",
      name: "AI 경쟁 해자 분석",
      description: "데이터/기술 해자 평가",
      category: "analysis" as const,
      tags: ["2-3", "2-5"],
      status: "active" as const,
      safetyGrade: "B" as const,
      safetyScore: 80,
      safetyCheckedAt: "2026-04-01",
      sourceType: "marketplace" as const,
      sourceRef: null,
      promptTemplate: null,
      modelPreference: null,
      maxTokens: 4096,
      tokenCostAvg: 0.2,
      successRate: 0.9,
      totalExecutions: 15,
      currentVersion: 1,
      createdBy: "user_1",
      updatedBy: null,
      createdAt: "2026-04-01",
      updatedAt: "2026-04-01",
    },
  ];

  beforeEach(() => {
    vi.resetModules();
  });

  it("renders API data when available", async () => {
    // Override the hook mock for this test
    const { useSkillList, useSkillSearch, useSkillEnriched } = await import("@/hooks/useSkillRegistry");
    vi.mocked(useSkillList).mockReturnValue({
      items: mockApiItems,
      total: 2,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { getByText } = render(<SkillCatalog />);
    await waitFor(() => {
      expect(getByText("AI 생태계 맵핑")).toBeDefined();
      expect(getByText("AI 경쟁 해자 분석")).toBeDefined();
      expect(getByText(/2개 스킬/)).toBeDefined();
    });
  });

  it("shows loading state", async () => {
    const { useSkillList } = await import("@/hooks/useSkillRegistry");
    vi.mocked(useSkillList).mockReturnValue({
      items: [],
      total: 0,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { getByText } = render(<SkillCatalog />);
    expect(getByText(/로딩 중/)).toBeDefined();
  });
});
