import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DiscoveryCriteriaPanel from "../components/feature/DiscoveryCriteriaPanel";

function makeCriteria(overrides: Array<{ criterionId: number; status?: string }> = []) {
  const defaults = Array.from({ length: 9 }, (_, i) => ({
    criterionId: i + 1,
    name: `기준 ${i + 1}`,
    condition: `조건 ${i + 1}`,
    status: "pending" as const,
    evidence: null,
  }));

  for (const o of overrides) {
    const idx = defaults.findIndex((d) => d.criterionId === o.criterionId);
    if (idx >= 0) defaults[idx] = { ...defaults[idx], ...o } as (typeof defaults)[0];
  }

  return defaults;
}

function makeProgress(
  completed: number,
  gateStatus: "blocked" | "warning" | "ready" = "blocked",
  criteriaOverrides: Array<{ criterionId: number; status?: string }> = [],
) {
  // Mark first N criteria as completed
  const overrides = [
    ...Array.from({ length: completed }, (_, i) => ({
      criterionId: i + 1,
      status: "completed",
    })),
    ...criteriaOverrides,
  ];

  return {
    total: 9 as const,
    completed,
    inProgress: 0,
    needsRevision: 0,
    pending: 9 - completed,
    criteria: makeCriteria(overrides),
    gateStatus,
  };
}

describe("DiscoveryCriteriaPanel", () => {
  it("renders progress bar and count", () => {
    render(
      <DiscoveryCriteriaPanel
        bizItemId="item-1"
        progress={makeProgress(7, "warning")}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText("Discovery 기준")).toBeInTheDocument();
    expect(screen.getByText("7/9")).toBeInTheDocument();
  });

  it("shows all 9 criteria with status icons", () => {
    render(
      <DiscoveryCriteriaPanel
        bizItemId="item-1"
        progress={makeProgress(3, "blocked")}
        onUpdate={vi.fn()}
      />,
    );
    for (let i = 1; i <= 9; i++) {
      expect(screen.getByText(new RegExp(`${i}\\. 기준 ${i}`))).toBeInTheDocument();
    }
  });

  it("displays gate status for blocked state", () => {
    render(
      <DiscoveryCriteriaPanel
        bizItemId="item-1"
        progress={makeProgress(3, "blocked")}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText(/6개 미충족/)).toBeInTheDocument();
    expect(screen.getByText(/7개 이상 충족 필요/)).toBeInTheDocument();
  });

  it("expands criterion on click and shows update buttons", () => {
    const onUpdate = vi.fn();
    render(
      <DiscoveryCriteriaPanel
        bizItemId="item-1"
        progress={makeProgress(0, "blocked")}
        onUpdate={onUpdate}
      />,
    );

    // Click first criterion
    fireEvent.click(screen.getByText(/1\. 기준 1/));

    // Should show condition text
    expect(screen.getByText("조건 1")).toBeInTheDocument();

    // Should show status buttons (text split by emoji, use substring match)
    const buttons = screen.getAllByRole("button").filter((btn) => btn.dataset.slot === "button");
    expect(buttons.length).toBe(3);

    // Click first status button (✅ 완료)
    fireEvent.click(buttons[0]);
    expect(onUpdate).toHaveBeenCalledWith(1, "completed");
  });
});
