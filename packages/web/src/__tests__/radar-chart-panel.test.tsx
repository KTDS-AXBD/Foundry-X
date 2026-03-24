import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import RadarChartPanel from "../components/feature/RadarChartPanel";

const mockEval = {
  personaId: "strategy",
  personaName: "전략기획팀장",
  businessViability: 8,
  strategicFit: 7,
  customerValue: 6,
  techMarket: 7,
  execution: 5,
  financialFeasibility: 6,
  competitiveDiff: 7,
  scalability: 8,
  summary: "전략적합성이 높고 시장 성장성이 우수하지만 실행 리스크가 존재함",
  concerns: ["실행 인력 부족", "타임라인 과도"],
};

const mockVerdict = {
  verdict: "green",
  avgScore: 7.2,
  totalConcerns: 4,
  warnings: [],
};

describe("RadarChartPanel", () => {
  it("renders empty state when no evaluations", () => {
    const { container } = render(
      <RadarChartPanel evaluations={[]} verdict={null} onEvaluate={vi.fn()} />,
    );
    expect(container.textContent).toContain("아직 페르소나 평가 결과가 없어요");
  });

  it("renders G/K/R verdict badge", () => {
    const { container } = render(
      <RadarChartPanel evaluations={[mockEval]} verdict={mockVerdict} onEvaluate={vi.fn()} />,
    );
    expect(container.textContent).toContain("G (Green)");
    expect(container.textContent).toContain("7.2");
  });

  it("renders SVG radar chart", () => {
    const { container } = render(
      <RadarChartPanel evaluations={[mockEval]} verdict={mockVerdict} onEvaluate={vi.fn()} />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    const polygons = container.querySelectorAll("polygon");
    expect(polygons.length).toBeGreaterThan(1);
  });

  it("renders persona details", () => {
    const { container } = render(
      <RadarChartPanel evaluations={[mockEval]} verdict={mockVerdict} onEvaluate={vi.fn()} />,
    );
    expect(container.textContent).toContain("전략기획팀장");
  });

  it("renders warnings when present", () => {
    const verdictWithWarnings = { ...mockVerdict, warnings: ["전략+재무 5점 미만"] };
    const { container } = render(
      <RadarChartPanel evaluations={[mockEval]} verdict={verdictWithWarnings} onEvaluate={vi.fn()} />,
    );
    expect(container.textContent).toContain("전략+재무 5점 미만");
  });

  it("calls onEvaluate on button click", () => {
    const onEvaluate = vi.fn();
    const { container } = render(
      <RadarChartPanel evaluations={[]} verdict={null} onEvaluate={onEvaluate} />,
    );
    const button = container.querySelector("button");
    button?.click();
    expect(onEvaluate).toHaveBeenCalled();
  });
});
