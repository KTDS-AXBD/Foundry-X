import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardCard from "../components/feature/DashboardCard";
import HarnessHealth from "../components/feature/HarnessHealth";
import AgentCard from "../components/feature/AgentCard";
import type { HarnessIntegrity, AgentProfile } from "@foundry-x/shared";

describe("DashboardCard", () => {
  it("renders title and children", () => {
    render(
      <DashboardCard title="Test Card" loading={false} error={null}>
        <span>Content here</span>
      </DashboardCard>,
    );
    expect(screen.getByText("Test Card")).toBeInTheDocument();
    expect(screen.getByText("Content here")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(
      <DashboardCard title="Loading" loading={true} error={null}>
        <span>Hidden</span>
      </DashboardCard>,
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("shows error state", () => {
    render(
      <DashboardCard title="Error" loading={false} error="Something went wrong">
        <span>Hidden</span>
      </DashboardCard>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });
});

describe("HarnessHealth", () => {
  const mockData: HarnessIntegrity = {
    passed: true,
    score: 92,
    checks: [
      { name: "CLAUDE.md exists", passed: true, level: "PASS", message: "found" },
      { name: "No placeholder", passed: false, level: "WARN", message: "1 file" },
    ],
  };

  it("renders score and status", () => {
    render(<HarnessHealth data={mockData} />);
    expect(screen.getByText("92%")).toBeInTheDocument();
    expect(screen.getByText("PASSED")).toBeInTheDocument();
  });

  it("renders check count", () => {
    render(<HarnessHealth data={mockData} />);
    expect(screen.getByText("2 checks executed")).toBeInTheDocument();
  });

  it("renders individual checks", () => {
    render(<HarnessHealth data={mockData} />);
    expect(screen.getByText("CLAUDE.md exists")).toBeInTheDocument();
    expect(screen.getByText("PASS")).toBeInTheDocument();
    expect(screen.getByText("WARN")).toBeInTheDocument();
  });

  it("shows FAILED when not passed", () => {
    render(<HarnessHealth data={{ ...mockData, passed: false }} />);
    expect(screen.getByText("FAILED")).toBeInTheDocument();
  });
});

describe("AgentCard", () => {
  const mockAgent: AgentProfile = {
    id: "agent-test",
    name: "Test Agent",
    capabilities: [
      { action: "review", scope: "pull-request", tools: ["eslint"] },
    ],
    constraints: [
      { tier: "always", rule: "Run lint first", reason: "Catches issues early" },
      { tier: "never", rule: "Push to main", reason: "Branch protection" },
    ],
    activity: {
      status: "running",
      currentTask: "Processing files...",
      progress: 65,
      tokenUsed: 2400,
    },
  };

  it("renders agent name and status", () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText("Test Agent")).toBeInTheDocument();
    expect(screen.getByText("running")).toBeInTheDocument();
  });

  it("renders capabilities", () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText("review")).toBeInTheDocument();
    expect(screen.getByText("eslint")).toBeInTheDocument();
  });

  it("renders constraints with tiers", () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText("always")).toBeInTheDocument();
    expect(screen.getByText("never")).toBeInTheDocument();
    expect(screen.getByText("Run lint first")).toBeInTheDocument();
  });

  it("renders activity with progress", () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText("Processing files...")).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();
    expect(screen.getByText("2,400")).toBeInTheDocument();
  });

  it("renders idle agent without activity details", () => {
    const idleAgent: AgentProfile = {
      ...mockAgent,
      activity: { status: "idle" },
    };
    render(<AgentCard agent={idleAgent} />);
    expect(screen.getByText("idle")).toBeInTheDocument();
    expect(screen.queryByText("Processing files...")).not.toBeInTheDocument();
  });
});
