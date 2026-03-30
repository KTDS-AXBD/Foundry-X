import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import MvpTrackingPage from "../app/(app)/mvp-tracking/page";

vi.mock("../lib/api-client", () => ({
  fetchApi: vi.fn().mockResolvedValue([]),
  postApi: vi.fn().mockResolvedValue({}),
}));

import { fetchApi } from "../lib/api-client";

const mockMvps = [
  {
    id: "mvp-1",
    title: "AX 어시스턴트 MVP",
    bizItemId: "item-1",
    status: "in_dev" as const,
    assignee: "홍길동",
    deployUrl: "https://dev.example.com",
    updatedAt: "2026-03-30T00:00:00Z",
  },
  {
    id: "mvp-2",
    title: "문서 자동화 MVP",
    bizItemId: "item-2",
    status: "testing" as const,
    assignee: "김철수",
    deployUrl: "https://test.example.com",
    updatedAt: "2026-03-29T00:00:00Z",
  },
];

describe("MvpTrackingPage", () => {
  beforeEach(() => {
    vi.mocked(fetchApi).mockResolvedValue([]);
  });

  it("renders MVP tracking page", () => {
    const { getByText } = render(<MvpTrackingPage />);
    expect(getByText("MVP 추적")).toBeDefined();
    expect(getByText("MVP 개발 현황 및 배포 파이프라인 관리")).toBeDefined();
  });

  it("displays MVP list in table format", async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce(mockMvps);
    const { findByText } = render(<MvpTrackingPage />);
    expect(await findByText("AX 어시스턴트 MVP")).toBeDefined();
    expect(await findByText("문서 자동화 MVP")).toBeDefined();
  });

  it("shows status badges", async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce(mockMvps);
    const { findAllByText } = render(<MvpTrackingPage />);
    const devBadges = await findAllByText("개발중");
    expect(devBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("renders register button", () => {
    const { getByText } = render(<MvpTrackingPage />);
    expect(getByText("MVP 등록")).toBeDefined();
  });

  it("handles empty state", async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce([]);
    const { findByText } = render(<MvpTrackingPage />);
    expect(
      await findByText("등록된 MVP가 없어요. 첫 MVP를 등록해보세요."),
    ).toBeDefined();
  });
});
