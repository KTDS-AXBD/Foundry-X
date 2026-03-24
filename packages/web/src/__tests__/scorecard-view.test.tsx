import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import ScorecardView from "../components/feature/ScorecardView";

const mockScorecard = {
  totalScore: 72,
  verdict: "conditional",
  providerCount: 3,
  providerVerdicts: [
    { name: "chatgpt", verdict: "conditional", score: 70 },
    { name: "gemini", verdict: "go", score: 78 },
    { name: "deepseek", verdict: "conditional", score: 68 },
  ],
  sectionAverages: [
    { name: "핵심 문제 정의", avgScore: 8.0, avgGrade: "충실" },
    { name: "솔루션 설계", avgScore: 7.0, avgGrade: "적정" },
    { name: "시장 분석", avgScore: 6.5, avgGrade: "적정" },
  ],
};

const mockReviews = [
  { provider: "chatgpt", verdict: "conditional", score: 70, feedback: "[]", createdAt: "2026-03-24" },
  { provider: "gemini", verdict: "go", score: 78, feedback: "[]", createdAt: "2026-03-24" },
];

describe("ScorecardView", () => {
  it("renders empty state when no scorecard", () => {
    const { container } = render(
      <ScorecardView reviews={[]} scorecard={null} onRefresh={vi.fn()} />,
    );
    expect(container.textContent).toContain("아직 AI 검토 결과가 없어요");
  });

  it("renders verdict badge and total score", () => {
    const { container } = render(
      <ScorecardView reviews={mockReviews} scorecard={mockScorecard} onRefresh={vi.fn()} />,
    );
    expect(container.textContent).toContain("Conditional");
    expect(container.textContent).toContain("72");
  });

  it("renders provider cards", () => {
    const { container } = render(
      <ScorecardView reviews={mockReviews} scorecard={mockScorecard} onRefresh={vi.fn()} />,
    );
    expect(container.textContent).toContain("chatgpt");
    expect(container.textContent).toContain("gemini");
    expect(container.textContent).toContain("deepseek");
  });

  it("renders section averages", () => {
    const { container } = render(
      <ScorecardView reviews={mockReviews} scorecard={mockScorecard} onRefresh={vi.fn()} />,
    );
    expect(container.textContent).toContain("핵심 문제 정의");
    expect(container.textContent).toContain("충실");
  });

  it("calls onRefresh when button clicked", () => {
    const onRefresh = vi.fn();
    const { container } = render(
      <ScorecardView reviews={[]} scorecard={null} onRefresh={onRefresh} />,
    );
    const button = container.querySelector("button");
    button?.click();
    expect(onRefresh).toHaveBeenCalled();
  });
});
