import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import IrProposalsPage from "../app/(app)/ir-proposals/page";
import { IrProposalForm } from "../components/feature/ir-proposals/ir-proposal-form";

vi.mock("../lib/api-client", () => ({
  fetchApi: vi.fn().mockResolvedValue([]),
  postApi: vi.fn().mockResolvedValue({}),
}));

import { fetchApi } from "../lib/api-client";

const mockProposals = [
  {
    id: "ir-1",
    title: "현장 AI 도입 제안",
    category: "technology",
    status: "pending" as const,
    submittedBy: "홍길동",
    createdAt: "2026-03-30T00:00:00Z",
  },
  {
    id: "ir-2",
    title: "업무 자동화 비용 절감 방안",
    category: "cost_reduction",
    status: "approved" as const,
    submittedBy: "김철수",
    createdAt: "2026-03-29T00:00:00Z",
  },
];

describe("IrProposalsPage", () => {
  beforeEach(() => {
    vi.mocked(fetchApi).mockResolvedValue([]);
  });

  it("renders IR proposals page", () => {
    const { getByText } = render(<IrProposalsPage />);
    expect(getByText("IR 제안")).toBeDefined();
    expect(getByText("사내 현장 IR Bottom-up 제안 채널")).toBeDefined();
  });

  it("displays proposal cards", async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce(mockProposals);
    const { findByText } = render(<IrProposalsPage />);
    expect(await findByText("현장 AI 도입 제안")).toBeDefined();
    expect(await findByText("업무 자동화 비용 절감 방안")).toBeDefined();
  });

  it("shows submit form on button click", () => {
    const { getByText } = render(<IrProposalsPage />);
    const submitBtn = getByText("제안 제출");
    fireEvent.click(submitBtn);
    expect(getByText("IR 제안 작성")).toBeDefined();
  });

  it("renders category filter", () => {
    const { getByText } = render(<IrProposalsPage />);
    expect(getByText("카테고리")).toBeDefined();
    expect(getByText("신규 사업")).toBeDefined();
    expect(getByText("기술")).toBeDefined();
    expect(getByText("비용 절감")).toBeDefined();
  });

  it("handles empty state", async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce([]);
    const { findByText } = render(<IrProposalsPage />);
    expect(
      await findByText("제안이 없어요. 첫 IR 제안을 제출해보세요."),
    ).toBeDefined();
  });
});

describe("IrProposalForm", () => {
  it("renders all required fields", () => {
    const { getByPlaceholderText } = render(<IrProposalForm />);
    expect(getByPlaceholderText("제안 제목을 입력해주세요")).toBeDefined();
    expect(getByPlaceholderText("제안 내용을 자세히 설명해주세요")).toBeDefined();
    expect(getByPlaceholderText("제안의 근거나 배경을 작성해주세요")).toBeDefined();
    expect(getByPlaceholderText("예상되는 효과나 성과를 작성해주세요")).toBeDefined();
  });

  it("renders category dropdown", () => {
    const { getByText } = render(<IrProposalForm />);
    expect(getByText("카테고리 선택")).toBeDefined();
  });

  it("renders submit button", () => {
    const { getByText } = render(<IrProposalForm />);
    expect(getByText("제안 제출")).toBeDefined();
  });

  it("shows validation errors for empty required fields", () => {
    const { getByText } = render(<IrProposalForm />);
    fireEvent.click(getByText("제안 제출"));
    expect(getByText("제목을 입력해주세요")).toBeDefined();
  });

  it("shows description minimum length error", () => {
    const { getByText, getByPlaceholderText } = render(<IrProposalForm />);
    fireEvent.change(getByPlaceholderText("제안 제목을 입력해주세요"), {
      target: { value: "테스트 제목" },
    });
    fireEvent.change(getByPlaceholderText("제안 내용을 자세히 설명해주세요"), {
      target: { value: "짧음" },
    });
    fireEvent.click(getByText("제안 제출"));
    expect(getByText("설명은 최소 10자 이상이어야 해요")).toBeDefined();
  });
});
