import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TestAgentPanel } from "../components/feature/TestAgentPanel";
import { TestGenerationResult } from "../components/feature/TestGenerationResult";
import { CoverageGapView } from "../components/feature/CoverageGapView";
import type { TestGenerationResponse, CoverageGapResponse } from "../lib/api-client";

// Mock api-client
vi.mock("../lib/api-client", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../lib/api-client");
  return {
    ...actual,
    generateTests: vi.fn(),
    analyzeCoverageGaps: vi.fn(),
  };
});

const mockGenerateResult: TestGenerationResponse = {
  testFiles: [
    {
      path: "src/utils.test.ts",
      content: 'import { describe, it, expect } from "vitest";\n\ndescribe("add", () => {\n  it("adds two numbers", () => {\n    expect(add(1, 2)).toBe(3);\n  });\n});',
      testCount: 1,
      framework: "vitest",
    },
  ],
  totalTestCount: 1,
  coverageEstimate: 85,
  edgeCases: [
    { function: "add", case: "negative numbers", category: "boundary" },
  ],
  tokensUsed: 500,
  model: "claude-sonnet-4-6",
  duration: 3200,
};

const mockCoverageResult: CoverageGapResponse = {
  analyzedFiles: 2,
  uncoveredFunctions: [
    { file: "src/utils.ts", function: "subtract", complexity: "low", priority: "medium" },
  ],
  missingEdgeCases: [
    { file: "src/utils.ts", function: "divide", suggestedCases: ["division by zero", "very large numbers"] },
  ],
  overallCoverage: 65,
  tokensUsed: 300,
  model: "claude-sonnet-4-6",
};

describe("TestAgentPanel", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with generate tab active by default", () => {
    render(<TestAgentPanel onClose={onClose} />);
    expect(screen.getByText("TestAgent")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/소스 코드를 붙여넣으세요/)).toBeInTheDocument();
    // "테스트 생성"이 탭 라벨과 버튼 모두에 존재
    expect(screen.getAllByText("테스트 생성")).toHaveLength(2);
    expect(screen.getByText("커버리지 갭")).toBeInTheDocument();
  });

  it("switches tabs", () => {
    render(<TestAgentPanel onClose={onClose} />);
    fireEvent.click(screen.getByText("커버리지 갭"));
    expect(screen.getByText("갭 분석")).toBeInTheDocument();
  });

  it("shows error when submitting empty source code", async () => {
    render(<TestAgentPanel onClose={onClose} />);
    // "테스트 생성" 버튼은 탭 버튼과 실행 버튼 두 개 — 실행 버튼은 마지막
    const buttons = screen.getAllByText("테스트 생성");
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => {
      expect(screen.getByText("소스 코드를 입력해주세요.")).toBeInTheDocument();
    });
  });

  it("calls onClose when close button clicked", () => {
    render(<TestAgentPanel onClose={onClose} />);
    fireEvent.click(screen.getByText("닫기"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("TestGenerationResult", () => {
  it("renders test file content and metadata", () => {
    render(<TestGenerationResult result={mockGenerateResult} />);
    expect(screen.getByText("1개 테스트")).toBeInTheDocument();
    expect(screen.getByText("커버리지 추정 85%")).toBeInTheDocument();
    expect(screen.getByText("복사")).toBeInTheDocument();
  });

  it("renders edge cases table", () => {
    render(<TestGenerationResult result={mockGenerateResult} />);
    expect(screen.getByText("추천 엣지케이스")).toBeInTheDocument();
    expect(screen.getByText("negative numbers")).toBeInTheDocument();
    expect(screen.getByText("boundary")).toBeInTheDocument();
  });

  it("renders file path", () => {
    render(<TestGenerationResult result={mockGenerateResult} />);
    expect(screen.getByText("src/utils.test.ts")).toBeInTheDocument();
  });
});

describe("CoverageGapView", () => {
  it("renders summary with coverage percentage", () => {
    render(<CoverageGapView result={mockCoverageResult} />);
    expect(screen.getByText("2개 파일 분석")).toBeInTheDocument();
    expect(screen.getByText("커버리지 65%")).toBeInTheDocument();
  });

  it("renders uncovered functions table", () => {
    render(<CoverageGapView result={mockCoverageResult} />);
    expect(screen.getByText("미커버 함수 (1개)")).toBeInTheDocument();
    expect(screen.getByText("subtract")).toBeInTheDocument();
    expect(screen.getByText("medium")).toBeInTheDocument();
  });

  it("renders missing edge cases", () => {
    render(<CoverageGapView result={mockCoverageResult} />);
    expect(screen.getByText("누락 엣지케이스 (1건)")).toBeInTheDocument();
    expect(screen.getByText("division by zero")).toBeInTheDocument();
    expect(screen.getByText("very large numbers")).toBeInTheDocument();
  });

  it("shows success message when no gaps found", () => {
    const emptyResult: CoverageGapResponse = {
      ...mockCoverageResult,
      uncoveredFunctions: [],
      missingEdgeCases: [],
      overallCoverage: 100,
    };
    render(<CoverageGapView result={emptyResult} />);
    expect(screen.getByText(/모든 함수가 커버/)).toBeInTheDocument();
  });
});
