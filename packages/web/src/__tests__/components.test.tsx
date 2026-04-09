import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardCard from "../components/feature/DashboardCard";
import HarnessHealth from "../components/feature/HarnessHealth";
import AgentCard from "../components/feature/AgentCard";
import MarkdownViewer from "../components/feature/MarkdownViewer";
import ModuleMap from "../components/feature/ModuleMap";
import TokenUsageChart from "../components/feature/TokenUsageChart";
import MermaidDiagram from "../components/feature/MermaidDiagram";
import type { HarnessIntegrity, AgentProfile, RepoProfile } from "@foundry-x/shared";

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
    const { container } = render(
      <DashboardCard title="Loading" loading={true} error={null}>
        <span>Hidden</span>
      </DashboardCard>,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
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

describe("MarkdownViewer", () => {
  it("renders markdown content as HTML", () => {
    render(<MarkdownViewer content="# Hello World" />);
    expect(screen.getByRole("heading", { name: "Hello World" })).toBeInTheDocument();
  });

  it("renders file metadata when provided", () => {
    render(
      <MarkdownViewer content="body" filePath="docs/test.md" author="sinclair" lastModified="2026-03-17" />,
    );
    expect(screen.getByText(/docs\/test\.md/)).toBeInTheDocument();
  });

  it("renders auto-generated sections distinctly", () => {
    const content = "Human text<!-- foundry-x:auto start -->Auto content<!-- foundry-x:auto end -->More human";
    render(<MarkdownViewer content={content} />);
    expect(screen.getByText("Auto-generated")).toBeInTheDocument();
    expect(screen.getByText("Auto content")).toBeInTheDocument();
  });
});

describe("ModuleMap", () => {
  const mockProfile: RepoProfile = {
    mode: "brownfield",
    architecturePattern: "monorepo",
    languages: ["TypeScript", "Python"],
    frameworks: ["hono", "next"],
    buildTools: [],
    testFrameworks: [],
    ci: null,
    packageManager: "pnpm",
    markers: [],
    entryPoints: [],
    modules: [
      { name: "cli", path: "packages/cli", role: "CLI tool" },
      { name: "api", path: "packages/api", role: "API server" },
    ],
  };

  it("renders profile summary", () => {
    render(<ModuleMap profile={mockProfile} />);
    expect(screen.getAllByText("monorepo").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("TypeScript, Python")).toBeInTheDocument();
  });

  it("renders module table", () => {
    render(<ModuleMap profile={mockProfile} />);
    expect(screen.getByText("cli")).toBeInTheDocument();
    expect(screen.getByText("packages/api")).toBeInTheDocument();
    expect(screen.getByText("API server")).toBeInTheDocument();
  });
});

describe("TokenUsageChart", () => {
  it("renders table with data", () => {
    const data = {
      "claude-3": { tokens: 150000, cost: 1.25 },
      "gpt-4": { tokens: 50000, cost: 0.75 },
    };
    render(<TokenUsageChart title="By Model" data={data} />);
    expect(screen.getByText("By Model")).toBeInTheDocument();
    expect(screen.getByText("claude-3")).toBeInTheDocument();
    expect(screen.getByText("$1.2500")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<TokenUsageChart title="Empty" data={{}} />);
    expect(screen.getByText("No data available.")).toBeInTheDocument();
  });
});

describe("MermaidDiagram", () => {
  it("renders mermaid code block", () => {
    render(<MermaidDiagram code="graph TD; A-->B;" />);
    expect(screen.getByText("graph TD; A-->B;")).toBeInTheDocument();
  });

  it("renders custom caption", () => {
    render(<MermaidDiagram code="graph LR;" caption="My Diagram" />);
    expect(screen.getByText("My Diagram")).toBeInTheDocument();
  });
});
