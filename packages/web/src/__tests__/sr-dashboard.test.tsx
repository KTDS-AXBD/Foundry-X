import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock api-client
vi.mock("@/lib/api-client", () => ({
  fetchSrList: vi.fn(),
  fetchSrStats: vi.fn(),
  submitSrFeedback: vi.fn(),
}));

import SrStatsCards from "@/components/feature/SrStatsCards";
import SrListTable from "@/components/feature/SrListTable";
import SrWorkflowDag from "@/components/feature/SrWorkflowDag";
import SrFeedbackDialog from "@/components/feature/SrFeedbackDialog";
import { Component as SrPage } from "@/routes/sr";
import { fetchSrList, fetchSrStats } from "@/lib/api-client";
import type { SrStatsResponse, SrItem, SrWorkflowNodeClient } from "@/lib/api-client";

// ─── Mock Data ───

const mockStats: SrStatsResponse = {
  typeDistribution: [
    { sr_type: "bug_fix", count: 20, avg_confidence: 0.85 },
    { sr_type: "code_change", count: 15, avg_confidence: 0.82 },
    { sr_type: "security_patch", count: 7, avg_confidence: 0.92 },
  ],
  totalCount: 42,
  feedbackCount: 2,
  misclassificationRate: 0.05,
};

const mockItems: SrItem[] = [
  {
    id: "sr-1",
    org_id: "org-1",
    title: "Fix login timeout",
    description: null,
    sr_type: "bug_fix",
    priority: "high",
    status: "open",
    confidence: 0.92,
    matched_keywords: ["login", "timeout"],
    workflow_id: null,
    created_at: "2026-03-20T00:00:00Z",
    updated_at: "2026-03-20T00:00:00Z",
    closed_at: null,
  },
  {
    id: "sr-2",
    org_id: "org-1",
    title: "Update docs",
    description: null,
    sr_type: "doc_update",
    priority: "low",
    status: "classified",
    confidence: 0.55,
    matched_keywords: ["docs"],
    workflow_id: null,
    created_at: "2026-03-21T00:00:00Z",
    updated_at: "2026-03-21T00:00:00Z",
    closed_at: null,
  },
];

const mockNodes: SrWorkflowNodeClient[] = [
  { id: "plan", type: "agent", label: "PlannerAgent", status: "done" },
  { id: "test", type: "agent", label: "TestAgent", status: "running" },
  { id: "review", type: "agent", label: "ReviewerAgent", status: "pending" },
];

// ─── SrStatsCards ───

describe("SrStatsCards", () => {
  it("renders total count", () => {
    render(<SrStatsCards stats={mockStats} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders avg confidence and misclassification rate", () => {
    render(<SrStatsCards stats={mockStats} />);
    expect(screen.getByText("85.1%")).toBeInTheDocument();
    expect(screen.getByText("5.0%")).toBeInTheDocument();
  });
});

// ─── SrListTable ───

describe("SrListTable", () => {
  const defaultProps = {
    items: mockItems,
    filters: { sr_type: "", status: "", priority: "" },
    onFilterChange: vi.fn(),
    total: 2,
    offset: 0,
    limit: 20,
    onPageChange: vi.fn(),
  };

  it("renders SR titles", () => {
    render(<MemoryRouter><SrListTable {...defaultProps} /></MemoryRouter>);
    expect(screen.getByText("Fix login timeout")).toBeInTheDocument();
    expect(screen.getByText("Update docs")).toBeInTheDocument();
  });

  it("shows LLM fallback badge for low confidence", () => {
    render(<MemoryRouter><SrListTable {...defaultProps} /></MemoryRouter>);
    expect(screen.getByText("LLM 폴백")).toBeInTheDocument();
  });
});

// ─── SrWorkflowDag ───

describe("SrWorkflowDag", () => {
  it("renders all nodes", () => {
    render(<SrWorkflowDag nodes={mockNodes} />);
    expect(screen.getByText("PlannerAgent")).toBeInTheDocument();
    expect(screen.getByText("TestAgent")).toBeInTheDocument();
    expect(screen.getByText("ReviewerAgent")).toBeInTheDocument();
  });

  it("renders arrows between nodes", () => {
    const { container } = render(<SrWorkflowDag nodes={mockNodes} />);
    const arrows = container.querySelectorAll("[aria-hidden='true']");
    expect(arrows.length).toBe(2);
  });
});

// ─── SrFeedbackDialog ───

describe("SrFeedbackDialog", () => {
  it("does not render when closed", () => {
    render(
      <SrFeedbackDialog srId="sr-1" currentType="bug_fix" open={false} onOpenChange={vi.fn()} />,
    );
    expect(screen.queryByText("분류 수정")).not.toBeInTheDocument();
  });

  it("renders type options excluding current type when open", () => {
    render(
      <SrFeedbackDialog srId="sr-1" currentType="bug_fix" open={true} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByText("분류 수정")).toBeInTheDocument();
    expect(screen.getByText("Code Change")).toBeInTheDocument();
    // "Bug Fix" appears as current type label but NOT in the select options
    const select = screen.getByLabelText("Corrected Type") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).not.toContain("bug_fix");
    expect(options).toContain("code_change");
  });
});

// ─── SR List Page ───

describe("SrPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchSrStats).mockResolvedValue(mockStats);
    vi.mocked(fetchSrList).mockResolvedValue({ items: mockItems, total: 2 });
  });

  it("renders stats and list after loading", async () => {
    render(<MemoryRouter><SrPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText("SR Management")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });
    expect(screen.getByText("Fix login timeout")).toBeInTheDocument();
  });
});

// SR Detail 테스트는 [id] 동적 라우트 제거로 삭제 — 추후 모달 패턴으로 재구현 시 추가
