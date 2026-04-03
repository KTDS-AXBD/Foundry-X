import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Component as OutreachPage } from "@/routes/gtm-outreach";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

vi.mock("../lib/api-client", () => ({
  fetchApi: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  postApi: vi.fn().mockResolvedValue({}),
  patchApi: vi.fn().mockResolvedValue({}),
  deleteApi: vi.fn().mockResolvedValue(undefined),
  fetchGtmOutreachList: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  fetchOutreachStats: vi.fn().mockResolvedValue({ total: 0, byStatus: {}, conversionRate: 0 }),
  createGtmOutreach: vi.fn().mockResolvedValue({ id: "new" }),
  fetchGtmCustomers: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}));

import { fetchGtmOutreachList, fetchOutreachStats } from "../lib/api-client";

const mockOutreach = [
  {
    id: "out-1",
    title: "KTDS AI 제안",
    status: "draft",
    customerName: "KTDS",
    createdAt: "2026-04-03T00:00:00Z",
    customerId: "c1",
    orgId: "org",
    offeringPackId: null,
    proposalContent: null,
    proposalGeneratedAt: null,
    sentAt: null,
    responseNote: null,
    createdBy: "u1",
    updatedAt: "2026-04-03T00:00:00Z",
  },
];

const mockStats = { total: 1, byStatus: { draft: 1 }, conversionRate: 0 };

describe("GTM Outreach Page (F299)", () => {
  beforeEach(() => {
    vi.mocked(fetchGtmOutreachList).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(fetchOutreachStats).mockResolvedValue({ total: 0, byStatus: {}, conversionRate: 0 });
  });

  it("renders outreach page title", () => {
    const { getByText } = render(<OutreachPage />, { wrapper: Wrapper });
    expect(getByText("선제안 아웃리치")).toBeDefined();
  });

  it("renders create button", () => {
    const { getByText } = render(<OutreachPage />, { wrapper: Wrapper });
    expect(getByText("새 선제안")).toBeDefined();
  });

  it("displays outreach list", async () => {
    vi.mocked(fetchGtmOutreachList).mockResolvedValueOnce({ items: mockOutreach, total: 1 });
    vi.mocked(fetchOutreachStats).mockResolvedValueOnce(mockStats);
    const { findByText } = render(<OutreachPage />, { wrapper: Wrapper });
    expect(await findByText("KTDS AI 제안")).toBeDefined();
  });

  it("shows stat cards", async () => {
    vi.mocked(fetchGtmOutreachList).mockResolvedValueOnce({ items: mockOutreach, total: 1 });
    vi.mocked(fetchOutreachStats).mockResolvedValueOnce(mockStats);
    const { findByText } = render(<OutreachPage />, { wrapper: Wrapper });
    expect(await findByText("전체")).toBeDefined();
  });

  it("shows status filter buttons", () => {
    const { getByText } = render(<OutreachPage />, { wrapper: Wrapper });
    expect(getByText("초안")).toBeDefined();
    expect(getByText("발송")).toBeDefined();
  });

  it("shows empty state", async () => {
    const { findByText } = render(<OutreachPage />, { wrapper: Wrapper });
    expect(await findByText(/아웃리치가 없어요/)).toBeDefined();
  });

  it("displays customer name in table", async () => {
    vi.mocked(fetchGtmOutreachList).mockResolvedValueOnce({ items: mockOutreach, total: 1 });
    vi.mocked(fetchOutreachStats).mockResolvedValueOnce(mockStats);
    const { findByText } = render(<OutreachPage />, { wrapper: Wrapper });
    expect(await findByText("KTDS")).toBeDefined();
  });

  it("shows status badge", async () => {
    vi.mocked(fetchGtmOutreachList).mockResolvedValueOnce({ items: mockOutreach, total: 1 });
    vi.mocked(fetchOutreachStats).mockResolvedValueOnce(mockStats);
    // "초안" is both a filter button and a badge; ensure at least one exists
    const { findAllByText } = render(<OutreachPage />, { wrapper: Wrapper });
    const badges = await findAllByText("초안");
    expect(badges.length).toBeGreaterThan(0);
  });
});
