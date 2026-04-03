import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { Component as ValidationDivisionPage } from "@/routes/validation-division";

vi.mock("../lib/api-client", () => ({
  fetchApi: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}));

import { fetchApi } from "../lib/api-client";

const mockItems = [
  {
    bizItemId: "item-1",
    title: "AI 품질 예측",
    currentStage: "REVIEW",
    validationTier: "none",
    stageEnteredAt: "2026-04-01T09:00:00Z",
    createdBy: "user-1",
  },
];

describe("ValidationDivisionPage (F294)", () => {
  beforeEach(() => {
    vi.mocked(fetchApi).mockResolvedValue({ items: [], total: 0 });
  });

  it("renders page title", async () => {
    const { findByText } = render(<ValidationDivisionPage />);
    expect(await findByText("본부 검증")).toBeDefined();
  });

  it("shows empty state when no items", async () => {
    const { findByText } = render(<ValidationDivisionPage />);
    expect(await findByText("검증 대기 중인 항목이 없어요.")).toBeDefined();
  });

  it("displays items with approve/reject buttons", async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({ items: mockItems, total: 1 });
    const { findByText } = render(<ValidationDivisionPage />);
    expect(await findByText("AI 품질 예측")).toBeDefined();
    expect(await findByText("승인")).toBeDefined();
    expect(await findByText("반려")).toBeDefined();
  });
});
