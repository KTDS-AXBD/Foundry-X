import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NextGuidePanel from "../components/feature/NextGuidePanel";

const mockGuide = {
  currentStep: 3,
  nextStep: {
    order: 4,
    activity: "경쟁사 분석",
    pmSkills: ["/competitive-analysis"],
    discoveryMapping: [3, 8],
  },
  skillGuide: {
    skill: "/competitive-analysis",
    name: "경쟁사 분석 + 포지셔닝",
    purpose: "직접/간접 경쟁사를 식별하고, 차별화 포지셔닝 공간을 발굴합니다.",
    inputExample: "손해사정 AI 자동화 분야의 국내외 경쟁사를 분석해주세요.",
    tips: ["경쟁사가 적은 영역이면 간접 경쟁도 포함해야 합니다"],
    relatedCriteria: [3, 8],
  },
  previousContexts: [
    { stepOrder: 1, pmSkill: "/market-scan", outputText: "시장 규모 분석 결과 텍스트" },
    { stepOrder: 2, pmSkill: "/interview", outputText: "고객 인터뷰 결과 텍스트" },
    { stepOrder: 3, pmSkill: "/strategy", outputText: "전략 방향 결론 텍스트" },
  ],
  completedCriteria: [1, 2],
  suggestedCriteria: [3, 8],
  isLastStep: false,
};

describe("NextGuidePanel", () => {
  it("renders guide skill name and purpose", () => {
    render(<NextGuidePanel guide={mockGuide} />);
    expect(screen.getByText("/competitive-analysis")).toBeInTheDocument();
    expect(screen.getByText("경쟁사 분석 + 포지셔닝")).toBeInTheDocument();
    expect(screen.getByText(/직접\/간접 경쟁사를 식별/)).toBeInTheDocument();
  });

  it("shows previous contexts with copy buttons", () => {
    render(<NextGuidePanel guide={mockGuide} />);
    expect(screen.getByText(/Step 1: 시장 규모 분석/)).toBeInTheDocument();
    expect(screen.getByText(/Step 2: 고객 인터뷰/)).toBeInTheDocument();

    // Copy buttons exist
    const copyButtons = screen.getAllByText("복사");
    expect(copyButtons.length).toBe(3);
  });

  it("renders completion message when all steps done", () => {
    const doneGuide = {
      ...mockGuide,
      nextStep: null,
      skillGuide: null,
      isLastStep: true,
    };
    render(<NextGuidePanel guide={doneGuide} />);
    expect(screen.getByText(/모든 분석 단계를 완료/)).toBeInTheDocument();
  });

  it("shows suggested criteria badges", () => {
    render(<NextGuidePanel guide={mockGuide} />);
    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByText("#8")).toBeInTheDocument();
  });

  it("copies context to clipboard on button click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<NextGuidePanel guide={mockGuide} />);
    const copyButtons = screen.getAllByText("복사");
    fireEvent.click(copyButtons[0]);

    expect(writeText).toHaveBeenCalledWith("시장 규모 분석 결과 텍스트");
  });
});
