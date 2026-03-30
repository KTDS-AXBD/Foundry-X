import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Component as SpecGeneratorPage } from "@/routes/spec-generator";

// Mock api-client (use @/ alias to match page import)
vi.mock("@/lib/api-client", () => ({
  generateSpec: vi.fn(),
  fetchApi: vi.fn(),
  ApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = "ApiError";
    }
  },
}));

// Mock shadcn components
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));
vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));
vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

describe("SpecGeneratorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form elements", () => {
    render(<SpecGeneratorPage />);
    expect(screen.getByText("NL → Spec Generator")).toBeInTheDocument();
    expect(screen.getByText("Spec 생성")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/에이전트별/)).toBeInTheDocument();
  });

  it("shows error for text shorter than 10 chars", async () => {
    render(<SpecGeneratorPage />);

    const textarea = screen.getByPlaceholderText(/에이전트별/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "short" } });
    fireEvent.click(screen.getByText("Spec 생성"));

    await waitFor(() => {
      expect(screen.getByText("최소 10자 이상 입력해주세요.")).toBeInTheDocument();
    });
  });

  it("displays generated spec result", async () => {
    const { generateSpec } = await import("@/lib/api-client");
    (generateSpec as ReturnType<typeof vi.fn>).mockResolvedValue({
      spec: {
        title: "Token Dashboard",
        description: "토큰 사용량 대시보드",
        acceptanceCriteria: ["차트 표시"],
        priority: "P1",
        estimatedEffort: "M",
        category: "feature",
        dependencies: [],
        risks: [],
      },
      markdown: "# Token Dashboard",
      confidence: 0.85,
      model: "test-model",
    });

    render(<SpecGeneratorPage />);

    const textarea = screen.getByPlaceholderText(/에이전트별/) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "에이전트별 토큰 사용량을 일별 차트로 확인할 수 있어야 합니다" },
    });
    fireEvent.click(screen.getByText("Spec 생성"));

    await waitFor(() => {
      expect(screen.getByText("Token Dashboard")).toBeInTheDocument();
      expect(screen.getByText("토큰 사용량 대시보드")).toBeInTheDocument();
      expect(screen.getByText("차트 표시")).toBeInTheDocument();
      expect(screen.getByText("P1")).toBeInTheDocument();
    });
  });
});
