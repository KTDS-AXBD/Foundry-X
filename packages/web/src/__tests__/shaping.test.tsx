import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ShapingRunCard from "../components/feature/shaping/ShapingRunCard";
import SectionReviewAction from "../components/feature/shaping/SectionReviewAction";
import ExpertReviewPanel from "../components/feature/shaping/ExpertReviewPanel";

// Mock api-client
vi.mock("@/lib/api-client", () => ({
  postApi: vi.fn().mockResolvedValue({ action: "approved", newStatus: "completed" }),
  fetchApi: vi.fn(),
  BASE_URL: "/api",
}));

const mockRun = {
  id: "run-1",
  discoveryPrdId: "prd-001",
  status: "running",
  mode: "hitl",
  currentPhase: "E",
  qualityScore: 0.87,
  createdAt: "2026-04-03T14:00:00Z",
  completedAt: null,
};

describe("ShapingRunCard", () => {
  it("renders running status badge", () => {
    const { getByText } = render(
      <MemoryRouter>
        <ShapingRunCard run={mockRun} />
      </MemoryRouter>,
    );
    expect(getByText("진행 중")).toBeDefined();
    expect(getByText("HITL")).toBeDefined();
    expect(getByText("Phase E")).toBeDefined();
  });

  it("renders completed status", () => {
    const { getByText } = render(
      <MemoryRouter>
        <ShapingRunCard run={{ ...mockRun, status: "completed" }} />
      </MemoryRouter>,
    );
    expect(getByText("완료")).toBeDefined();
  });

  it("renders escalated status", () => {
    const { getByText } = render(
      <MemoryRouter>
        <ShapingRunCard run={{ ...mockRun, status: "escalated" }} />
      </MemoryRouter>,
    );
    expect(getByText("에스컬레이션")).toBeDefined();
  });
});

describe("SectionReviewAction", () => {
  it("renders three action buttons", () => {
    const { getByText } = render(
      <SectionReviewAction runId="run-1" section="section-1" onReview={() => {}} />,
    );
    expect(getByText("승인")).toBeDefined();
    expect(getByText("수정요청")).toBeDefined();
    expect(getByText("반려")).toBeDefined();
  });

  it("shows comment input on revision request", async () => {
    const { getByText, getByPlaceholderText } = render(
      <SectionReviewAction runId="run-1" section="section-1" onReview={() => {}} />,
    );
    fireEvent.click(getByText("수정요청"));
    await waitFor(() => {
      expect(getByPlaceholderText("사유를 입력하세요")).toBeDefined();
    });
  });
});

describe("ExpertReviewPanel", () => {
  const reviews = [
    { id: "r1", expertRole: "TA", reviewBody: "Architecture review", findings: null, qualityScore: 0.9, createdAt: "2026-04-03" },
    { id: "r2", expertRole: "CA", reviewBody: "Cloud review", findings: null, qualityScore: 0.85, createdAt: "2026-04-03" },
  ];

  it("renders expert role tabs", () => {
    const { getByText } = render(<ExpertReviewPanel reviews={reviews} />);
    expect(getByText("TA")).toBeDefined();
    expect(getByText("CA")).toBeDefined();
    expect(getByText("QA")).toBeDefined();
  });

  it("shows review body for active tab", () => {
    const { getByText } = render(<ExpertReviewPanel reviews={reviews} />);
    expect(getByText("Architecture review")).toBeDefined();
  });

  it("switches tab to show different review", async () => {
    const { getByText, queryByText } = render(<ExpertReviewPanel reviews={reviews} />);
    fireEvent.click(getByText("CA"));
    await waitFor(() => {
      expect(getByText("Cloud review")).toBeDefined();
    });
  });
});
