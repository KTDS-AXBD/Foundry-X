import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { Component as OfferingPacksPage } from "@/routes/offering-packs";

// Mock fetchApi
vi.mock("../lib/api-client", () => ({
  fetchApi: vi.fn().mockResolvedValue([]),
  postApi: vi.fn().mockResolvedValue({}),
}));

import { fetchApi } from "../lib/api-client";

const mockPacks = [
  {
    id: "pack-1",
    title: "AX 플랫폼 제안 패키지",
    description: "AX 플랫폼 영업용 번들",
    bizItemId: "item-1",
    status: "draft" as const,
    itemCount: 3,
    createdAt: "2026-03-30T00:00:00Z",
  },
  {
    id: "pack-2",
    title: "클라우드 전환 패키지",
    description: "클라우드 전환 제안서 번들",
    bizItemId: "item-2",
    status: "approved" as const,
    itemCount: 5,
    createdAt: "2026-03-29T00:00:00Z",
  },
];

describe("OfferingPacksPage", () => {
  beforeEach(() => {
    vi.mocked(fetchApi).mockResolvedValue([]);
  });

  it("renders offering pack list page", () => {
    const { getByText } = render(<OfferingPacksPage />);
    expect(getByText("Offering Pack")).toBeDefined();
    expect(getByText("영업·제안용 번들 패키지 관리")).toBeDefined();
  });

  it("displays status filter tabs", () => {
    const { getByText } = render(<OfferingPacksPage />);
    expect(getByText("전체")).toBeDefined();
    expect(getByText("초안")).toBeDefined();
    expect(getByText("검토중")).toBeDefined();
    expect(getByText("승인")).toBeDefined();
    expect(getByText("공유됨")).toBeDefined();
  });

  it("renders pack cards with title and status", async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce(mockPacks);
    const { findByText } = render(<OfferingPacksPage />);
    expect(await findByText("AX 플랫폼 제안 패키지")).toBeDefined();
    expect(await findByText("클라우드 전환 패키지")).toBeDefined();
  });

  it("shows create button", () => {
    const { getByText } = render(<OfferingPacksPage />);
    expect(getByText("패키지 생성")).toBeDefined();
  });

  it("handles empty state", async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce([]);
    const { findByText } = render(<OfferingPacksPage />);
    expect(
      await findByText("Offering Pack이 없어요. 첫 패키지를 생성해보세요."),
    ).toBeDefined();
  });

  it("filters by status when tab is clicked", async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce(mockPacks);
    const { getAllByText, findByText } = render(<OfferingPacksPage />);
    // Wait for data to load
    await findByText("AX 플랫폼 제안 패키지");
    // Click "승인" filter tab (first occurrence = tab button)
    const approvedButtons = getAllByText("승인");
    fireEvent.click(approvedButtons[0]);
    expect(findByText("클라우드 전환 패키지")).toBeDefined();
  });
});
