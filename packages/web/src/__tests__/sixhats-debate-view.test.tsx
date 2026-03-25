import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import SixHatsDebateView from "../components/feature/SixHatsDebateView";

const mockDebate = {
  id: "debate-1",
  status: "completed" as const,
  totalTurns: 20,
  completedTurns: 20,
  turns: [
    { turnNumber: 1, hat: "white" as const, hatLabel: "⚪ White Hat (사실·데이터)", content: "White hat analysis content here", tokens: 500, durationSeconds: 6.4 },
    { turnNumber: 2, hat: "red" as const, hatLabel: "🔴 Red Hat (감정·직관)", content: "Red hat emotional response", tokens: 400, durationSeconds: 11.1 },
    { turnNumber: 3, hat: "black" as const, hatLabel: "⚫ Black Hat (비판·리스크)", content: "Black hat risk analysis", tokens: 600, durationSeconds: 8.7 },
  ],
  keyIssues: ["기초 데이터 부재", "보안 리스크"],
  summary: "종합 정리",
  model: "mock",
  totalTokens: 1500,
  durationSeconds: 395,
};

describe("SixHatsDebateView", () => {
  it("renders empty state with start button when no debate", () => {
    const onStart = vi.fn();
    const { container } = render(
      <SixHatsDebateView debate={null} onStartDebate={onStart} isLoading={false} />,
    );
    expect(container.textContent).toContain("Six Hats 토론 시작");
  });

  it("renders start button as disabled when loading", () => {
    const { container } = render(
      <SixHatsDebateView debate={null} onStartDebate={vi.fn()} isLoading={true} />,
    );
    expect(container.textContent).toContain("토론 진행 중...");
  });

  it("renders turn cards with hat labels", () => {
    const { container } = render(
      <SixHatsDebateView debate={mockDebate} onStartDebate={vi.fn()} isLoading={false} />,
    );
    expect(container.textContent).toContain("White Hat");
    expect(container.textContent).toContain("Red Hat");
    expect(container.textContent).toContain("Black Hat");
  });

  it("renders metadata (duration, tokens)", () => {
    const { container } = render(
      <SixHatsDebateView debate={mockDebate} onStartDebate={vi.fn()} isLoading={false} />,
    );
    expect(container.textContent).toContain("6m 35s");
    expect(container.textContent).toContain("1.5K tokens");
  });

  it("renders completed badge", () => {
    const { container } = render(
      <SixHatsDebateView debate={mockDebate} onStartDebate={vi.fn()} isLoading={false} />,
    );
    expect(container.textContent).toContain("완료");
  });
});
