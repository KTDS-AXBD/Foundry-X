import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { Component as ValidationMeetingsPage } from "@/routes/validation-meetings";

vi.mock("../lib/api-client", () => ({
  fetchApi: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}));

import { fetchApi } from "../lib/api-client";

const mockMeetings = [
  {
    id: "m-1",
    bizItemId: "item-1",
    type: "interview",
    title: "AI 전문가 인터뷰",
    scheduledAt: "2026-04-10T10:00:00Z",
    attendees: ["user-1", "user-2"],
    location: "회의실 A",
    notes: "핵심 질문 3건 준비",
    status: "scheduled",
  },
];

describe("ValidationMeetingsPage (F295)", () => {
  beforeEach(() => {
    vi.mocked(fetchApi).mockResolvedValue({ items: [], total: 0 });
  });

  it("renders page title", async () => {
    const { findByText } = render(<ValidationMeetingsPage />);
    expect(await findByText("미팅 관리")).toBeDefined();
  });

  it("renders add button", async () => {
    const { findByText } = render(<ValidationMeetingsPage />);
    expect(await findByText("미팅 추가")).toBeDefined();
  });

  it("shows empty state when no meetings", async () => {
    const { findByText } = render(<ValidationMeetingsPage />);
    expect(await findByText("등록된 미팅이 없어요.")).toBeDefined();
  });

  it("displays meeting list", async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({ items: mockMeetings, total: 1 });
    const { findByText } = render(<ValidationMeetingsPage />);
    expect(await findByText("AI 전문가 인터뷰")).toBeDefined();
    expect(await findByText("핵심 질문 3건 준비")).toBeDefined();
  });
});
