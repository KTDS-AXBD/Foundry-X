import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ProcessProgressCard from "../components/feature/ProcessProgressCard";
import PortfolioSummary from "../components/feature/PortfolioSummary";
import type { ProcessProgress, PortfolioSummary as PortfolioSummaryType } from "../lib/api-client";

function makeProgress(overrides: Partial<ProcessProgress> = {}): ProcessProgress {
  return {
    bizItemId: "biz-1",
    title: "AI Chatbot",
    status: "draft",
    pipelineStage: "DISCOVERY",
    pipelineEnteredAt: "2026-03-01",
    currentDiscoveryStage: "2-2",
    discoveryStages: [
      { stageId: "2-0", stageName: "아이템 등록", hasArtifacts: true, artifactCount: 1 },
      { stageId: "2-1", stageName: "시장 조사", hasArtifacts: true, artifactCount: 2 },
      { stageId: "2-2", stageName: "경쟁 분석", hasArtifacts: true, artifactCount: 1 },
      { stageId: "2-3", stageName: "고객 분석", hasArtifacts: false, artifactCount: 0 },
      { stageId: "2-4", stageName: "비즈니스 모델", hasArtifacts: false, artifactCount: 0 },
      { stageId: "2-5", stageName: "Commit Gate", hasArtifacts: false, artifactCount: 0 },
      { stageId: "2-6", stageName: "기술 검증", hasArtifacts: false, artifactCount: 0 },
      { stageId: "2-7", stageName: "시제품 검증", hasArtifacts: false, artifactCount: 0 },
      { stageId: "2-8", stageName: "사업 계획서", hasArtifacts: false, artifactCount: 0 },
      { stageId: "2-9", stageName: "투자 심사", hasArtifacts: false, artifactCount: 0 },
      { stageId: "2-10", stageName: "최종 보고", hasArtifacts: false, artifactCount: 0 },
    ],
    completedStageCount: 3,
    totalStageCount: 11,
    trafficLight: {
      overallSignal: "green",
      go: 2,
      pivot: 0,
      drop: 0,
      pending: 5,
    },
    commitGate: null,
    lastDecision: null,
    ...overrides,
  };
}

function makeSummary(overrides: Partial<PortfolioSummaryType> = {}): PortfolioSummaryType {
  return {
    totalItems: 5,
    bySignal: { green: 3, yellow: 1, red: 1 },
    byPipelineStage: { DISCOVERY: 3, REGISTERED: 2 },
    avgCompletionRate: 34,
    bottleneck: { stageId: "2-4", stageName: "비즈니스 모델", itemCount: 4 },
    ...overrides,
  };
}

describe("ProcessProgressCard", () => {
  it("renders item title and pipeline stage", () => {
    const { getByText } = render(<ProcessProgressCard progress={makeProgress()} />);
    expect(getByText("AI Chatbot")).toBeDefined();
    expect(getByText("DISCOVERY")).toBeDefined();
  });

  it("renders completion stats", () => {
    const { getByText } = render(<ProcessProgressCard progress={makeProgress()} />);
    expect(getByText(/3\/11 단계/)).toBeDefined();
  });

  it("renders traffic light signal", () => {
    const { getByText } = render(<ProcessProgressCard progress={makeProgress()} />);
    expect(getByText("Green")).toBeDefined();
  });

  it("renders traffic light counts", () => {
    const { container } = render(
      <ProcessProgressCard
        progress={makeProgress({
          trafficLight: { overallSignal: "yellow", go: 1, pivot: 2, drop: 0, pending: 4 },
        })}
      />,
    );
    expect(container.textContent).toContain("Go");
    expect(container.textContent).toContain("Pivot");
  });

  it("renders last decision when present", () => {
    const { getByText } = render(
      <ProcessProgressCard
        progress={makeProgress({
          lastDecision: {
            decision: "GO",
            stage: "DISCOVERY",
            comment: "Market looks promising",
            decidedAt: "2026-03-25",
          },
        })}
      />,
    );
    expect(getByText(/Market looks promising/)).toBeDefined();
  });

  it("renders commit gate when present", () => {
    const { container } = render(
      <ProcessProgressCard
        progress={makeProgress({
          commitGate: { decision: "commit", decidedAt: "2026-03-20" },
        })}
      />,
    );
    expect(container.textContent).toContain("commit");
  });

  it("renders 11 stage bars", () => {
    const { container } = render(<ProcessProgressCard progress={makeProgress()} />);
    const bars = container.querySelectorAll(".flex.gap-0\\.5 > div");
    expect(bars.length).toBe(11);
  });
});

describe("PortfolioSummary", () => {
  it("renders total items count", () => {
    const { getByText } = render(<PortfolioSummary summary={makeSummary()} />);
    expect(getByText("5")).toBeDefined();
    expect(getByText("전체 아이템")).toBeDefined();
  });

  it("renders average completion rate", () => {
    const { getByText } = render(<PortfolioSummary summary={makeSummary()} />);
    expect(getByText("34%")).toBeDefined();
  });

  it("renders signal distribution", () => {
    const { getByText } = render(<PortfolioSummary summary={makeSummary()} />);
    expect(getByText("3")).toBeDefined(); // green count
    expect(getByText("Green")).toBeDefined();
    expect(getByText("Yellow")).toBeDefined();
    expect(getByText("Red")).toBeDefined();
  });

  it("renders bottleneck when present", () => {
    const { getByText } = render(<PortfolioSummary summary={makeSummary()} />);
    expect(getByText(/비즈니스 모델/)).toBeDefined();
    expect(getByText(/4건 정체/)).toBeDefined();
  });

  it("does not render bottleneck with 1 item", () => {
    const { container } = render(
      <PortfolioSummary
        summary={makeSummary({
          bottleneck: { stageId: "2-1", stageName: "시장 조사", itemCount: 1 },
        })}
      />,
    );
    expect(container.textContent).not.toContain("병목");
  });

  it("renders empty state", () => {
    const { getByText, container } = render(
      <PortfolioSummary
        summary={makeSummary({ totalItems: 0, bySignal: { green: 0, yellow: 0, red: 0 }, avgCompletionRate: 0, bottleneck: null })}
      />,
    );
    expect(getByText("0%")).toBeDefined();
    expect(getByText("전체 아이템")).toBeDefined();
    // Multiple "0" text nodes exist (total + signal counts), so check container
    expect(container.textContent).toContain("0");
  });
});
