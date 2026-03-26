import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import TrafficLightPanel from "../components/feature/TrafficLightPanel";
import type { TrafficLightResponse } from "../lib/api-client";

function makeTrafficLight(overrides: Partial<TrafficLightResponse> = {}): TrafficLightResponse {
  return {
    bizItemId: "item-1",
    summary: { go: 3, pivot: 1, drop: 0, pending: 3 },
    commitGate: null,
    checkpoints: [],
    overallSignal: "yellow",
    ...overrides,
  };
}

describe("TrafficLightPanel", () => {
  it("renders summary counts", () => {
    const { getByText, container } = render(
      <TrafficLightPanel trafficLight={makeTrafficLight()} />,
    );
    expect(getByText("Go")).toBeDefined();
    expect(getByText("Pivot")).toBeDefined();
    expect(getByText("Drop")).toBeDefined();
    // Verify all summary cards render
    const summaryCards = container.querySelectorAll(".text-2xl.font-bold");
    expect(summaryCards.length).toBe(4);
  });

  it("renders green signal correctly", () => {
    const { getByText } = render(
      <TrafficLightPanel
        trafficLight={makeTrafficLight({
          overallSignal: "green",
          summary: { go: 5, pivot: 0, drop: 0, pending: 2 },
        })}
      />,
    );
    expect(getByText("5")).toBeDefined();
  });

  it("renders red signal correctly", () => {
    const { getByText } = render(
      <TrafficLightPanel
        trafficLight={makeTrafficLight({
          overallSignal: "red",
          summary: { go: 2, pivot: 0, drop: 1, pending: 4 },
        })}
      />,
    );
    expect(getByText("Drop")).toBeDefined();
  });

  it("renders checkpoints timeline", () => {
    const { getByText } = render(
      <TrafficLightPanel
        trafficLight={makeTrafficLight({
          checkpoints: [
            {
              id: "cp-1",
              bizItemId: "item-1",
              orgId: "org-1",
              stage: "2-1",
              decision: "go",
              question: "test question",
              reason: "좋은 기회",
              decidedBy: "user-1",
              decidedAt: "2026-03-20T00:00:00Z",
            },
          ],
        })}
      />,
    );
    expect(getByText("체크포인트 이력")).toBeDefined();
    expect(getByText("GO")).toBeDefined();
    expect(getByText("좋은 기회")).toBeDefined();
  });

  it("renders empty state when no checkpoints", () => {
    const { getByText } = render(
      <TrafficLightPanel trafficLight={makeTrafficLight()} />,
    );
    expect(getByText("아직 기록된 체크포인트가 없어요.")).toBeDefined();
  });

  it("renders multiple checkpoints in order", () => {
    const { getAllByText } = render(
      <TrafficLightPanel
        trafficLight={makeTrafficLight({
          checkpoints: [
            {
              id: "cp-1", bizItemId: "item-1", orgId: "org-1",
              stage: "2-1", decision: "go", question: "q1", reason: null,
              decidedBy: "user-1", decidedAt: "2026-03-20T00:00:00Z",
            },
            {
              id: "cp-2", bizItemId: "item-1", orgId: "org-1",
              stage: "2-2", decision: "pivot", question: "q2", reason: "재검토 필요",
              decidedBy: "user-1", decidedAt: "2026-03-21T00:00:00Z",
            },
          ],
        })}
      />,
    );
    expect(getAllByText(/2-[12]/).length).toBeGreaterThanOrEqual(2);
  });
});
