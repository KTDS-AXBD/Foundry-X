import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { fetchApi } from "@/lib/api-client";

// Mock api-client
vi.mock("@/lib/api-client", () => ({
  fetchApi: vi.fn(),
  getModelQuality: vi.fn(),
  getAgentModelMatrix: vi.fn(),
}));

import QualityMetricCard from "@/components/feature/QualityMetricCard";
import AgentModelHeatmap from "@/components/feature/AgentModelHeatmap";
import ModelQualityTab from "@/components/feature/ModelQualityTab";
import TokensPage from "@/app/(app)/tokens/page";
import { getModelQuality, getAgentModelMatrix } from "@/lib/api-client";

// ─── Mock Data ───

const mockMetrics = {
  metrics: [
    {
      model: "claude-3-sonnet",
      totalExecutions: 100,
      successCount: 95,
      failedCount: 5,
      successRate: 95,
      avgDurationMs: 320,
      totalCostUsd: 12.5,
      avgCostPerExecution: 0.125,
      tokenEfficiency: 8500,
    },
    {
      model: "claude-3-haiku",
      totalExecutions: 200,
      successCount: 120,
      failedCount: 80,
      successRate: 60,
      avgDurationMs: 150,
      totalCostUsd: 3.0,
      avgCostPerExecution: 0.015,
      tokenEfficiency: 15000,
    },
  ],
  period: { from: "2026-02-20", to: "2026-03-22" },
};

const mockMatrix = {
  matrix: [
    { agentName: "reviewer", model: "claude-3-sonnet", executions: 50, totalCostUsd: 5.0, avgDurationMs: 300, successRate: 96 },
    { agentName: "reviewer", model: "claude-3-haiku", executions: 30, totalCostUsd: 0.5, avgDurationMs: 100, successRate: 85 },
    { agentName: "planner", model: "claude-3-sonnet", executions: 40, totalCostUsd: 4.0, avgDurationMs: 450, successRate: 90 },
  ],
  period: { from: "2026-02-20", to: "2026-03-22" },
};

// ─── QualityMetricCard ───

