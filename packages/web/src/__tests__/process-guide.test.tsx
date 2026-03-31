import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import ProcessGuide from "../components/feature/ax-bd/ProcessGuide";

describe("ProcessGuide", () => {
  it("renders header", () => {
    const { getByText } = render(<ProcessGuide />);
    expect(getByText("BD 프로세스 가이드")).toBeDefined();
  });

  it("renders all 11 stages in accordion", () => {
    const { getAllByText } = render(<ProcessGuide />);
    // Stages appear in both accordion and timeline, so use getAllByText
    expect(getAllByText("사업 아이템 분류").length).toBeGreaterThanOrEqual(1);
    expect(getAllByText("레퍼런스 분석").length).toBeGreaterThanOrEqual(1);
    expect(getAllByText("최종 보고서").length).toBeGreaterThanOrEqual(1);
  });

  it("renders intensity matrix with legend", () => {
    const { getByText } = render(<ProcessGuide />);
    expect(getByText("유형별 강도 매트릭스")).toBeDefined();
    expect(getByText("Type I")).toBeDefined();
    expect(getByText("Type S")).toBeDefined();
  });

  it("expands stage on click to show details", () => {
    const { getByText, queryByText } = render(<ProcessGuide />);
    expect(queryByText("Competitive Analysis")).toBeNull();
    // Click 2-0 first (unique text, only in accordion)
    fireEvent.click(getByText("사업 아이템 분류"));
    // 2-0 description should appear
    expect(queryByText(/AI Agent 3턴/)).not.toBeNull();
  });

  it("shows checkpoint on expanded stage with checkpoint", () => {
    const { container } = render(<ProcessGuide />);
    // Find the accordion button containing "2-1" badge and click it
    const buttons = container.querySelectorAll("button");
    const btn21 = Array.from(buttons).find(
      (b) => b.textContent?.includes("2-1") && b.textContent?.includes("레퍼런스"),
    );
    expect(btn21).toBeDefined();
    fireEvent.click(btn21!);
    expect(container.textContent).toContain("다르게 할 수 있는");
  });

  it("shows Commit Gate badge on 2-5", () => {
    const { getByText } = render(<ProcessGuide />);
    expect(getByText("Commit Gate")).toBeDefined();
  });

  it("shows checkpoint timeline", () => {
    const { getByText } = render(<ProcessGuide />);
    expect(getByText("사업성 판단 체크포인트 타임라인")).toBeDefined();
  });

  it("collapses stage on second click", () => {
    const { getByText, queryByText } = render(<ProcessGuide />);
    // Use unique stage "사업 아이템 분류" (2-0)
    fireEvent.click(getByText("사업 아이템 분류"));
    expect(queryByText(/AI Agent 3턴/)).not.toBeNull();
    fireEvent.click(getByText("사업 아이템 분류"));
    expect(queryByText(/AI Agent 3턴/)).toBeNull();
  });
});
