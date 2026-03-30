import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ItemCard, type PipelineItemData, STAGE_LABELS } from "../components/feature/pipeline/item-card";
import { KanbanBoard } from "../components/feature/pipeline/kanban-board";
import { PipelineView } from "../components/feature/pipeline/pipeline-view";

function makeItem(overrides: Partial<PipelineItemData> = {}): PipelineItemData {
  return {
    id: "item-1",
    title: "테스트 아이템",
    description: "설명 텍스트",
    currentStage: "REGISTERED",
    stageEnteredAt: new Date().toISOString(),
    createdBy: "user-1",
    createdAt: "2026-03-30T00:00:00Z",
    ...overrides,
  };
}

describe("ItemCard", () => {
  it("renders title and stage badge", () => {
    const { getByText } = render(<ItemCard item={makeItem()} />);
    expect(getByText("테스트 아이템")).toBeDefined();
    expect(getByText("등록")).toBeDefined();
  });

  it("renders description when present", () => {
    const { getByText } = render(<ItemCard item={makeItem({ description: "상세 설명" })} />);
    expect(getByText("상세 설명")).toBeDefined();
  });

  it("renders different stage labels", () => {
    const { getByText } = render(
      <ItemCard item={makeItem({ currentStage: "DISCOVERY" })} />,
    );
    expect(getByText("발굴")).toBeDefined();
  });
});

describe("KanbanBoard", () => {
  it("renders all stage columns", () => {
    const columns = Object.keys(STAGE_LABELS).map((stage) => ({
      stage,
      items: [],
      count: 0,
    }));
    const { getByText } = render(<KanbanBoard columns={columns} />);
    expect(getByText("등록")).toBeDefined();
    expect(getByText("MVP")).toBeDefined();
  });

  it("renders items in correct columns", () => {
    const columns = [
      { stage: "REGISTERED", items: [makeItem()], count: 1 },
      { stage: "DISCOVERY", items: [], count: 0 },
    ];
    const { getByText } = render(<KanbanBoard columns={columns} />);
    expect(getByText("테스트 아이템")).toBeDefined();
    expect(getByText("1")).toBeDefined();
  });
});

describe("PipelineView", () => {
  it("renders stats with total items", () => {
    const stats = {
      totalItems: 5,
      byStage: { REGISTERED: 3, DISCOVERY: 2 },
      avgDaysInStage: { REGISTERED: 2.5 },
    };
    const { getByText } = render(<PipelineView stats={stats} />);
    expect(getByText("전체 아이템: 5개")).toBeDefined();
  });
});
