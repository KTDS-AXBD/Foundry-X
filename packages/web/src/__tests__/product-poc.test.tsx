import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { Component as ProductPocPage } from "@/routes/product-poc";

vi.mock("../lib/api-client", () => ({
  fetchApi: vi.fn().mockResolvedValue([]),
  postApi: vi.fn().mockResolvedValue({}),
  patchApi: vi.fn().mockResolvedValue({}),
}));

import { fetchApi } from "../lib/api-client";

const mockPocs = [
  {
    id: "poc-1",
    title: "AI 비전 PoC",
    status: "in_progress" as const,
    framework: "PyTorch",
    updatedAt: "2026-04-01T00:00:00Z",
  },
  {
    id: "poc-2",
    title: "NLP 분석 PoC",
    status: "planning" as const,
    framework: "HuggingFace",
    updatedAt: "2026-03-30T00:00:00Z",
  },
];

describe("ProductPocPage", () => {
  beforeEach(() => {
    vi.mocked(fetchApi).mockResolvedValue([]);
  });

  it("renders PoC management page", () => {
    const { getByText } = render(<ProductPocPage />);
    expect(getByText("PoC 관리")).toBeDefined();
  });

  it("displays PoC list", async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce(mockPocs);
    const { findByText } = render(<ProductPocPage />);
    expect(await findByText("AI 비전 PoC")).toBeDefined();
    expect(await findByText("NLP 분석 PoC")).toBeDefined();
  });

  it("shows status badges", async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce(mockPocs);
    const { findAllByText } = render(<ProductPocPage />);
    const badges = await findAllByText("진행중");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("renders register button", () => {
    const { getByText } = render(<ProductPocPage />);
    expect(getByText("PoC 등록")).toBeDefined();
  });

  it("handles empty state", async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce([]);
    const { findByText } = render(<ProductPocPage />);
    expect(await findByText("등록된 PoC가 없어요")).toBeDefined();
  });
});
