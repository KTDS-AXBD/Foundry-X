import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import PrdReviewSummary from "../components/feature/PrdReviewSummary";

describe("PrdReviewSummary", () => {
  it("renders with review tab active by default", () => {
    const { container } = render(
      <PrdReviewSummary prdId="prd-1" bizItemId="item-1" />,
    );
    expect(container.textContent).toContain("AI 검토");
    expect(container.textContent).toContain("페르소나 평가");
    // Default tab shows review content (empty state)
    expect(container.textContent).toContain("아직 AI 검토 결과가 없어요");
  });

  it("switches to persona tab on click", () => {
    const { container } = render(
      <PrdReviewSummary prdId="prd-1" bizItemId="item-1" />,
    );
    const tabs = container.querySelectorAll("button");
    const personaTab = Array.from(tabs).find((b) => b.textContent === "페르소나 평가");
    expect(personaTab).toBeTruthy();
    fireEvent.click(personaTab!);
    expect(container.textContent).toContain("아직 페르소나 평가 결과가 없어요");
  });

  it("renders scorecard data when provided", () => {
    const reviewData = {
      reviews: [
        { provider: "chatgpt", verdict: "go", score: 80, feedback: "[]", createdAt: "2026-03-24" },
      ],
      scorecard: {
        totalScore: 80,
        verdict: "go",
        providerCount: 1,
        providerVerdicts: [{ name: "chatgpt", verdict: "go", score: 80 }],
        sectionAverages: [{ name: "핵심 문제 정의", avgScore: 8, avgGrade: "충실" }],
      },
    };

    const { container } = render(
      <PrdReviewSummary prdId="prd-1" bizItemId="item-1" reviewData={reviewData} />,
    );
    expect(container.textContent).toContain("Go");
    expect(container.textContent).toContain("80");
  });

  it("calls onStartReview callback", () => {
    const onStart = vi.fn();
    const { container } = render(
      <PrdReviewSummary prdId="prd-1" bizItemId="item-1" onStartReview={onStart} />,
    );
    const button = container.querySelector("button:not([class*='border-b'])");
    // Find the "AI 검토 시작" button inside ScorecardView
    const buttons = container.querySelectorAll("button");
    const startBtn = Array.from(buttons).find((b) => b.textContent?.includes("AI 검토 시작"));
    startBtn?.click();
    expect(onStart).toHaveBeenCalled();
  });
});
