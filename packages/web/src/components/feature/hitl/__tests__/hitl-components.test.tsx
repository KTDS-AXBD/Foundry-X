import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ReviewStatusBadge from "../ReviewStatusBadge";
import ReviewSummaryBar from "../ReviewSummaryBar";

describe("ReviewStatusBadge", () => {
  it("renders approved badge", () => {
    render(<ReviewStatusBadge status="approved" />);
    expect(screen.getByText("승인")).toBeDefined();
  });

  it("renders rejected badge", () => {
    render(<ReviewStatusBadge status="rejected" />);
    expect(screen.getByText("반려")).toBeDefined();
  });

  it("renders revision_requested badge", () => {
    render(<ReviewStatusBadge status="revision_requested" />);
    expect(screen.getByText("수정요청")).toBeDefined();
  });

  it("renders pending badge", () => {
    render(<ReviewStatusBadge status="pending" />);
    expect(screen.getByText("대기")).toBeDefined();
  });

  it("renders unknown status as-is", () => {
    render(<ReviewStatusBadge status="custom_status" />);
    expect(screen.getByText("custom_status")).toBeDefined();
  });
});

describe("ReviewSummaryBar", () => {
  it("renders zero state", () => {
    render(
      <ReviewSummaryBar summary={{ total: 0, approved: 0, pending: 0, rejected: 0, revisionRequested: 0 }} />,
    );
    expect(screen.getByText("리뷰 진행률")).toBeDefined();
    expect(screen.getByText("0/0 승인 (0%)")).toBeDefined();
  });

  it("renders correct percentage", () => {
    render(
      <ReviewSummaryBar summary={{ total: 4, approved: 3, pending: 0, rejected: 1, revisionRequested: 0 }} />,
    );
    expect(screen.getByText("3/4 승인 (75%)")).toBeDefined();
  });

  it("renders count labels", () => {
    render(
      <ReviewSummaryBar summary={{ total: 5, approved: 2, pending: 1, rejected: 1, revisionRequested: 1 }} />,
    );
    expect(screen.getByText("승인 2")).toBeDefined();
    expect(screen.getByText("수정요청 1")).toBeDefined();
    expect(screen.getByText("반려 1")).toBeDefined();
    expect(screen.getByText("대기 1")).toBeDefined();
  });
});
