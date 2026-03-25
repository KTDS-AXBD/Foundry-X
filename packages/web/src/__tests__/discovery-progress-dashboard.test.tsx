import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import DiscoveryProgressDashboard from "../components/feature/DiscoveryProgressDashboard";

const mockProgress = {
  totalItems: 3,
  byGateStatus: { blocked: 1, warning: 1, ready: 1 },
  byCriterion: [
    { criterionId: 1, name: "문제/고객 정의", completed: 2, inProgress: 1, needsRevision: 0, pending: 0, completionRate: 67 },
    { criterionId: 2, name: "시장 기회", completed: 1, inProgress: 0, needsRevision: 1, pending: 1, completionRate: 33 },
    { criterionId: 3, name: "경쟁 환경", completed: 3, inProgress: 0, needsRevision: 0, pending: 0, completionRate: 100 },
    { criterionId: 4, name: "가치 제안 가설", completed: 2, inProgress: 0, needsRevision: 0, pending: 1, completionRate: 67 },
    { criterionId: 5, name: "수익 구조 가설", completed: 1, inProgress: 1, needsRevision: 0, pending: 1, completionRate: 33 },
    { criterionId: 6, name: "핵심 리스크 가정", completed: 2, inProgress: 0, needsRevision: 0, pending: 1, completionRate: 67 },
    { criterionId: 7, name: "규제/기술 제약", completed: 3, inProgress: 0, needsRevision: 0, pending: 0, completionRate: 100 },
    { criterionId: 8, name: "차별화 근거", completed: 1, inProgress: 1, needsRevision: 0, pending: 1, completionRate: 33 },
    { criterionId: 9, name: "검증 실험 계획", completed: 0, inProgress: 1, needsRevision: 0, pending: 2, completionRate: 0 },
  ],
  items: [
    {
      bizItemId: "item-1", title: "AI 보안 솔루션", completedCount: 9,
      gateStatus: "ready" as const,
      criteria: Array.from({ length: 9 }, (_, i) => ({ criterionId: i + 1, status: "completed" as const })),
    },
    {
      bizItemId: "item-2", title: "스마트 팩토리", completedCount: 7,
      gateStatus: "warning" as const,
      criteria: [
        { criterionId: 1, status: "completed" as const },
        { criterionId: 2, status: "needs_revision" as const },
        { criterionId: 3, status: "completed" as const },
        { criterionId: 4, status: "completed" as const },
        { criterionId: 5, status: "in_progress" as const },
        { criterionId: 6, status: "completed" as const },
        { criterionId: 7, status: "completed" as const },
        { criterionId: 8, status: "in_progress" as const },
        { criterionId: 9, status: "in_progress" as const },
      ],
    },
    {
      bizItemId: "item-3", title: "클라우드 마이그레이션", completedCount: 3,
      gateStatus: "blocked" as const,
      criteria: [
        { criterionId: 1, status: "in_progress" as const },
        { criterionId: 2, status: "pending" as const },
        { criterionId: 3, status: "completed" as const },
        { criterionId: 4, status: "pending" as const },
        { criterionId: 5, status: "pending" as const },
        { criterionId: 6, status: "pending" as const },
        { criterionId: 7, status: "completed" as const },
        { criterionId: 8, status: "pending" as const },
        { criterionId: 9, status: "pending" as const },
      ],
    },
  ],
  bottleneck: { criterionId: 9, name: "검증 실험 계획", completionRate: 0 },
};

describe("DiscoveryProgressDashboard", () => {
  it("renders summary cards with correct counts", () => {
    const { container } = render(<DiscoveryProgressDashboard progress={mockProgress} />);
    expect(container.textContent).toContain("3"); // total
    expect(container.textContent).toContain("Ready");
    expect(container.textContent).toContain("Warning");
    expect(container.textContent).toContain("Blocked");
  });

  it("renders bottleneck alert", () => {
    const { container } = render(<DiscoveryProgressDashboard progress={mockProgress} />);
    expect(container.textContent).toContain("검증 실험 계획");
    expect(container.textContent).toContain("0%");
  });

  it("renders heatmap with item titles", () => {
    const { container } = render(<DiscoveryProgressDashboard progress={mockProgress} />);
    expect(container.textContent).toContain("AI 보안 솔루션");
    expect(container.textContent).toContain("스마트 팩토리");
    expect(container.textContent).toContain("클라우드 마이그레이션");
  });

  it("renders criterion completion rates", () => {
    const { container } = render(<DiscoveryProgressDashboard progress={mockProgress} />);
    expect(container.textContent).toContain("문제/고객 정의");
    expect(container.textContent).toContain("67%");
    expect(container.textContent).toContain("100%");
  });

  it("renders empty state when no items", () => {
    const emptyProgress = {
      ...mockProgress,
      totalItems: 0,
      items: [],
      byGateStatus: { blocked: 0, warning: 0, ready: 0 },
      bottleneck: null,
    };
    const { container } = render(<DiscoveryProgressDashboard progress={emptyProgress} />);
    expect(container.textContent).toContain("등록된 사업 아이템이 없어요");
  });
});
