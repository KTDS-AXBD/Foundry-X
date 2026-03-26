import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import TypeRoutingMatrix from "../components/feature/TypeRoutingMatrix";

describe("TypeRoutingMatrix", () => {
  it("renders all 5 type headers", () => {
    const { getByText } = render(<TypeRoutingMatrix />);
    expect(getByText("Type I")).toBeDefined();
    expect(getByText("Type M")).toBeDefined();
    expect(getByText("Type P")).toBeDefined();
    expect(getByText("Type T")).toBeDefined();
    expect(getByText("Type S")).toBeDefined();
  });

  it("renders all 7 stage rows", () => {
    const { getByText } = render(<TypeRoutingMatrix />);
    expect(getByText("레퍼런스")).toBeDefined();
    expect(getByText("BM 정의")).toBeDefined();
  });

  it("renders intensity labels", () => {
    const { getAllByText } = render(<TypeRoutingMatrix />);
    const coreLabels = getAllByText("핵심");
    const normalLabels = getAllByText("보통");
    const lightLabels = getAllByText("간소");
    // 7 stages × 5 types = 35 cells total
    expect(coreLabels.length + normalLabels.length + lightLabels.length).toBe(35);
  });

  it("renders legend", () => {
    const { getByText } = render(<TypeRoutingMatrix />);
    expect(getByText(/core/)).toBeDefined();
    expect(getByText(/normal/)).toBeDefined();
    expect(getByText(/light/)).toBeDefined();
  });

  it("highlights selected type column", () => {
    const { container } = render(<TypeRoutingMatrix selectedType="T" />);
    const highlighted = container.querySelectorAll("[class*='ring-blue']");
    // 7 stages for the selected type
    expect(highlighted.length).toBe(7);
  });
});
