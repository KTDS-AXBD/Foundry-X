import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import CommitGateCard from "../components/feature/CommitGateCard";
import type { CommitGateResponse } from "../lib/api-client";

function makeGate(overrides: Partial<CommitGateResponse> = {}): CommitGateResponse {
  return {
    id: "gate-1",
    bizItemId: "item-1",
    question1Answer: "충분히 투자 가치 있음",
    question2Answer: "팀 역량과 부합",
    question3Answer: "방향 전환 없었음",
    question4Answer: "잃는 것 적고, 배움이 큼",
    finalDecision: "commit",
    reason: "진행하기로 결정",
    decidedBy: "user-1",
    decidedAt: "2026-03-25T00:00:00Z",
    ...overrides,
  };
}

describe("CommitGateCard", () => {
  it("renders empty state when gate is null", () => {
    const { getByText } = render(<CommitGateCard gate={null} />);
    expect(getByText("Commit Gate")).toBeDefined();
    expect(getByText(/아직 실행되지 않았어요/)).toBeDefined();
  });

  it("renders commit decision", () => {
    const { getByText } = render(<CommitGateCard gate={makeGate()} />);
    expect(getByText("Commit")).toBeDefined();
    expect(getByText("충분히 투자 가치 있음")).toBeDefined();
    expect(getByText("진행하기로 결정")).toBeDefined();
  });

  it("renders explore_alternatives decision", () => {
    const { getByText } = render(
      <CommitGateCard gate={makeGate({ finalDecision: "explore_alternatives" })} />,
    );
    expect(getByText("Explore")).toBeDefined();
  });

  it("renders drop decision", () => {
    const { getByText } = render(
      <CommitGateCard gate={makeGate({ finalDecision: "drop" })} />,
    );
    expect(getByText("Drop")).toBeDefined();
  });

  it("renders all 4 questions", () => {
    const { getByText } = render(<CommitGateCard gate={makeGate()} />);
    expect(getByText(/Q1/)).toBeDefined();
    expect(getByText(/Q2/)).toBeDefined();
    expect(getByText(/Q3/)).toBeDefined();
    expect(getByText(/Q4/)).toBeDefined();
  });

  it("renders date", () => {
    const { container } = render(<CommitGateCard gate={makeGate()} />);
    expect(container.textContent).toContain("2026");
  });
});
