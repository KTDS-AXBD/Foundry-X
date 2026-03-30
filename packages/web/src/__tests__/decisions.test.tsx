import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DecisionPanel } from "../components/feature/decisions/decision-panel";

const mockDecisions = [
  {
    id: "d-1",
    decision: "GO" as const,
    comment: "사업 가치 확인됨",
    decidedBy: "team-lead",
    createdAt: "2026-03-30T00:00:00Z",
    stage: "REVIEW",
  },
  {
    id: "d-2",
    decision: "HOLD" as const,
    comment: "추가 리서치 필요",
    decidedBy: "team-lead",
    createdAt: "2026-03-29T00:00:00Z",
    stage: "DISCOVERY",
  },
];

describe("DecisionPanel", () => {
  it("renders decision panel title", () => {
    const { getByText } = render(
      <DecisionPanel bizItemId="item-1" decisions={[]} />,
    );
    expect(getByText("의사결정")).toBeDefined();
  });

  it("renders Go/Hold/Drop buttons", () => {
    const { getByText } = render(
      <DecisionPanel bizItemId="item-1" decisions={[]} />,
    );
    expect(getByText("Go")).toBeDefined();
    expect(getByText("Hold")).toBeDefined();
    expect(getByText("Drop")).toBeDefined();
  });

  it("renders decision history", () => {
    const { getByText } = render(
      <DecisionPanel bizItemId="item-1" decisions={mockDecisions} />,
    );
    expect(getByText("의사결정 이력")).toBeDefined();
    expect(getByText("사업 가치 확인됨")).toBeDefined();
    expect(getByText("추가 리서치 필요")).toBeDefined();
  });

  it("renders comment textarea placeholder", () => {
    const { getByPlaceholderText } = render(
      <DecisionPanel bizItemId="item-1" decisions={[]} />,
    );
    expect(getByPlaceholderText("의사결정 근거를 작성해주세요 (필수)")).toBeDefined();
  });
});