describe("QualityMetricCard", () => {
  const highSuccessMetric = mockMetrics.metrics[0]; // 95%
  const lowSuccessMetric = mockMetrics.metrics[1]; // 60%

  it("renders model name and success rate", () => {
    render(<QualityMetricCard metric={highSuccessMetric} />);
    expect(screen.getByText("claude-3-sonnet")).toBeInTheDocument();
    expect(screen.getByText(/95\.0/)).toBeInTheDocument();
  });

  it("displays 4 metrics: Executions, Duration, Cost, Efficiency", () => {
    render(<QualityMetricCard metric={highSuccessMetric} />);
    expect(screen.getByText("Executions")).toBeInTheDocument();
    expect(screen.getByText("Avg Duration")).toBeInTheDocument();
    expect(screen.getByText("Total Cost")).toBeInTheDocument();
    expect(screen.getByText("Efficiency")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument(); // totalExecutions
    expect(screen.getByText("0.3s")).toBeInTheDocument(); // 320ms → 0.3s
  });

  it("applies green style for high success rate (>=90%)", () => {
    const { container } = render(<QualityMetricCard metric={highSuccessMetric} />);
    const greenEl = container.querySelector(".text-green-500, [class*='green']");
    expect(greenEl).toBeInTheDocument();
  });

  it("applies red/destructive style for low success rate (<70%)", () => {
    const { container } = render(<QualityMetricCard metric={lowSuccessMetric} />);
    const redEl = container.querySelector(".text-destructive, [class*='destructive'], .text-red-500, [class*='red']");
    expect(redEl).toBeInTheDocument();
  });
});

// ─── AgentModelHeatmap ───

describe("AgentModelHeatmap", () => {
  it("renders agent x model matrix", () => {
    render(<AgentModelHeatmap matrix={mockMatrix.matrix} />);
    expect(screen.getByText("reviewer")).toBeInTheDocument();
    expect(screen.getByText("planner")).toBeInTheDocument();
  });

  it("displays execution counts in cells", () => {
    render(<AgentModelHeatmap matrix={mockMatrix.matrix} />);
    expect(screen.getByText(/50/)).toBeInTheDocument();
    expect(screen.getByText(/30/)).toBeInTheDocument();
    expect(screen.getByText(/40/)).toBeInTheDocument();
  });

  it("shows empty message for empty matrix", () => {
    render(<AgentModelHeatmap matrix={[]} />);
    expect(screen.getByText("No agent-model data available.")).toBeInTheDocument();
  });

  it("displays agent names and model names in headers", () => {
    render(<AgentModelHeatmap matrix={mockMatrix.matrix} />);
    expect(screen.getByText("claude-3-sonnet")).toBeInTheDocument();
    expect(screen.getByText("claude-3-haiku")).toBeInTheDocument();
    expect(screen.getByText("reviewer")).toBeInTheDocument();
    expect(screen.getByText("planner")).toBeInTheDocument();
  });
});

// ─── ModelQualityTab ───

describe("ModelQualityTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state", () => {
    vi.mocked(getModelQuality).mockReturnValue(new Promise(() => {})); // never resolves
    vi.mocked(getAgentModelMatrix).mockReturnValue(new Promise(() => {}));
    render(<ModelQualityTab />);
    expect(screen.getByText("Loading model quality data...")).toBeInTheDocument();
  });

  it("renders model cards after data loads", async () => {
    vi.mocked(getModelQuality).mockResolvedValue(mockMetrics);
    vi.mocked(getAgentModelMatrix).mockResolvedValue(mockMatrix);
    render(<ModelQualityTab />);
    await waitFor(() => {
      expect(screen.getByText("Agent × Model Matrix")).toBeInTheDocument();
    });
    // Model names appear in heatmap headers and/or quality cards
    expect(screen.getAllByText("claude-3-sonnet").length).toBeGreaterThan(0);
  });

  it("renders 3 period filter buttons", async () => {
    vi.mocked(getModelQuality).mockResolvedValue(mockMetrics);
    vi.mocked(getAgentModelMatrix).mockResolvedValue(mockMatrix);
    render(<ModelQualityTab />);
    await waitFor(() => {
      expect(screen.getByText("7 days")).toBeInTheDocument();
    });
    expect(screen.getByText("30 days")).toBeInTheDocument();
    expect(screen.getByText("90 days")).toBeInTheDocument();
  });

  it("shows empty message when no data", async () => {
    vi.mocked(getModelQuality).mockResolvedValue({ metrics: [], period: mockMetrics.period });
    vi.mocked(getAgentModelMatrix).mockResolvedValue({ matrix: [], period: mockMatrix.period });
    render(<ModelQualityTab />);
    await waitFor(() => {
      expect(screen.getByText("No model execution data available.")).toBeInTheDocument();
    });
  });

  it("shows error message on API failure", async () => {
    vi.mocked(getModelQuality).mockRejectedValue(new Error("API 500: Internal Server Error"));
    vi.mocked(getAgentModelMatrix).mockRejectedValue(new Error("API 500: Internal Server Error"));
    render(<ModelQualityTab />);
    await waitFor(() => {
      expect(screen.getByText(/API 500/)).toBeInTheDocument();
    });
  });
});

// ─── TokensPage tabs ───

describe("TokensPage tabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchApi).mockImplementation((path: string) => {
      if (path === "/tokens/summary") {
        return Promise.resolve({
          period: "2026-03",
          totalCost: 15.5,
          byModel: { "claude-3-sonnet": { tokens: 50000, cost: 12.5 } },
          byAgent: { reviewer: { tokens: 30000, cost: 8.0 } },
        });
      }
      return Promise.reject(new Error("Unknown path"));
    });
    vi.mocked(getModelQuality).mockResolvedValue(mockMetrics);
    vi.mocked(getAgentModelMatrix).mockResolvedValue(mockMatrix);
  });

  it("renders Usage and Model Quality tabs", async () => {
    render(<TokensPage />);
    await waitFor(() => {
      expect(screen.getByText("Usage")).toBeInTheDocument();
    });
    expect(screen.getByText("Model Quality")).toBeInTheDocument();
  });

  it("shows Usage tab as default", async () => {
    render(<TokensPage />);
    await waitFor(() => {
      expect(screen.getByText(/Total Cost/)).toBeInTheDocument();
    });
  });

  it("shows ModelQualityTab when Model Quality tab is clicked", async () => {
    render(<TokensPage />);
    await waitFor(() => {
      expect(screen.getByText("Model Quality")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Model Quality"));
    await waitFor(() => {
      expect(screen.getByText("claude-3-sonnet")).toBeInTheDocument();
    });
  });
});
