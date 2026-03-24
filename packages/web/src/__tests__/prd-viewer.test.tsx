import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PrdViewer from "../components/feature/PrdViewer";

const mockPrd = {
  id: "prd-1",
  bizItemId: "item-1",
  version: 2,
  content: "## 1. 요약\n\n손해사정 AI 자동화 PRD\n\n## 2. 문제 정의\n\n기존 프로세스 비효율",
  criteriaSnapshot: "{}",
  generatedAt: "2026-03-24T10:00:00Z",
};

describe("PrdViewer", () => {
  it("renders PRD content as text", () => {
    render(
      <PrdViewer
        prd={mockPrd}
        versions={[1, 2]}
        onRegenerate={vi.fn()}
      />,
    );
    expect(screen.getByText(/손해사정 AI 자동화 PRD/)).toBeInTheDocument();
    expect(screen.getByText(/기존 프로세스 비효율/)).toBeInTheDocument();
  });

  it("renders version selector with options", () => {
    render(
      <PrdViewer
        prd={mockPrd}
        versions={[1, 2]}
        onRegenerate={vi.fn()}
      />,
    );
    const select = screen.getByLabelText("PRD 버전 선택") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("2");

    const options = select.querySelectorAll("option");
    expect(options.length).toBe(2);
    expect(options[0].textContent).toBe("v1");
    expect(options[1].textContent).toBe("v2");
  });

  it("calls onVersionChange when version is selected", () => {
    const onVersionChange = vi.fn();
    render(
      <PrdViewer
        prd={mockPrd}
        versions={[1, 2]}
        onVersionChange={onVersionChange}
        onRegenerate={vi.fn()}
      />,
    );
    const select = screen.getByLabelText("PRD 버전 선택");
    fireEvent.change(select, { target: { value: "1" } });
    expect(onVersionChange).toHaveBeenCalledWith(1);
  });

  it("calls onRegenerate when button is clicked", () => {
    const onRegenerate = vi.fn();
    render(
      <PrdViewer
        prd={mockPrd}
        versions={[1, 2]}
        onRegenerate={onRegenerate}
      />,
    );
    fireEvent.click(screen.getByText("재생성"));
    expect(onRegenerate).toHaveBeenCalledOnce();
  });

  it("has download button", () => {
    render(
      <PrdViewer
        prd={mockPrd}
        versions={[1, 2]}
        onRegenerate={vi.fn()}
      />,
    );
    expect(screen.getByText("다운로드")).toBeInTheDocument();
  });
});
