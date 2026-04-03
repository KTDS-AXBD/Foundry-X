import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { Component as ValidationCompanyPage } from "@/routes/validation-company";

vi.mock("../lib/api-client", () => ({
  fetchApi: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}));

import { fetchApi } from "../lib/api-client";

const mockItems = [
  {
    bizItemId: "item-2",
    title: "공급망 인과 분석",
    currentStage: "REVIEW",
    validationTier: "division_approved",
    stageEnteredAt: "2026-04-01T10:00:00Z",
    createdBy: "user-1",
  },
];

describe("ValidationCompanyPage (F294)", () => {
  beforeEach(() => {
    vi.mocked(fetchApi).mockResolvedValue({ items: [], total: 0 });
  });

  it("renders page title", async () => {
    const { findByText } = render(<ValidationCompanyPage />);
    expect(await findByText("전사 검증")).toBeDefined();
  });

  it("shows guidance text", async () => {
    const { findByText } = render(<ValidationCompanyPage />);
    expect(await findByText("본부 검증이 승인된 항목만 전사 검증에 표시돼요.")).toBeDefined();
  });

  it("shows empty state when no items", async () => {
    const { findByText } = render(<ValidationCompanyPage />);
    expect(await findByText("전사 검증 대기 중인 항목이 없어요.")).toBeDefined();
  });

  it("displays division-approved items", async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({ items: mockItems, total: 1 });
    const { findByText } = render(<ValidationCompanyPage />);
    expect(await findByText("공급망 인과 분석")).toBeDefined();
  });
});
