/**
 * Sprint 223: F460 포트폴리오 컴포넌트 테스트
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PipelineProgressBar } from "../components/feature/discovery/PipelineProgressBar";
import { PortfolioView } from "../components/feature/discovery/PortfolioView";
import type { PortfolioTree } from "../lib/api-client";

// Mock api-client
vi.mock("@/lib/api-client", () => ({
  fetchApi: vi.fn(),
  fetchPortfolio: vi.fn(),
  BASE_URL: "/api",
}));

import { fetchApi, fetchPortfolio } from "@/lib/api-client";

const mockFetchApi = vi.mocked(fetchApi);
const mockFetchPortfolio = vi.mocked(fetchPortfolio);

function makePortfolioTree(overrides: Partial<PortfolioTree> = {}): PortfolioTree {
  return {
    item: { id: "item-1", title: "AI 품질예측", description: null, source: "field", status: "draft", createdAt: "2026-01-01" },
    classification: { itemType: "기술형", confidence: 0.92, classifiedAt: "2026-01-01" },
    evaluations: [],
    startingPoint: null,
    criteria: [],
    businessPlans: [{ id: "bp-1", version: 1, modelUsed: null, generatedAt: "2026-01-02" }],
    offerings: [{ id: "off-1", title: "제안서", purpose: "proposal", format: "html", status: "draft", currentVersion: 1, sectionsCount: 3, versionsCount: 1, linkedPrototypeIds: ["proto-1"] }],
    prototypes: [{ id: "proto-1", version: 1, format: "html", templateUsed: null, generatedAt: "2026-01-03" }],
    pipelineStages: [{ stage: "DISCOVERY", enteredAt: "2026-01-01", exitedAt: null, notes: null }],
    progress: {
      currentStage: "DISCOVERY",
      completedStages: ["REGISTERED", "DISCOVERY"],
      criteriaCompleted: 0,
      criteriaTotal: 9,
      hasBusinessPlan: true,
      hasOffering: true,
      hasPrototype: true,
      overallPercent: 45,
    },
    ...overrides,
  };
}

describe("PipelineProgressBar", () => {
  it("FORMALIZATION 단계 — 3개 filled, 3개 empty", () => {
    const { container } = render(
      <PipelineProgressBar
        currentStage="FORMALIZATION"
        completedStages={["REGISTERED", "DISCOVERY", "FORMALIZATION"]}
        overallPercent={50}
      />,
    );

    // 완료(green-500) 스텝 3개, 미래(bg-muted) 스텝 3개
    const steps = container.querySelectorAll("[class*='rounded-full']");
    const greenSteps = Array.from(steps).filter((el) => el.className.includes("green-500"));
    const mutedSteps = Array.from(steps).filter((el) => el.className.includes("bg-muted"));

    expect(greenSteps.length).toBe(3);
    expect(mutedSteps.length).toBe(3);
  });

  it("진행률 % 텍스트 표시", () => {
    const { getByText } = render(
      <PipelineProgressBar
        currentStage="REGISTERED"
        completedStages={["REGISTERED"]}
        overallPercent={17}
      />,
    );
    expect(getByText("17%")).toBeDefined();
  });

  it("6단계 라벨 렌더링 (compact=false)", () => {
    const { getByText } = render(
      <PipelineProgressBar
        currentStage="REGISTERED"
        completedStages={["REGISTERED"]}
        overallPercent={5}
      />,
    );
    // 6개 라벨 중 하나라도 존재해야 함
    expect(getByText("등록")).toBeDefined();
    expect(getByText("발굴")).toBeDefined();
  });
});

describe("PortfolioView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("아이템 0건 — 빈 상태 메시지 표시", async () => {
    mockFetchApi.mockResolvedValue([]);

    const { findByText } = render(
      <MemoryRouter>
        <PortfolioView />
      </MemoryRouter>,
    );
    expect(await findByText("등록된 사업 아이템이 없어요")).toBeDefined();
  });

  it("아이템 목록 렌더링 + 진행률 바 표시", async () => {
    mockFetchApi.mockResolvedValue([
      { bizItemId: "item-1", title: "AI 품질예측", currentStage: 2 },
    ]);

    const { findByText } = render(
      <MemoryRouter>
        <PortfolioView />
      </MemoryRouter>,
    );
    expect(await findByText("AI 품질예측")).toBeDefined();
  });

  it("아이템 선택 시 fetchPortfolio 호출", async () => {
    mockFetchApi.mockResolvedValue([
      { bizItemId: "item-1", title: "AI 품질예측", currentStage: 2 },
    ]);
    mockFetchPortfolio.mockResolvedValue(makePortfolioTree());

    const { findByText, getByText } = render(
      <MemoryRouter>
        <PortfolioView />
      </MemoryRouter>,
    );

    await findByText("AI 품질예측");
    getByText("AI 품질예측").click();

    // fetchPortfolio가 해당 아이템 ID로 호출되어야 함
    await vi.waitFor(() => {
      expect(mockFetchPortfolio).toHaveBeenCalledWith("item-1");
    });
  });
});
