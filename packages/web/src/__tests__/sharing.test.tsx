import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ShareDialog } from "../components/feature/sharing/share-dialog";

describe("ShareDialog", () => {
  it("renders share dialog title", () => {
    const { getByRole } = render(<ShareDialog bizItemId="item-1" />);
    expect(getByRole("heading", { level: 3 })).toBeDefined();
  });

  it("renders access level buttons", () => {
    const { getByText } = render(<ShareDialog bizItemId="item-1" />);
    expect(getByText("보기")).toBeDefined();
    expect(getByText("댓글")).toBeDefined();
    expect(getByText("편집")).toBeDefined();
  });

  it("renders expiration options", () => {
    const { getByText } = render(<ShareDialog bizItemId="item-1" />);
    expect(getByText("1일")).toBeDefined();
    expect(getByText("7일")).toBeDefined();
    expect(getByText("30일")).toBeDefined();
    expect(getByText("무제한")).toBeDefined();
  });

  it("renders create button", () => {
    const { getAllByText } = render(<ShareDialog bizItemId="item-1" />);
    // Title + button both contain "공유 링크 생성"
    expect(getAllByText("공유 링크 생성").length).toBeGreaterThanOrEqual(2);
  });
});
