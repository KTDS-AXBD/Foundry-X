import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ProcessFlowV82 from "../components/feature/ProcessFlowV82";

describe("ProcessFlowV82", () => {
  it("renders 2-0 classification step", () => {
    const { getByText } = render(<ProcessFlowV82 />);
    expect(getByText("사업 아이템 분류")).toBeDefined();
    expect(getByText("Step 2-0")).toBeDefined();
  });

  it("renders all 5 discovery types", () => {
    const { getByText } = render(<ProcessFlowV82 />);
    expect(getByText("Type I")).toBeDefined();
    expect(getByText("Type M")).toBeDefined();
    expect(getByText("Type P")).toBeDefined();
    expect(getByText("Type T")).toBeDefined();
    expect(getByText("Type S")).toBeDefined();
  });

  it("renders HITL banner", () => {
    const { getByText } = render(<ProcessFlowV82 />);
    expect(getByText(/HITL/)).toBeDefined();
  });

  it("renders branch stages 2-1 through 2-7", () => {
    const { getByText } = render(<ProcessFlowV82 />);
    expect(getByText("레퍼런스 분석")).toBeDefined();
    expect(getByText("비즈니스 모델 정의")).toBeDefined();
  });

  it("renders common stages 2-8 through 2-10", () => {
    const { getByText } = render(<ProcessFlowV82 />);
    expect(getByText("패키징")).toBeDefined();
    expect(getByText("AI 멀티페르소나 평가")).toBeDefined();
    expect(getByText("최종 보고서")).toBeDefined();
  });

  it("renders Commit Gate badge on step 2-5", () => {
    const { getByText } = render(<ProcessFlowV82 />);
    expect(getByText("Commit Gate")).toBeDefined();
  });
});
